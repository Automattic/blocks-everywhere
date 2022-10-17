<?php
/*
Plugin Name: Gutenberg Everywhere
Description: Because somewhere is just not enough. Add Gutenberg to WordPress comments, bbPress forums, and BuddyPress streams. Also enables Gutenberg for comment & bbPress moderation.
Version: 1.4.2
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
	 * @var Gutenberg_Everywhere|null
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
		if ( is_null( self::$instance ) ) {
			self::$instance = new Gutenberg_Everywhere();
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

	public function load_handlers() {
		$default_comments = defined( 'GUTENBERG_EVERYWHERE_COMMENTS' ) ? GUTENBERG_EVERYWHERE_COMMENTS : false;
		$default_bbpress = defined( 'GUTENBERG_EVERYWHERE_BBPRESS' ) ? GUTENBERG_EVERYWHERE_BBPRESS : false;
		$default_buddypress = defined( 'GUTENBERG_EVERYWHERE_BUDDYPRESS' ) ? GUTENBERG_EVERYWHERE_BUDDYPRESS : false;

		if ( apply_filters( 'gutenberg_everywhere_comments', $default_comments ) ) {
			$this->handlers[] = new Gutenberg_Comments();
		}

		if ( apply_filters( 'gutenberg_everywhere_bbpress', $default_bbpress ) ) {
			$this->handlers[] = new Gutenberg_bbPress();
		}

		if ( apply_filters( 'gutenberg_everywhere_buddypress', $default_buddypress ) ) {
			$this->handlers[] = new Gutenberg_BuddyPress();
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

Gutenberg_Everywhere::init();
