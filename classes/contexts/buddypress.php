<?php
/**
 * BuddyPress context configuration for Blocks Everywhere.
 *
 * @package Automattic\Blocks_Everywhere\Contexts
 * @since   2.0.0
 */

namespace Automattic\Blocks_Everywhere\Contexts;

use Automattic\Blocks_Everywhere\Engine;

/**
 * Build the BuddyPress context configuration array.
 *
 * @param Engine $engine The engine instance.
 * @return array|null
 */
function buddypress_context( Engine $engine ) {
	$default_buddypress = defined( 'BLOCKS_EVERYWHERE_BUDDYPRESS' ) ? BLOCKS_EVERYWHERE_BUDDYPRESS : false;

	if ( ! apply_filters( 'blocks_everywhere_buddypress', $default_buddypress ) ) {
		return null;
	}

	// Remove problematic BuddyPress hooks.
	if ( ! is_admin() ) {
		remove_action( 'bp_blocks_init', 'bp_register_block_components', 1 );
		remove_filter( 'block_editor_settings', 'bp_blocks_editor_settings' );
	}

	// Content display filter.
	add_filter( 'bp_get_activity_content_body', function ( $content ) use ( $engine ) {
		return $engine->do_blocks( $content, 'bp_get_activity_content_body' );
	}, 8 );

	return [
		'type'       => 'buddypress',
		'textarea'   => '#whats-new',
		'container'  => 'buddypress',
		'trigger'    => 'bp_after_activity_post_form',
		'admin_hook' => 'toplevel_page_bp-activity',
	];
}
