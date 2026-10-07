<?php
/**
 * Enables all the Blocks Everywhere handlers for the e2e tests.
 */

add_filter( 'blocks_everywhere_comments', '__return_true' );
add_filter( 'blocks_everywhere_bbpress', '__return_true' );
add_filter( 'blocks_everywhere_buddypress', '__return_true' );
add_filter( 'blocks_everywhere_email', '__return_true' );

// There is no build directory, so skip asset registration
add_action(
	'plugins_loaded',
	function() {
		if ( class_exists( '\Automattic\Blocks_Everywhere\Handler\Handler' ) ) {
			\Automattic\Blocks_Everywhere\Handler\Handler::$registered_assets = true;
		}
	}
);

// Render blocks in BuddyPress activity, as add-ons such as BP Activity Block Editor do. This is off by default.
add_filter( 'bp_is_activity_blocks_active', '__return_true' );

// The editor expects the Gutenberg plugin, which provides the same class as core
if ( ! class_exists( 'WP_Theme_JSON_Data_Gutenberg' ) ) {
	class_alias( 'WP_Theme_JSON_Data', 'WP_Theme_JSON_Data_Gutenberg' );
}

// Never send email
add_filter( 'pre_wp_mail', '__return_false' );
