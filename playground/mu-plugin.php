<?php
/**
 * Enables Blocks Everywhere for the local Playground site.
 */

// The comments handler isn't enabled, as the editor doesn't load in comments when it's used with the bbPress handler
add_filter( 'blocks_everywhere_bbpress', '__return_true' );
add_filter( 'blocks_everywhere_buddypress', '__return_true' );

// Use the block editor when editing bbPress content in wp-admin
add_filter( 'blocks_everywhere_bbpress_admin', '__return_true' );

// Playground can't send email
add_filter( 'pre_wp_mail', '__return_false' );
