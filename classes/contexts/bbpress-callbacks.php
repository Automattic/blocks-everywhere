<?php
/**
 * bbPress-specific callbacks for the Blocks Everywhere engine.
 *
 * These are standalone functions that handle bbPress quirks:
 * - bbp_encode_bad workarounds for block comment preservation
 * - Email block stripping
 * - Pasted image cleanup
 * - Attachment reparenting (EC-specific, hookable)
 * - Content display with embed normalization
 *
 * @package Automattic\Blocks_Everywhere\Contexts
 * @since   2.0.0
 */

namespace Automattic\Blocks_Everywhere\Contexts;

/**
 * Runs before bbp_encode_bad — converts &lt;/&gt; into square bracket format
 * to protect them from bbPress encoding. Restored by bbpress_allow_comments_post.
 *
 * @param string $content Content.
 * @return string
 */
function bbpress_allow_comments_pre( $content ) {
	$content = str_replace( '&lt;', '[[lt;', $content );
	$content = str_replace( '&gt;', 'gt;]]', $content );
	return $content;
}

/**
 * Runs after bbp_encode_bad — unencodes block markup that bbPress escaped,
 * and restores square bracket format back to encoded &lt;/&gt;.
 *
 * @param string $content Content.
 * @return string
 */
function bbpress_allow_comments_post( $content ) {
	$filter = current_filter();

	if ( has_filter( $filter, 'bbp_encode_bad' ) ) {
		$content = preg_replace( bbpress_get_markup_regex( '&lt;', '&gt;' ), '<!--$1-->', $content );
	}

	$content = str_replace( '[[lt;', '&lt;', $content );
	$content = str_replace( 'gt;]]', '&gt;', $content );
	return $content;
}

/**
 * Get the regex for matching block markup with custom prefix/suffix.
 *
 * @param string $prefix Prefix (e.g. '<' or '&lt;').
 * @param string $suffix Suffix (e.g. '>' or '&gt;').
 * @return string
 */
function bbpress_get_markup_regex( $prefix, $suffix ) {
	$block_syntax = 'wp:[a-z0-9-/]+';

	return "@{$prefix}!--(" .
		"(?:\\s*{$block_syntax}\\s*(?:\\{.*?\\}\\s*)?[/]?)" .
		'|' .
		"(?:\\s*[/]{$block_syntax}\\s*)" .
		")--{$suffix}@";
}

/**
 * Clean up WP Emoji pasted image tags that break Gutenberg.
 *
 * @param string $content Content.
 * @return string
 */
function bbpress_convert_pasted_images( $content ) {
	$content = str_replace( '/>&lt;/img&gt;', '/>', $content );
	return str_replace( '></img>', '/>', $content );
}

/**
 * Normalize WP oEmbed iframe secrets that get doubled up in some rendering paths.
 *
 * @param string $content Rendered HTML.
 * @return string
 */
function bbpress_normalize_wp_embed_iframe_secrets( $content ) {
	if ( false === strpos( $content, 'wp-embedded-content' ) ) {
		return $content;
	}

	return preg_replace_callback(
		'/<iframe\b[^>]*\bclass="[^"]*\bwp-embedded-content\b[^"]*"[^>]*>/i',
		function ( $matches ) {
			$iframe_tag = $matches[0];

			if ( ! preg_match( '/\bdata-secret="([^"]+)"/i', $iframe_tag, $secret_match ) ) {
				return $iframe_tag;
			}

			if ( ! preg_match( '/\bsrc="([^"]+)"/i', $iframe_tag, $src_match ) ) {
				return $iframe_tag;
			}

			$secret = $secret_match[1];
			$src    = $src_match[1];
			$base   = explode( '#', $src, 2 )[0];

			$normalized_src = $base . '#?secret=' . $secret;

			return preg_replace(
				'/\bsrc="[^"]+"/i',
				'src="' . esc_url( $normalized_src ) . '"',
				$iframe_tag,
				1
			);
		},
		$content
	);
}

/**
 * Create a bbPress content display filter callback with autoembed + do_blocks + iframe normalization.
 *
 * @param object $engine Engine instance (implements do_blocks).
 * @param string $hook   Filter hook name.
 * @return callable
 */
function bbpress_make_content_display_callback( $engine, $hook ) {
	return function ( $content ) use ( $engine, $hook ) {
		$has_embed_html = false !== strpos( $content, 'wp-embedded-content' );

		if ( ! $has_embed_html && ! has_blocks( $content ) ) {
			$content = $GLOBALS['wp_embed']->autoembed( $content );
		}

		$content = $engine->do_blocks( $content, $hook );

		if ( false === strpos( $content, 'wp-embedded-content' ) ) {
			$content = $GLOBALS['wp_embed']->autoembed( $content );
		}

		return bbpress_normalize_wp_embed_iframe_secrets( $content );
	};
}

