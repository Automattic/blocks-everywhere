<?php
/**
 * Security regression tests for the block allowlist. Runs inside WordPress Playground (see run.sh).
 *
 * Each attack is sent through the same functions and hooks that the real comment, bbPress, and BuddyPress submission
 * code uses, and is then rendered through the real display hooks. An attack passes if the disallowed block is not stored,
 * is not rendered, and no outbound HTTP request is made. Outbound requests are blocked and counted, and serve as the SSRF canary.
 *
 * Results are written to /e2e-out/results.json
 */

require '/wordpress/wp-load.php';

$results = [];

/**
 * Outbound HTTP requests made since the last reset
 */
$http_requests = [];

add_filter(
	'pre_http_request',
	function( $response, $args, $url ) use ( &$http_requests ) {
		$http_requests[] = $url;
		return new WP_Error( 'blocks_everywhere_e2e', 'Blocked by e2e tests' );
	},
	10,
	3
);

/**
 * Email messages sent since the last reset. Email is never actually sent, see mu-plugin.php
 */
$emails = [];

add_filter(
	'pre_wp_mail',
	function( $return, $atts ) use ( &$emails ) {
		$emails[] = $atts['message'];
		return $return;
	},
	1,
	2
);

const CANARY = 'https://canary.invalid/ssrf';

const ATTACKS = [
	'top-level rss' => '<!-- wp:rss {"feedURL":"' . CANARY . '","itemsToShow":1} /-->',
	'nested rss' => '<!-- wp:paragraph --><p>hi</p><!-- wp:rss {"feedURL":"' . CANARY . '","itemsToShow":1} /--><!-- /wp:paragraph -->',
	'tab delimiter rss' => "<!--\twp:rss {\"feedURL\":\"" . CANARY . '","itemsToShow":1} /-->',
	'deeply nested latest-comments' => '<!-- wp:quote --><blockquote class="wp-block-quote"><!-- wp:paragraph --><p>x</p><!-- wp:latest-comments /--><!-- /wp:paragraph --></blockquote><!-- /wp:quote -->',
];

const DISALLOWED = [ 'core/rss', 'core/latest-comments' ];

// Output that shows a disallowed block was rendered
const RENDER_MARKERS = [ 'wp-block-rss', 'components-placeholder', 'wp-block-latest-comments', 'No comments to show', 'RSS Error' ];

// Block markup typed as text, which is stored encoded and must stay as text
const ENCODED_ATTACK = '<!-- wp:paragraph --><p>&lt;!-- wp:rss {"feedURL":"' . CANARY . '","itemsToShow":1} /--&gt;</p><!-- /wp:paragraph -->';

const ORDERED_LIST = '<!-- wp:list {"ordered":true} --><ol class="wp-block-list"><!-- wp:list-item --><li>one</li><!-- /wp:list-item --></ol><!-- /wp:list -->';

/**
 * Get all block names in some content, including nested blocks
 */
function e2e_block_names( $blocks ) {
	$names = [];

	foreach ( $blocks as $block ) {
		if ( $block['blockName'] ) {
			$names[] = $block['blockName'];
		}

		$names = array_merge( $names, e2e_block_names( $block['innerBlocks'] ) );
	}

	return $names;
}

/**
 * Record the result of an attack
 */
function e2e_attack( &$results, &$http_requests, $surface, $attack, callable $save, callable $render ) {
	$http_requests = [];
	$error = '';
	$stored = '';
	$rendered = '';

	try {
		$stored = (string) $save();
		$rendered = (string) $render();
	} catch ( Throwable $e ) {
		$error = $e->getMessage();
	}

	$stored_disallowed = array_values( array_intersect( e2e_block_names( parse_blocks( $stored ) ), DISALLOWED ) );
	$rendered_markers = array_values(
		array_filter(
			RENDER_MARKERS,
			function( $marker ) use ( $rendered ) {
				return strpos( $rendered, $marker ) !== false;
			}
		)
	);

	$results[] = [
		'type' => 'attack',
		'surface' => $surface,
		'case' => $attack,
		'pass' => $error === '' && count( $stored_disallowed ) === 0 && count( $rendered_markers ) === 0 && count( $http_requests ) === 0,
		'stored_disallowed' => $stored_disallowed,
		'rendered_markers' => $rendered_markers,
		'http_requests' => $http_requests,
		'error' => $error,
		'stored' => $stored,
		'rendered' => $rendered,
	];
}

/**
 * Record the result of a check that legitimate content is unchanged
 */
