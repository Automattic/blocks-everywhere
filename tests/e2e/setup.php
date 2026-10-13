<?php
/**
 * Install the BuddyPress components used by the tests. Activating BuddyPress in Playground doesn't create the tables.
 */

require '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
require_once buddypress()->plugin_dir . 'bp-core/admin/bp-core-admin-schema.php';

$components = [
	'activity' => 1,
	'members' => 1,
];

bp_core_install( $components );
bp_update_option( 'bp-active-components', $components );
