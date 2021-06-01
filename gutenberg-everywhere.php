<?php
/*
Plugin Name: Gutenberg Everywhere
Description: Because somewhere is just not enough. Add Gutenberg to WordPress comments, bbPress forums, and BuddyPress streams. Also enables Gutenberg for comment & bbPress moderation.
Version: 1.1.0
Author: Automattic
Text Domain: 'gutenberg-everywhere'
*/

require_once __DIR__ . '/classes/gutenberg-handler.php';
require_once __DIR__ . '/classes/comments.php';
require_once __DIR__ . '/classes/bbpress.php';
require_once __DIR__ . '/classes/buddypress.php';

class Gutenberg_Everywhere {
	/**
	 * Instance variable
	 * @var Gutenberg_Everywhere|Null
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
	 * @return Gutenberg_Everywhere
	 */
	public static function init() {
		if ( is_null( Gutenberg_Everywhere::$instance ) ) {
			Gutenberg_Everywhere::$instance = new Gutenberg_Everywhere();
		}

		return Gutenberg_Everywhere::$instance;
	}

	/**
	 * Constructor
	 */
	public function __construct() {
		$this->handlers[] = new Gutenberg_Comments();
		$this->handlers[] = new Gutenberg_bbPress();
		$this->handlers[] = new Gutenberg_BuddyPress();

		// Admin editors
		add_action( 'admin_enqueue_scripts', [ $this, 'admin_enqueue_scripts' ] );
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
				add_action( 'admin_head', function() use ( $handler ) {
					add_filter( 'the_editor', [ $handler, 'the_editor' ] );
					add_filter( 'wp_editor_settings', [ $handler, 'wp_editor_settings' ], 10, 2 );
				} );

				// Stops a problem with the Gutenberg plugin accessing widgets that don't exist
				remove_action( 'admin_footer', 'gutenberg_block_editor_admin_footer' );

				// Load Gutenberg in in_admin_header so WP admin doesn't set the 'block-editor-page' body class
				add_action( 'in_admin_header', function() use ( $handler ) {
					$handler->load_editor( '.wp-editor-area' );
				} );

				break;
			}
		}
	}
}

Gutenberg_Everywhere::init();