function e2e_content( &$results, $surface, $case, callable $check ) {
	$error = '';
	$pass = false;
	$stored = '';

	try {
		list( $pass, $stored ) = $check();
	} catch ( Throwable $e ) {
		$error = $e->getMessage();
	}

	$results[] = [
		'type' => 'content',
		'surface' => $surface,
		'case' => $case,
		'pass' => $error === '' && $pass,
		'error' => $error,
		'stored' => $stored,
	];
}

/**
 * Render activity in the same way as the BuddyPress activity stream
 */
function e2e_render_activity( $activity_id ) {
	$activity = new BP_Activity_Activity( $activity_id );

	return apply_filters_ref_array( 'bp_get_activity_content_body', [ $activity->content, &$activity ] );
}

/**
 * Find the activity that bbPress created for a reply
 */
function e2e_get_reply_activity( $reply_id ) {
	global $wpdb;

	$table = buddypress()->activity->table_name;

	// phpcs:ignore
	return (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$table} WHERE component = 'bbpress' AND item_id = %d", $reply_id ) );
}

/**
 * Set whether core's KSES runs before or after the plugin on pre_comment_content. Both use priority 10, so the order
 * depends on when they were added. In a normal request KSES is first, but calling wp_set_current_user() re-adds it last.
 */
function e2e_set_kses_order( $kses_first ) {
	global $wp_filter;

	$callbacks = $wp_filter['pre_comment_content']->callbacks[10];
	$kses = [ 'wp_filter_kses' => $callbacks['wp_filter_kses'] ];
	unset( $callbacks['wp_filter_kses'] );

	$wp_filter['pre_comment_content']->callbacks[10] = $kses_first ? $kses + $callbacks : $callbacks + $kses;
}

/**
 * Submit a comment in the same way as wp-comments-post.php
 */
function e2e_submit_comment( $post_id, $content ) {
	$comment_id = wp_new_comment(
		wp_slash(
			[
				'comment_post_ID' => $post_id,
				'comment_content' => $content,
				'comment_author' => 'anon',
				'comment_author_email' => 'anon@example.com',
				'comment_author_url' => '',
				'comment_type' => 'comment',
				'comment_parent' => 0,
				'user_id' => 0,
			]
		),
		true
	);

	if ( is_wp_error( $comment_id ) ) {
		throw new Exception( $comment_id->get_error_message() );
	}

	return $comment_id;
}

/**
 * Submit a reply in the same way as bbp_new_reply_handler(). The form content comes from $_POST, which is slashed
 */
function e2e_submit_reply( $forum_id, $topic_id, $user_id, $content ) {
	$content = apply_filters( 'bbp_new_reply_pre_content', wp_slash( $content ) );
	$reply_id = wp_insert_post(
		[
			'post_author' => $user_id,
			'post_title' => 'Reply',
			'post_content' => $content,
			'post_status' => bbp_get_public_status_id(),
			'post_parent' => $topic_id,
			'post_type' => bbp_get_reply_post_type(),
			'comment_status' => 'closed',
		],
		true
	);

	if ( is_wp_error( $reply_id ) ) {
		throw new Exception( $reply_id->get_error_message() );
	}

	// This creates the activity stream copy of the reply
	do_action( 'bbp_new_reply', $reply_id, $topic_id, $forum_id, [], $user_id, false, 0 );

	return $reply_id;
}

