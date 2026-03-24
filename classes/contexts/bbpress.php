<?php
/**
 * bbPress context configuration for Blocks Everywhere.
 *
 * @package Automattic\Blocks_Everywhere\Contexts
 * @since   2.0.0
 */

namespace Automattic\Blocks_Everywhere\Contexts;

use Automattic\Blocks_Everywhere\Engine;

/**
 * Build the bbPress context configuration array.
 *
 * @param Engine $engine The engine instance.
 * @return array|null
 */
function bbpress_context( Engine $engine ) {
	$default_bbpress = defined( 'BLOCKS_EVERYWHERE_BBPRESS' ) ? BLOCKS_EVERYWHERE_BBPRESS : false;

	if ( ! apply_filters( 'blocks_everywhere_bbpress', $default_bbpress ) ) {
		return null;
	}

	// Content display filters — always wired regardless of editor load.
	foreach ( [ 'bbp_get_forum_content', 'bbp_get_topic_content', 'bbp_get_reply_content' ] as $hook ) {
		add_filter( $hook, bbpress_make_content_display_callback( $engine, $hook ), 8 );
	}

	// Email block stripping (conditional).
	$default_email = defined( 'BLOCKS_EVERYWHERE_EMAIL' ) ? BLOCKS_EVERYWHERE_EMAIL : false;
	if ( apply_filters( 'blocks_everywhere_email', $default_email ) ) {
		add_filter( 'bbp_subscription_mail_message', function ( $content, $reply_id ) use ( $engine ) {
			return bbpress_remove_blocks_from_reply( $engine, $content, $reply_id );
		}, 10, 2 );
		add_filter( 'bbp_forum_subscription_mail_message', function ( $content, $topic_id ) use ( $engine ) {
			return bbpress_remove_blocks_from_topic( $engine, $content, $topic_id );
		}, 10, 2 );
	}

	// Metadata injected into editor settings.
	add_filter( 'blocks_everywhere_editor_settings', function ( $settings ) {
		$settings['bbpress'] = [
			'topicId'     => bbpress_get_current_topic_id(),
			'forumId'     => bbpress_get_current_forum_id(),
			'isTopicEdit' => function_exists( 'bbp_is_topic_edit' ) ? (bool) bbp_is_topic_edit() : false,
			'isReplyEdit' => function_exists( 'bbp_is_reply_edit' ) ? (bool) bbp_is_reply_edit() : false,
		];
		return $settings;
	} );

	// Attachment reparenting (EC-specific, hookable).
	add_action( 'bbp_new_topic', __NAMESPACE__ . '\\bbpress_reparent_attachments', 10, 4 );

	$save_filters = [
		'bbp_new_topic_pre_content',
		'bbp_edit_topic_pre_content',
		'bbp_new_reply_pre_content',
		'bbp_edit_reply_pre_content',
		'bbp_new_forum_pre_content',
		'bbp_edit_forum_pre_content',
	];

	return [
		'type'             => 'bbpress',
		'textarea'         => '.bbp-the-content',
		'container'        => '.blocks-everywhere',
		'trigger'          => 'bbp_template_redirect',
		'trigger_priority' => 8,
		'condition'        => function () {
			if ( ! is_user_logged_in() ) {
				return false;
			}

			$can_load = apply_filters( 'blocks_everywhere_bbpress_editor', true );
			return $can_load || bbpress_is_editing_blocks();
		},
		'editor_setup'     => function ( Engine $engine ) use ( $save_filters ) {
			// Body class.
			add_action( 'bbp_head', function () use ( $engine ) {
				add_filter( 'body_class', [ $engine, 'body_class' ] );
			} );

			// Save filters — empty block check + pasted image cleanup.
			foreach ( $save_filters as $filter ) {
				add_filter( $filter, [ $engine, 'no_empty_block_content' ], 12 );
				add_filter( $filter, __NAMESPACE__ . '\\bbpress_convert_pasted_images', 12 );
			}

			// KSES setup.
			if ( ! current_user_can( 'unfiltered_html' ) ) {
				// Allow block comments through bbp_encode_bad.
				foreach ( $save_filters as $filter ) {
					add_filter( $filter, __NAMESPACE__ . '\\bbpress_allow_comments_pre', 9 );
					add_filter( $filter, __NAMESPACE__ . '\\bbpress_allow_comments_post', 11 );
				}
				add_filter( 'bbp_kses_allowed_tags', [ $engine, 'get_kses_for_allowed_blocks' ] );
			}

			// Remove bbPress code trick that mangles block markup.
			remove_filter( 'bbp_get_form_forum_content', 'bbp_code_trick_reverse' );
			remove_filter( 'bbp_get_form_topic_content', 'bbp_code_trick_reverse' );
			remove_filter( 'bbp_get_form_reply_content', 'bbp_code_trick_reverse' );
		},
		'admin_textarea'   => '.wp-editor-area',
	];
}

/**
 * Wire bbPress admin-specific hooks that run outside the normal trigger flow.
 *
 * @param Engine $engine The engine instance.
 */
function bbpress_wire_admin( Engine $engine ) {
	$default_admin = defined( 'BLOCKS_EVERYWHERE_BBPRESS_ADMIN' ) ? BLOCKS_EVERYWHERE_BBPRESS_ADMIN : false;

	if ( ! is_admin() || ! apply_filters( 'blocks_everywhere_bbpress_admin', $default_admin ) ) {
		return;
	}

	// Load editor on admin bbPress pages.
	add_action( 'bbp_ready', function () use ( $engine ) {
		$engine->load_editor_for_context( 'bbpress' );
	} );

	// Gutenberg CPT support.
	$default_gutenberg_admin = defined( 'BLOCKS_EVERYWHERE_ADMIN' ) ? BLOCKS_EVERYWHERE_ADMIN : false;
	if ( apply_filters( 'blocks_everywhere_admin', $default_gutenberg_admin ) ) {
		$cap = apply_filters( 'blocks_everywhere_admin_cap', 'manage_options' );

		if ( current_user_can( $cap ) ) {
			add_filter( 'bbp_register_topic_post_type', __NAMESPACE__ . '\\bbpress_support_gutenberg' );
			add_filter( 'bbp_register_reply_post_type', __NAMESPACE__ . '\\bbpress_support_gutenberg' );
			add_filter( 'bbp_register_forum_post_type', __NAMESPACE__ . '\\bbpress_support_gutenberg' );
		}
	}
}