/**
 * Check if we're editing a topic or reply that contains blocks.
 *
 * @return bool
 */
function bbpress_is_editing_blocks() {
	if ( ! function_exists( 'bbp_is_post_request' ) ) {
		return false;
	}

	$topic_id = 0;
	$reply_id = 0;

	// phpcs:ignore
	if ( bbp_is_post_request() && ! empty( $_POST['action'] ) ) {
		// phpcs:ignore
		$action = $_POST['action'];

		// phpcs:ignore
		if ( 'bbp-edit-reply' === $action && isset( $_POST['bbp_reply_id'] ) ) {
			// phpcs:ignore
			$reply_id = intval( $_POST['bbp_reply_id'], 10 );
		// phpcs:ignore
		} elseif ( 'bbp-edit-topic' === $action && isset( $_POST['bbp_topic_id'] ) ) {
			// phpcs:ignore
			$topic_id = intval( $_POST['bbp_topic_id'], 10 );
		}
	} elseif ( function_exists( 'bbp_is_reply_edit' ) && bbp_is_reply_edit() ) {
		$reply_id = bbp_get_reply_id();
	} elseif ( function_exists( 'bbp_is_topic_edit' ) && bbp_is_topic_edit() ) {
		$topic_id = bbp_get_topic_id();
	}

	if ( $reply_id ) {
		$reply = bbp_get_reply( $reply_id );
		if ( $reply ) {
			return has_blocks( $reply->post_content );
		}
	}

	if ( $topic_id ) {
		$topic = get_post_field( 'post_content', $topic_id );
		return has_blocks( $topic );
	}

	return false;
}

/**
 * Get the current bbPress topic ID.
 *
 * @return int
 */
function bbpress_get_current_topic_id() {
	if ( ! function_exists( 'bbp_get_topic_id' ) ) {
		return 0;
	}

	$topic_id = 0;

	if ( ( function_exists( 'bbp_is_single_topic' ) && bbp_is_single_topic() ) || bbp_is_topic_edit() ) {
		$topic_id = bbp_get_topic_id();
	} elseif ( bbp_is_reply_edit() ) {
		$reply_id = bbp_get_reply_id();
		$topic_id = bbp_get_reply_topic_id( $reply_id );
	} elseif ( bbp_is_single_forum() ) {
		return 0;
	}

	return $topic_id ? (int) $topic_id : 0;
}

/**
 * Get the current bbPress forum ID.
 *
 * @return int
 */
function bbpress_get_current_forum_id() {
	if ( function_exists( 'bbp_is_single_forum' ) && bbp_is_single_forum() && function_exists( 'bbp_get_forum_id' ) ) {
		$forum_id = (int) bbp_get_forum_id();
		return $forum_id > 0 ? $forum_id : 0;
	}

	if ( ! function_exists( 'bbp_get_topic_forum_id' ) ) {
		return 0;
	}

	$topic_id = bbpress_get_current_topic_id();
	if ( $topic_id <= 0 ) {
		return 0;
	}

	$forum_id = (int) bbp_get_topic_forum_id( $topic_id );
	return $forum_id > 0 ? $forum_id : 0;
}

/**
 * Reparent pending content embed attachments to their topic.
 *
 * This is EC-specific and hookable — it only runs when hooked via the context config.
 *
 * @param int   $topic_id       Topic ID.
 * @param int   $forum_id       Forum ID.
 * @param array $anonymous_data Anonymous data.
 * @param int   $topic_author   Topic author ID.
 */
function bbpress_reparent_attachments( $topic_id, $forum_id, $anonymous_data, $topic_author ) {
	$topic_id = (int) $topic_id;
	if ( ! $topic_id ) {
		return;
	}

	$topic_content = get_post_field( 'post_content', $topic_id );
	if ( ! $topic_content || ! has_blocks( $topic_content ) ) {
		return;
	}

	$blocks = parse_blocks( $topic_content );
	if ( ! is_array( $blocks ) ) {
		return;
	}

	$attachment_ids = bbpress_get_attachment_ids_from_blocks( $blocks );
	$attachment_ids = array_values( array_unique( array_filter( $attachment_ids ) ) );
	if ( empty( $attachment_ids ) ) {
		return;
	}

	foreach ( $attachment_ids as $attachment_id ) {
		$attachment_id = (int) $attachment_id;
		if ( ! $attachment_id ) {
			continue;
		}

		$attachment = get_post( $attachment_id );
		if ( ! $attachment || $attachment->post_type !== 'attachment' ) {
			continue;
		}

		if ( (int) $attachment->post_parent !== 0 ) {
			continue;
		}

		if ( (int) $attachment->post_author !== (int) $topic_author ) {
			continue;
		}

		if ( ! get_post_meta( $attachment_id, '_extrachill_content_embed_pending_parent', true ) ) {
			continue;
		}

		wp_update_post(
			[
				'ID'          => $attachment_id,
				'post_parent' => $topic_id,
			]
		);

		delete_post_meta( $attachment_id, '_extrachill_content_embed_pending_parent' );
	}
}

