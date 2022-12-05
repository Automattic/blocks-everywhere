<?php
/*
Plugin Name: Blocks Everywhere
Description: Because somewhere is just not enough. Add Gutenberg to WordPress comments, bbPress forums, and BuddyPress streams. Also enables Gutenberg for comment & bbPress moderation.
Version: 1.10.0
Author: Automattic
Text Domain: 'blocks-everywhere'
*/

namespace Automattic\Blocks_Everywhere;

use Automattic\Blocks_Everywhere\Handler;

require_once __DIR__ . '/classes/class-handler.php';
require_once __DIR__ . '/classes/class-editor.php';

class Blocks_Everywhere {
	/**
	 * Instance variable
	 * @var Blocks_Everywhere|null
	 */
	private static $instance = null;

	/**
	 * Gutenberg editor
	 *
	 * @var IsoEditor_Gutenberg|null
	 */
	private $gutenberg = null;

	/**
	 * Gutenberg handlers
	 *
	 * @var Gutenberg_Handler[]
	 */
	private $handlers = [];

	/**
	 * Singleton access
	 *
	 * @return Blocks_Everywhere
	 */
	public static function init() {
		if ( is_null( self::$instance ) ) {
			self::$instance = new Blocks_Everywhere();
		}

		return self::$instance;
	}

	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'init', [ $this, 'load_handlers' ] );

		// Admin editors
		add_action( 'admin_enqueue_scripts', [ $this, 'admin_enqueue_scripts' ] );
	}

	/**
	 * Load whatever handler is configured
	 *
	 * @return void
	 */
	public function load_handlers() {
		$default_comments = defined( 'BLOCKS_EVERYWHERE_COMMENTS' ) ? BLOCKS_EVERYWHERE_COMMENTS : false;
		$default_bbpress = defined( 'BLOCKS_EVERYWHERE_BBPRESS' ) ? BLOCKS_EVERYWHERE_BBPRESS : false;
		$default_buddypress = defined( 'BLOCKS_EVERYWHERE_BUDDYPRESS' ) ? BLOCKS_EVERYWHERE_BUDDYPRESS : false;

		if ( apply_filters( 'blocks_everywhere_comments', $default_comments ) ) {
			$this->handlers[] = new Handler\Comments();
		}

		if ( apply_filters( 'blocks_everywhere_bbpress', $default_bbpress ) ) {
			$this->handlers[] = new Handler\bbPress();
		}

		if ( apply_filters( 'blocks_everywhere_buddypress', $default_buddypress ) ) {
			$this->handlers[] = new Handler\BuddyPress();
		}
	}

	/**
	 * Perform additional admin tasks when on the comment page
	 *
	 * @param String $hook Page hook.
	 * @return void
	 */
	public function admin_enqueue_scripts( $hook ) {
		foreach ( $this->handlers as $handler ) {
			if ( $handler->can_show_admin_editor( $hook ) ) {
				add_action(
					'admin_head',
					function() use ( $handler ) {
						add_filter( 'the_editor', [ $handler, 'the_editor' ] );
						add_filter( 'wp_editor_settings', [ $handler, 'wp_editor_settings' ], 10, 2 );
					}
				);

				// Stops a problem with the Gutenberg plugin accessing widgets that don't exist
				remove_action( 'admin_footer', 'gutenberg_block_editor_admin_footer' );

				// Load Gutenberg in in_admin_header so WP admin doesn't set the 'block-editor-page' body class
				add_action(
					'in_admin_header',
					function() use ( $handler ) {
						$handler->load_editor( '.wp-editor-area' );
					}
				);

				break;
			}
		}
	}
}

Blocks_Everywhere::init();