try {
	add_filter( 'wp_is_comment_flood', '__return_false', 99 );
	add_filter( 'duplicate_comment_id', '__return_false', 99 );

	$admin_id = 1;
	$participant_id = wp_create_user( 'participant', wp_generate_password(), 'participant@example.com' );
	$member_id = wp_create_user( 'member', wp_generate_password(), 'member@example.com' );
	$subscriber_id = wp_create_user( 'subscriber', wp_generate_password(), 'subscriber@example.com' );

	wp_set_current_user( $admin_id );

	$post_id = wp_insert_post(
		[
			'post_title' => 'Post',
			'post_status' => 'publish',
			'comment_status' => 'open',
		]
	);
	$forum_id = bbp_insert_forum( [ 'post_title' => 'Forum' ] );
	$topic_id = bbp_insert_topic(
		[
			'post_title' => 'Topic',
			'post_parent' => $forum_id,
		],
		[ 'forum_id' => $forum_id ]
	);

	// Subscribe to the topic so that replies send an email. This user never replies, as replying without subscribing unsubscribes
	bbp_add_user_subscription( $subscriber_id, $topic_id );

	foreach ( ATTACKS as $attack => $payload ) {
		// Variant A: anonymous comment
		wp_set_current_user( 0 );

		foreach ( [ 'comment' => true, 'comment, KSES after plugin' => false ] as $surface => $kses_first ) {
			e2e_set_kses_order( $kses_first );
			e2e_attack(
				$results,
				$http_requests,
				$surface,
				$attack,
				function() use ( $post_id, $payload, &$comment_id ) {
					$comment_id = e2e_submit_comment( $post_id, $payload );
					return get_comment( $comment_id )->comment_content;
				},
				function() use ( &$comment_id ) {
					$comment = get_comment( $comment_id );
					return apply_filters( 'comment_text', $comment->comment_content, $comment, [] );
				}
			);
		}

		// Variant B: bbPress reply from a participant, with the editor loaded as it would be for a logged in user
		wp_set_current_user( $participant_id );
		do_action( 'bbp_template_redirect' );

		e2e_attack(
			$results,
			$http_requests,
			'bbPress reply',
			$attack,
			function() use ( $forum_id, $topic_id, $participant_id, $payload, &$reply_id ) {
				$reply_id = e2e_submit_reply( $forum_id, $topic_id, $participant_id, $payload );
				return get_post_field( 'post_content', $reply_id, 'raw' );
			},
			function() use ( &$reply_id ) {
				return bbp_get_reply_content( $reply_id );
			}
		);

		// Variant B: the copy of the bbPress reply in the BuddyPress activity stream
		e2e_attack(
			$results,
			$http_requests,
			'bbPress reply in activity',
			$attack,
			function() use ( &$reply_id, &$reply_activity_id ) {
				$reply_activity_id = e2e_get_reply_activity( $reply_id );

				if ( ! $reply_activity_id ) {
					throw new Exception( 'No activity was created for the reply' );
				}

				return ( new BP_Activity_Activity( $reply_activity_id ) )->content;
			},
			function() use ( &$reply_activity_id ) {
				return e2e_render_activity( $reply_activity_id );
			}
		);

		// Variant C: BuddyPress activity update, in the same way as bp_nouveau_ajax_post_update(), which uses $_POST directly
		wp_set_current_user( $member_id );
		e2e_attack(
			$results,
			$http_requests,
			'BuddyPress update',
			$attack,
			function() use ( $member_id, $payload, &$activity_id ) {
				$activity_id = bp_activity_post_update(
					[
						'content' => wp_slash( $payload ),
						'user_id' => $member_id,
						'error_type' => 'wp_error',
					]
				);

				if ( is_wp_error( $activity_id ) ) {
					// Rejecting the update is fine, as long as nothing was stored
					return '';
				}

				return ( new BP_Activity_Activity( $activity_id ) )->content;
			},
			function() use ( &$activity_id ) {
				return is_wp_error( $activity_id ) ? '' : e2e_render_activity( $activity_id );
			}
		);
	}

	// Content stored before the fix, inserted directly so it bypasses any save filtering
	wp_set_current_user( $admin_id );
	kses_remove_filters();

	foreach ( ATTACKS as $attack => $payload ) {
		e2e_attack(
			$results,
			$http_requests,
			'stored comment',
			$attack,
			function() use ( $post_id, $payload, &$comment_id ) {
				$comment_id = wp_insert_comment(
					wp_slash(
						[
							'comment_post_ID' => $post_id,
							'comment_content' => $payload,
							'comment_approved' => 1,
						]
					)
				);

				// The attack is already stored, so only the rendering is checked
				return '';
			},
			function() use ( &$comment_id ) {
				$comment = get_comment( $comment_id );
				return apply_filters( 'comment_text', $comment->comment_content, $comment, [] );
			}
		);

		e2e_attack(
			$results,
			$http_requests,
			'stored bbPress reply',
			$attack,
			function() use ( $topic_id, $payload, &$reply_id ) {
				$reply_id = bbp_insert_reply(
					[
						'post_parent' => $topic_id,
						'post_content' => wp_slash( $payload ),
					],
					[ 'topic_id' => $topic_id ]
				);
				return '';
			},
			function() use ( &$reply_id ) {
				return bbp_get_reply_content( $reply_id );
			}
		);
	}

	remove_all_filters( 'bp_activity_content_before_save' );

	foreach ( ATTACKS as $attack => $payload ) {
		e2e_attack(
			$results,
			$http_requests,
			'stored BuddyPress update',
			$attack,
			function() use ( $payload, &$activity_id ) {
				$activity_id = bp_activity_add(
					[
						'component' => 'activity',
						'type' => 'activity_update',
						'content' => $payload,
						'user_id' => 1,
					]
				);
				return '';
			},
			function() use ( &$activity_id ) {
				return e2e_render_activity( $activity_id );
			}
		);
	}

	kses_init_filters();

	// bbPress subscription email, which converts the reply from blocks to text
	wp_set_current_user( $participant_id );
	e2e_attack(
		$results,
		$http_requests,
		'bbPress email',
		'encoded rss text',
		function() use ( $forum_id, $topic_id, $participant_id, &$emails, &$reply_id ) {
			$emails = [];
			$reply_id = e2e_submit_reply( $forum_id, $topic_id, $participant_id, ENCODED_ATTACK );

			if ( count( $emails ) === 0 ) {
				throw new Exception( 'No email was sent' );
			}

			return get_post_field( 'post_content', $reply_id, 'raw' );
		},
		function() use ( &$emails ) {
			return implode( "\n", $emails );
		}
	);

	// Legitimate content should be unchanged
	wp_set_current_user( 0 );
	e2e_set_kses_order( true );
	e2e_content(
		$results,
		'comment',
		'plain text unchanged',
		function() use ( $post_id ) {
			$comment = get_comment( e2e_submit_comment( $post_id, 'Hello <!-- not a block --> world' ) );
			$rendered = apply_filters( 'comment_text', $comment->comment_content, $comment, [] );

			return [ $comment->comment_content === 'Hello <!-- not a block --> world' && strpos( $rendered, 'Hello' ) !== false, $comment->comment_content ];
		}
	);

	e2e_content(
		$results,
		'comment',
		'allowed blocks rendered',
		function() use ( $post_id ) {
			$comment = get_comment( e2e_submit_comment( $post_id, '<!-- wp:paragraph --><p>para</p><!-- /wp:paragraph -->' . ORDERED_LIST ) );
			$rendered = apply_filters( 'comment_text', $comment->comment_content, $comment, [] );

			return [ strpos( $rendered, 'para</p>' ) !== false && strpos( $rendered, '<li>one</li>' ) !== false, $comment->comment_content ];
		}
	);

	e2e_content(
		$results,
		'comment',
		'allowed block attributes kept',
		function() use ( $post_id ) {
			$comment = get_comment( e2e_submit_comment( $post_id, ORDERED_LIST ) );

			return [ strpos( $comment->comment_content, '{"ordered":true}' ) !== false, $comment->comment_content ];
		}
	);

	wp_set_current_user( $participant_id );
	e2e_content(
		$results,
		'bbPress reply',
		'allowed block attributes kept',
		function() use ( $forum_id, $topic_id, $participant_id ) {
			$content = get_post_field( 'post_content', e2e_submit_reply( $forum_id, $topic_id, $participant_id, ORDERED_LIST ), 'raw' );

			return [ strpos( $content, '{"ordered":true}' ) !== false, $content ];
		}
	);

	e2e_content(
		$results,
		'bbPress email',
		'blocks converted to text',
		function() use ( $forum_id, $topic_id, $participant_id, &$emails ) {
			$emails = [];
			e2e_submit_reply( $forum_id, $topic_id, $participant_id, '<!-- wp:paragraph --><p>Tom &amp; Jerry &lt;b&gt;</p><!-- /wp:paragraph -->' . ORDERED_LIST );
			$email = implode( "\n", $emails );

			return [ strpos( $email, 'Tom & Jerry <b>' ) !== false && strpos( $email, ' - one' ) !== false, $email ];
		}
	);

	// The editor settings are expensive to create, and are only needed when the editor is loaded
	$count_settings = function( $logged_in ) use ( $participant_id ) {
		$count = 0;
		$counter = function( $settings ) use ( &$count ) {
			$count++;
			return $settings;
		};

		wp_set_current_user( $logged_in ? $participant_id : 0 );
		add_filter( 'blocks_everywhere_editor_settings', $counter, 99 );
		do_action( 'bbp_template_redirect' );
		remove_filter( 'blocks_everywhere_editor_settings', $counter, 99 );

		return $count;
	};

	e2e_content(
		$results,
		'bbPress page',
		'logged out: no editor settings',
		function() use ( $count_settings ) {
			$count = $count_settings( false );
			return [ $count === 0, "editor settings created $count times" ];
		}
	);

	e2e_content(
		$results,
		'bbPress page',
		'logged in: editor settings once',
		function() use ( $count_settings ) {
			$count = $count_settings( true );
			return [ $count === 1, "editor settings created $count times" ];
		}
	);
} catch ( Throwable $e ) {
	$results[] = [
		'type' => 'setup',
		'surface' => 'setup',
		'case' => 'setup',
		'pass' => false,
		'error' => $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine(),
	];
}

file_put_contents( '/e2e-out/results.json', wp_json_encode( $results, JSON_PRETTY_PRINT ) );
