<?php
/**
 * Create content and users for the local Playground site. This runs after setup-buddypress.php, in a separate request
 * so that the BuddyPress components are loaded.
 */

require '/wordpress/wp-load.php';

// bbPress templates work best with a classic theme
switch_theme( 'twentytwentyone' );

update_option( 'permalink_structure', '/%postname%/' );

wp_set_current_user( 1 );

$participant_id = wp_create_user( 'participant', 'password', 'participant@example.com' );
bbp_set_user_role( $participant_id, bbp_get_participant_role() );

$forum_id = bbp_insert_forum(
	[
		'post_title' => 'Test Forum',
		'post_name' => 'test-forum',
	]
);

$topic_id = bbp_insert_topic(
	[
		'post_title' => 'Test Topic',
		'post_name' => 'test-topic',
		'post_parent' => $forum_id,
		'post_content' => '<!-- wp:paragraph --><p>This topic was written with <strong>blocks</strong>.</p><!-- /wp:paragraph --><!-- wp:list --><ul class="wp-block-list"><!-- wp:list-item --><li>One</li><!-- /wp:list-item --><!-- wp:list-item --><li>Two</li><!-- /wp:list-item --></ul><!-- /wp:list -->',
	],
	[ 'forum_id' => $forum_id ]
);

bbp_insert_reply(
	[
		'post_parent' => $topic_id,
		'post_author' => $participant_id,
		'post_content' => '<!-- wp:paragraph --><p>A reply from the participant.</p><!-- /wp:paragraph --><!-- wp:quote --><blockquote class="wp-block-quote"><!-- wp:paragraph --><p>A quote</p><!-- /wp:paragraph --></blockquote><!-- /wp:quote -->',
	],
	[
		'forum_id' => $forum_id,
		'topic_id' => $topic_id,
	]
);

bp_activity_post_update(
	[
		'content' => '<!-- wp:paragraph --><p>An activity update with blocks.</p><!-- /wp:paragraph -->',
		'user_id' => $participant_id,
	]
);

flush_rewrite_rules();
