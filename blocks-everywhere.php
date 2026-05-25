<?php
/*
Plugin Name: Blocks Everywhere
Description: Use the Gutenberg block editor anywhere in WordPress. Register a context with a config array and get the full block editing experience on any page.
Version: 3.0.1
Author: Automattic
Text Domain: 'blocks-everywhere'
*/

namespace Automattic\Blocks_Everywhere;

require_once __DIR__ . '/classes/class-handler.php';
require_once __DIR__ . '/classes/class-editor.php';
require_once __DIR__ . '/classes/class-engine.php';
require_once __DIR__ . '/classes/contexts/bbpress-callbacks.php';
require_once __DIR__ . '/classes/contexts/bbpress.php';
require_once __DIR__ . '/classes/contexts/buddypress.php';
require_once __DIR__ . '/classes/contexts/comments.php';

class Blocks_Everywhere {
	const VERSION = '3.0.1';

	/**
	 * Instance variable
	 *
	 * @var Blocks_Everywhere|null
	 */
	private static $instance = null;

	/**
	 * The context engine.
	 *
	 * @var Engine|null
	 */
	private $engine = null;

	/**
	 * Singleton access.
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
	 * Constructor.
	 */
	public function __construct() {
		$this->engine = new Engine();

		// Register built-in contexts at priority 5 so third-party can modify at 10.
		add_filter( 'blocks_everywhere_contexts', [ $this, 'register_builtin_contexts' ], 5 );

		add_action( 'init', [ $this, 'boot' ] );
	}

	/**
	 * Register the built-in contexts (bbPress, BuddyPress, Comments).
	 *
	 * Uses the same filter mechanism as external consumers.
	 *
	 * @param array $contexts Existing contexts.
	 * @return array
	 */
	public function register_builtin_contexts( $contexts ) {
		$bbpress = Contexts\bbpress_context( $this->engine );
		if ( $bbpress ) {
			$contexts['bbpress'] = $bbpress;
		}

		$buddypress = Contexts\buddypress_context( $this->engine );
		if ( $buddypress ) {
			$contexts['buddypress'] = $buddypress;
		}

		$comments = Contexts\comments_context( $this->engine );
		if ( $comments ) {
			$contexts['comments'] = $comments;
		}

		return $contexts;
	}

	/**
	 * Boot the engine on init.
	 *
	 * @return void
	 */
	public function boot() {
		$this->engine->boot();

		// Wire bbPress admin hooks if context is active.
		if ( $this->engine->get_context( 'bbpress' ) ) {
			Contexts\bbpress_wire_admin( $this->engine );
		}
	}

	/**
	 * Get the engine instance.
	 *
	 * @return Engine
	 */
	public function get_engine() {
		return $this->engine;
	}

	/**
	 * Backward compatibility — get a handler-like object for the specified type.
	 *
	 * Returns the engine itself since it handles all contexts now.
	 *
	 * @param string $which The handler type ('Comments', 'bbPress', 'BuddyPress').
	 * @return Engine|null
	 */
	public function get_handler( $which ) {
		$map = [
			'Comments'   => 'comments',
			'bbPress'    => 'bbpress',
			'BuddyPress' => 'buddypress',
		];

		$context_id = $map[ $which ] ?? strtolower( $which );

		if ( $this->engine->get_context( $context_id ) ) {
			return $this->engine;
		}

		return null;
	}
}

Blocks_Everywhere::init();
