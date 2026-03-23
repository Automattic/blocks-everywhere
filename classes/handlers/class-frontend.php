<?php
/**
 * Frontend Handler — Generic block editor for any frontend context.
 *
 * Unlike bbPress/BuddyPress/Comments handlers, this handler doesn't
 * bind to any specific hook. External plugins call load_editor() directly
 * to mount the block editor on an arbitrary textarea + container pair.
 *
 * Usage from another plugin:
 *
 *     add_action( 'wp', function() {
 *         if ( ! class_exists( 'Automattic\Blocks_Everywhere\Handler\Frontend' ) ) {
 *             return;
 *         }
 *
 *         $handler = new \Automattic\Blocks_Everywhere\Handler\Frontend();
 *         $handler->load_editor( '#my-textarea', '.my-editor-container' );
 *     } );
 *
 * @package Automattic\Blocks_Everywhere
 * @since   1.26.0
 */

namespace Automattic\Blocks_Everywhere\Handler;

class Frontend extends Handler {

	/**
	 * Constructor.
	 */
	public function __construct() {
		parent::__construct();
	}

	/**
	 * Not used in admin context.
	 *
	 * @param string $hook Page hook.
	 * @return bool
	 */
	public function can_show_admin_editor( $hook ) {
		return false;
	}

	/**
	 * Editor type identifier.
	 *
	 * @return string
	 */
	public function get_editor_type() {
		return 'frontend';
	}
}
