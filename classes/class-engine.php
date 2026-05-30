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
 *         'container'             => '.blocks-everywhere', // CSS selector for editor container
 *         'trigger'               => 'wp',                 // Action hook that triggers editor load
 *         'condition'             => fn() => is_user_logged_in(),
 *         'settings_provider'     => fn($settings, $engine) => $settings,
 *         'mode'                  => 'compact',              // Generic editor mode or ordered mode list.
 *         'modes'                 => [                       // Mode names to client-side settings patches.
 *             'compact' => [ 'chrome' => [ 'mode' => 'compact' ] ],
 *         ],
 *         'settings_transforms'   => [ ... ],                 // Ordered static client-side settings patches.
 *         'entity_bridge'         => [ 'entity' => [ 'type' => 'draft', 'id' => 42 ] ], // Static host entity facts.
 *         'preload_paths'         => fn($paths, $post, $engine) => $paths,
 *         'block_categories'      => fn($categories, $context, $engine) => $categories,
 *         'server_block_settings' => fn($settings, $context, $engine) => $settings,
 *         'body_classes'          => fn($classes, $engine) => $classes,
 *         'editor_assets'         => fn($engine) => ...,    // Runs before editor loads
 *         'after_load'            => fn($engine) => ...,    // Runs after editor loads
 *         'editor_setup'          => fn($engine) => ...,    // Legacy alias for after_load
 *         'admin_hook'            => 'comment.php',         // Admin page hook or callable($hook)
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
	 * Contexts whose server bootstrap callbacks have already been wired.
	 *
	 * @var array<string, bool>
	 */
	private $bootstrapped_contexts = [];

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
		$this->bootstrap_context( $id, $config );

		$textarea  = $config['textarea'] ?? '';
		$container = $config['container'] ?? '.blocks-everywhere';

		// Wrap textarea + disable TinyMCE (default behavior, contexts can override).
		add_filter( 'the_editor', [ $this, 'the_editor' ] );
		add_filter( 'wp_editor_settings', [ $this, 'wp_editor_settings' ], 10, 2 );

		$editor_assets = $config['editor_assets'] ?? null;
		if ( is_callable( $editor_assets ) ) {
			call_user_func( $editor_assets, $this, $id, $config );
		}

		$this->load_editor( $textarea, $container );

		// Let the context do its own setup.
		$after_load = $config['after_load'] ?? null;
		if ( is_callable( $after_load ) ) {
			call_user_func( $after_load, $this, $id, $config );
		}

		// Back-compat for existing context registrations.
		$editor_setup = $config['editor_setup'] ?? null;
		if ( is_callable( $editor_setup ) ) {
			call_user_func( $editor_setup, $this, $id, $config );
		}
	}

	/**
	 * Wire generic server-side bootstrap callbacks for a context.
	 *
	 * @param string $id Context identifier.
	 * @param array  $config Context configuration.
	 * @return void
	 */
	private function bootstrap_context( string $id, array $config ) {
		if ( isset( $this->bootstrapped_contexts[ $id ] ) ) {
			return;
		}

		$this->bootstrapped_contexts[ $id ] = true;

		add_filter(
			'blocks_everywhere_editor_settings',
			function ( $settings ) use ( $id, $config ) {
				return $this->apply_context_settings( $settings, $id, $config );
			}
		);

		add_filter(
			'block_editor_preload_paths',
			function ( $paths, $post = null ) use ( $id, $config ) {
				if ( $this->active_context !== $id ) {
					return $paths;
				}

				$preload_paths = $config['preload_paths'] ?? null;
				if ( is_callable( $preload_paths ) ) {
					$paths = call_user_func( $preload_paths, $paths, $post, $this, $id, $config );
				}

				return is_array( $paths ) ? $paths : [];
			},
			10,
			2
		);

		add_filter(
			'block_categories_all',
			function ( $categories, $block_editor_context = null ) use ( $id, $config ) {
				if ( $this->active_context !== $id ) {
					return $categories;
				}

				$block_categories = $config['block_categories'] ?? null;
				if ( is_callable( $block_categories ) ) {
					$categories = call_user_func( $block_categories, $categories, $block_editor_context, $this, $id, $config );
				}

				return is_array( $categories ) ? $categories : [];
			},
			10,
			2
		);

		add_filter(
			'blocks_everywhere_server_block_settings',
			function ( $settings, $block_editor_context = null ) use ( $id, $config ) {
				if ( $this->active_context !== $id ) {
					return $settings;
				}

				$server_block_settings = $config['server_block_settings'] ?? null;
				if ( is_callable( $server_block_settings ) ) {
					$settings = call_user_func( $server_block_settings, $settings, $block_editor_context, $this, $id, $config );
				}

				return is_array( $settings ) ? $settings : [];
			},
			10,
			2
		);

		if ( array_key_exists( 'body_classes', $config ) ) {
			add_filter(
				'body_class',
				function ( $classes ) use ( $id, $config ) {
					if ( $this->active_context !== $id ) {
						return $classes;
					}

					$classes = $this->body_class( (array) $classes );

					$body_classes = $config['body_classes'];
					if ( is_callable( $body_classes ) ) {
						$classes = call_user_func( $body_classes, $classes, $this, $id, $config );
					} elseif ( is_array( $body_classes ) ) {
						$classes = array_merge( $classes, $body_classes );
					}

					return array_values( array_unique( (array) $classes ) );
				}
			);
		}
	}

	/**
	 * Apply active context settings providers and convenience config values.
	 *
	 * @param array  $settings Editor settings.
	 * @param string $id Context identifier.
	 * @param array  $config Context configuration.
	 * @return array
	 */
	private function apply_context_settings( array $settings, string $id, array $config ) {
		if ( $this->active_context !== $id ) {
			return $settings;
		}

		$settings_provider = $config['settings_provider'] ?? null;
		if ( is_callable( $settings_provider ) ) {
			$provided = call_user_func( $settings_provider, $settings, $this, $id, $config );
			if ( is_array( $provided ) ) {
				$settings = $provided;
			}
		}

		$mode = $this->resolve_context_value( $config['mode'] ?? null, $settings, $id, $config );
		if ( is_string( $mode ) || is_array( $mode ) ) {
			$settings['blocksEverywhere']['mode'] = $mode;
		}

		$modes = $this->resolve_context_value( $config['modes'] ?? null, $settings, $id, $config );
		if ( is_array( $modes ) ) {
			$settings['blocksEverywhere']['modes'] = array_merge( $settings['blocksEverywhere']['modes'] ?? [], $modes );
		}

		$settings_transforms = $this->resolve_context_value( $config['settings_transforms'] ?? null, $settings, $id, $config );
		if ( is_array( $settings_transforms ) ) {
			$settings['blocksEverywhere']['settingsTransforms'] = array_merge(
				$settings['blocksEverywhere']['settingsTransforms'] ?? [],
				array_values( $settings_transforms )
			);
		}

		$allowed_blocks = $this->resolve_context_value( $config['allowed_blocks'] ?? null, $settings, $id, $config );
		if ( is_array( $allowed_blocks ) ) {
			$settings['blocksEverywhere']['blocks']['allowBlocks'] = array_values( array_unique( $allowed_blocks ) );
		}

		$disallowed_blocks = $this->resolve_context_value( $config['disallowed_blocks'] ?? null, $settings, $id, $config );
		if ( is_array( $disallowed_blocks ) ) {
			$settings['blocksEverywhere']['blocks']['disallowBlocks'] = array_values( array_unique( $disallowed_blocks ) );

			if ( isset( $settings['blocksEverywhere']['blocks']['allowBlocks'] ) ) {
				$settings['blocksEverywhere']['blocks']['allowBlocks'] = array_values(
					array_diff( $settings['blocksEverywhere']['blocks']['allowBlocks'], $settings['blocksEverywhere']['blocks']['disallowBlocks'] )
				);
			}
		}

		$features = $this->resolve_context_value( $config['features'] ?? null, $settings, $id, $config );
		if ( is_array( $features ) ) {
			$settings['blocksEverywhere']['features'] = array_merge( $settings['blocksEverywhere']['features'] ?? [], $features );
		}

		$entity_bridge = $this->resolve_context_value( $config['entity_bridge'] ?? null, $settings, $id, $config );
		if ( is_array( $entity_bridge ) ) {
			$settings['blocksEverywhere']['entityBridge'] = array_merge(
				$settings['blocksEverywhere']['entityBridge'] ?? [],
				$this->normalize_entity_bridge( $entity_bridge )
			);
		}

		return $settings;
	}

	/**
	 * Normalize entity bridge config to the canonical nested entity shape.
	 *
	 * @param array $entity_bridge Entity bridge config.
	 * @return array Normalized entity bridge config.
	 */
	private function normalize_entity_bridge( $entity_bridge ) {
		$entity = isset( $entity_bridge['entity'] ) && is_array( $entity_bridge['entity'] )
			? $entity_bridge['entity']
			: [];
		$reserved_keys = [ 'entity', 'load', 'getEdits', 'saveEdits', 'reset' ];

		foreach ( $entity_bridge as $key => $value ) {
			if ( in_array( $key, $reserved_keys, true ) ) {
				continue;
			}

			$entity[ $key ] = $value;
		}

		$entity_bridge['entity'] = $entity;

		return $entity_bridge;
	}

	/**
	 * Resolve a context config value that may be static or callable.
	 *
	 * @param mixed  $value Config value.
	 * @param array  $settings Current settings.
	 * @param string $id Context identifier.
	 * @param array  $config Context configuration.
	 * @return mixed
	 */
	private function resolve_context_value( $value, array $settings, string $id, array $config ) {
		if ( is_callable( $value ) ) {
			return call_user_func( $value, $settings, $this, $id, $config );
		}

		return $value;
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
			$this->bootstrap_context( $id, $config );
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
				function () use ( $admin_textarea, $id, $config ) {
					$editor_assets = $config['editor_assets'] ?? null;
					if ( is_callable( $editor_assets ) ) {
						call_user_func( $editor_assets, $this, $id, $config );
					}

					$this->load_editor( $admin_textarea );

					$after_load = $config['after_load'] ?? null;
					if ( is_callable( $after_load ) ) {
						call_user_func( $after_load, $this, $id, $config );
					}

					$editor_setup = $config['editor_setup'] ?? null;
					if ( is_callable( $editor_setup ) ) {
						call_user_func( $editor_setup, $this, $id, $config );
					}
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
