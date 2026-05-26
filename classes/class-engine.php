<?php
/**
 * Engine — Data-driven context manager for Blocks Everywhere.
 *
 * Replaces the per-handler subclass pattern with a single class that
 * processes context configuration arrays identically. External plugins
 * register contexts via the `blocks_everywhere_contexts` filter.
 *
 * Context config shape (only 'type' and 'textarea' are required):
 *
 *     [
 *         'type'         => 'compose',                     // Editor type identifier
 *         'textarea'     => '#my-textarea',                 // CSS selector for textarea
 *         'container'    => '.blocks-everywhere',           // CSS selector for editor container
 *         'trigger'      => 'wp',                           // Action hook that triggers editor load
 *         'condition'    => fn() => is_user_logged_in(),    // Callable, return true to load
 *         'editor_setup' => fn($engine) => ...,             // Callable, runs after editor loads
 *         'admin_hook'   => 'comment.php',                  // Admin page hook (string) or callable($hook)
 *     ]
 *
 * @package Automattic\Blocks_Everywhere
 * @since   2.0.0
 */

namespace Automattic\Blocks_Everywhere;

use Automattic\Blocks_Everywhere\Handler\Handler;

class Engine extends Handler {

	/**
	 * Registered contexts keyed by ID.
	 *
	 * @var array<string, array>
	 */
	private $contexts = [];

	/**
	 * Active context ID (set when an editor is loading).
	 *
	 * @var string|null
	 */
	private $active_context = null;

	/**
	 * Constructor — call parent to register shared assets.
	 */
	public function __construct() {
		parent::__construct();
	}

	/**
	 * Boot — called on `init`. Collects contexts from the filter,
	 * wires trigger hooks, and sets up admin editors.
	 */
	public function boot() {
		$contexts = apply_filters( 'blocks_everywhere_contexts', [] );

		foreach ( $contexts as $id => $config ) {
			$this->contexts[ $id ] = $config;
		}

		foreach ( $this->contexts as $id => $config ) {
			$trigger = $config['trigger'] ?? null;
			if ( ! $trigger ) {
				continue;
			}

			$priority = $config['trigger_priority'] ?? 10;

			// View assets load one priority earlier than the editor.
			add_action(
				$trigger,
				function () {
					$this->load_view_assets();
				},
				$priority - 1
			);

			// Editor trigger.
			add_action(
				$trigger,
				function () use ( $id ) {
					$this->load_editor_for_context( $id );
				},
				$priority
			);
		}

		add_action( 'admin_enqueue_scripts', [ $this, 'admin_enqueue_scripts' ] );
	}

	/**
	 * Load the editor for a specific context.
	 *
	 * Checks condition, loads the editor, then calls editor_setup so
	 * the context can wire its own KSES, save filters, body class, etc.
	 *
	 * @param string $id Context identifier.
	 */
	public function load_editor_for_context( string $id ) {
		if ( ! isset( $this->contexts[ $id ] ) ) {
			return;
		}

		$config = $this->contexts[ $id ];

		// Check condition.
		$condition = $config['condition'] ?? null;
		if ( is_callable( $condition ) && ! call_user_func( $condition ) ) {
			return;
		}

		$this->active_context = $id;

		$textarea  = $config['textarea'] ?? '';
		$container = $config['container'] ?? '.blocks-everywhere';

		// Wrap textarea + disable TinyMCE (default behavior, contexts can override).
		add_filter( 'the_editor', [ $this, 'the_editor' ] );
		add_filter( 'wp_editor_settings', [ $this, 'wp_editor_settings' ], 10, 2 );

		$this->load_editor( $textarea, $container );

		// Let the context do its own setup.
		$editor_setup = $config['editor_setup'] ?? null;
		if ( is_callable( $editor_setup ) ) {
			call_user_func( $editor_setup, $this );
		}
	}

	/**
	 * Get the editor type for the currently active context.
	 *
	 * @return string
	 */
	public function get_editor_type() {
		if ( $this->active_context && isset( $this->contexts[ $this->active_context ] ) ) {
			return $this->contexts[ $this->active_context ]['type'] ?? 'core';
		}

		return 'core';
	}

	/**
	 * Admin editor support — check contexts for admin_hook matches.
	 *
	 * @param string $hook Admin page hook.
	 */
	public function admin_enqueue_scripts( $hook ) {
		foreach ( $this->contexts as $id => $config ) {
			$admin_hook = $config['admin_hook'] ?? null;
			if ( ! $admin_hook ) {
				continue;
			}

			$can_show = is_callable( $admin_hook )
				? call_user_func( $admin_hook, $hook )
				: ( $hook === $admin_hook );

			if ( ! $can_show ) {
				continue;
			}

			$this->active_context = $id;
			$admin_textarea = $config['admin_textarea'] ?? '.wp-editor-area';

			add_action(
				'admin_head',
				function () {
					add_filter( 'the_editor', [ $this, 'the_editor' ] );
					add_filter( 'wp_editor_settings', [ $this, 'wp_editor_settings' ], 10, 2 );
				}
			);

			remove_action( 'admin_footer', 'gutenberg_block_editor_admin_footer' );

			add_action(
				'in_admin_header',
				function () use ( $admin_textarea ) {
					$this->load_editor( $admin_textarea );
				}
			);

			break;
		}
	}

	/**
	 * Body class callback — adds editor indicator classes.
	 *
	 * Contexts call this from their editor_setup via:
	 *     add_filter( 'body_class', [ $engine, 'body_class' ] );
	 *
	 * @param string[] $classes Body classes.
	 * @return string[]
	 */
	public function body_class( $classes ) {
		$classes[] = 'gutenberg-support';

		if ( ! empty( $this->settings['editor']['hasUploadPermissions'] ) ) {
			$classes[] = 'gutenberg-support-upload';
		}

		return $classes;
	}

	/**
	 * Empty block content check — returns empty string if block content
	 * is visually empty so the host system can detect missing content.
	 *
	 * Contexts hook this to save filters from their editor_setup.
	 *
	 * @param string $content Content.
	 * @return string
	 */
	public function no_empty_block_content( $content ) {
		$stripped = do_blocks( $content );
		$stripped = wp_strip_all_tags( $stripped );
		$stripped = trim( $stripped );

		return empty( $stripped ) ? '' : $content;
	}

	/**
	 * Get a registered context config by ID.
	 *
	 * @param string $id Context identifier.
	 * @return array|null
	 */
	public function get_context( string $id ) {
		return $this->contexts[ $id ] ?? null;
	}

	/**
	 * Get all registered context IDs.
	 *
	 * @return string[]
	 */
	public function get_context_ids() {
		return array_keys( $this->contexts );
	}
}
