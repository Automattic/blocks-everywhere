<?php

namespace Automattic\Blocks_Everywhere\Handler;

class BuddyPress extends Handler {
	/**
	 * Constructor
	 */
	public function __construct() {
		parent::__construct();

		add_action( 'bp_after_activity_post_form', [ $this, 'load_editor_buddypress' ] );

		// Ensure blocks are processed when displaying
		add_filter(
			'bp_get_activity_content_body',
			function( $content ) {
				return $this->do_blocks( $content, 'bp_get_activity_content_body' );
			},
			8
		);

		// These cause problems for the activity page itself
		if ( ! is_admin() ) {
			remove_action( 'bp_blocks_init', 'bp_register_block_components', 1 );
			remove_filter( 'block_editor_settings', 'bp_blocks_editor_settings' );
		}
	}

	public function load_editor_buddypress() {
		$this->load_editor( '#whats-new', 'buddypress' );
	}

	public function can_show_admin_editor( $hook ) {
		return $hook === 'toplevel_page_bp-activity';
	}

	public function get_editor_type() {
		return 'buddypress';
	}
}