/**
 * Extract attachment IDs from parsed blocks recursively.
 *
 * @param array $blocks Parsed blocks.
 * @return int[]
 */
function bbpress_get_attachment_ids_from_blocks( array $blocks ) {
	$attachment_ids = [];

	foreach ( $blocks as $block ) {
		if ( ! is_array( $block ) ) {
			continue;
		}

		if ( isset( $block['blockName'], $block['attrs'] ) ) {
			$attrs = is_array( $block['attrs'] ) ? $block['attrs'] : [];

			if ( $block['blockName'] === 'core/image' && isset( $attrs['id'] ) ) {
				$attachment_ids[] = (int) $attrs['id'];
			}

			if ( $block['blockName'] === 'core/gallery' && isset( $attrs['ids'] ) && is_array( $attrs['ids'] ) ) {
				foreach ( $attrs['ids'] as $id ) {
					$attachment_ids[] = (int) $id;
				}
			}
		}

		if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
			$attachment_ids = array_merge(
				$attachment_ids,
				bbpress_get_attachment_ids_from_blocks( $block['innerBlocks'] )
			);
		}
	}

	return $attachment_ids;
}

/**
 * Remove blocks from reply email content.
 *
 * @param object $engine  Engine instance.
 * @param string $content Email content.
 * @param int    $reply_id Reply ID.
 * @return string
 */
function bbpress_remove_blocks_from_reply( $engine, $content, $reply_id ) {
	$new_content = bbp_get_reply_content( $reply_id );
	return bbpress_remove_blocks_from_email( $engine, $new_content, $content );
}

/**
 * Remove blocks from topic email content.
 *
 * @param object $engine  Engine instance.
 * @param string $content Email content.
 * @param int    $topic_id Topic ID.
 * @return string
 */
function bbpress_remove_blocks_from_topic( $engine, $content, $topic_id ) {
	$new_content = bbp_get_topic_content( $topic_id );
	return bbpress_remove_blocks_from_email( $engine, $new_content, $content );
}

/**
 * Remove blocks from email, converting to markdown-lite.
 *
 * @param object $engine      Engine instance.
 * @param string $new_content New content from topic/reply.
 * @param string $old_email   Original email text.
 * @return string
 */
function bbpress_remove_blocks_from_email( $engine, $new_content, $old_email ) {
	if ( ! has_blocks( $new_content ) ) {
		return $old_email;
	}

	$new_content = wp_specialchars_decode( $new_content );
	$new_content = $engine->do_blocks( $new_content, 'bbp_get_new_content_content' );

	// markdown-lite conversions
	$new_content = preg_replace( '@<li[^>]*>(.*?)<@s', ' - $1<', $new_content );
	$new_content = preg_replace( '@<strong[^>]*>(.*?)</strong>@', '*$1*', $new_content );
	$new_content = preg_replace( '@<blockquote[^>]*>.*?<p>(.*?)</p>.*?</blockquote>@s', '> $1', $new_content );
	$new_content = preg_replace( '@<a.*?href="(.*?)"[^>]*>(.*?)</a>@s', '$2 ( $1 )', $new_content );

	$new_content = wp_specialchars_decode( wp_strip_all_tags( $new_content ), ENT_QUOTES );
	$new_content = preg_replace( '/n{2,}/', "n\n", $new_content );

	$lines = explode( "n", $old_email );
	$lines = array_merge(
		array_slice( $lines, 0, 2 ),
		explode( "n", $new_content ),
		bbpress_get_email_signature( $lines ),
	);

	return implode( "n", $lines );
}

/**
 * Extract the bbPress email signature from email lines.
 *
 * @param string[] $lines Email lines.
 * @return string[]
 */
function bbpress_get_email_signature( $lines ) {
	$found_marker = false;

	for ( $pos = count( $lines ) - 1; $pos >= 0; $pos-- ) {
		if ( str_starts_with( $lines[ $pos ], '----------' ) ) {
			$found_marker = true;
		}

		if ( $found_marker && preg_match( '@^.*?: https?://.*$@', $lines[ $pos ], $matches ) > 0 ) {
			return array_merge( [ '' ], array_slice( $lines, $pos ) );
		}
	}

	return [];
}

/**
 * Toggle bbPress CPTs for Gutenberg support.
 *
 * @param array $args Post type args.
 * @return array
 */
function bbpress_support_gutenberg( $args ) {
	$args['show_in_rest'] = true;
	return $args;
}
