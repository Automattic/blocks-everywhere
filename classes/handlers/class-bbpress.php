<?php

namespace Automattic\Blocks_Everywhere\Handler;

// phpcs:ignore
class bbPress extends Handler {
	/**
	 * Constructor
	 */
	public function __construct() {
		parent::__construct();

		// Load the editor when the page has been setup, allowing us to decide based on the content
		add_action( 'bbp_template_redirect', [ $this, 'bbp_template_redirect' ], 8 );

		$default_admin = defined( 'BLOCKS_EVERYWHERE_BBPRESS_ADMIN' ) ? BLOCKS_EVERYWHERE_BBPRESS_ADMIN : false;
		if ( is_admin() && apply_filters( 'blocks_everywhere_bbpress_admin', $default_admin ) ) {
			// Always load editor on topic/reply/forum admin pages
			add_action(
				'bbp_ready',
				function() {
					$this->enable_editor();
				}
			);
		}

		// Ensure blocks are processed when displaying. This needs to run even if the editor isn't loaded
		add_filter(
			'bbp_get_forum_content',
			function( $content ) {
				$has_embed_html = false !== strpos( $content, 'wp-embedded-content' );

				if ( ! $has_embed_html && ! has_blocks( $content ) ) {
					$content = $GLOBALS['wp_embed']->autoembed( $content );
				}

				$content = $this->do_blocks( $content, 'bbp_get_forum_content' );

				if ( false === strpos( $content, 'wp-embedded-content' ) ) {
					$content = $GLOBALS['wp_embed']->autoembed( $content );
				}

				return $this->normalize_wp_embed_iframe_secrets( $content );
			},
			8
		);
		add_filter(
			'bbp_get_topic_content',
			function( $content ) {
				$has_embed_html = false !== strpos( $content, 'wp-embedded-content' );

				if ( ! $has_embed_html && ! has_blocks( $content ) ) {
					$content = $GLOBALS['wp_embed']->autoembed( $content );
				}

				$content = $this->do_blocks( $content, 'bbp_get_topic_content' );

				if ( false === strpos( $content, 'wp-embedded-content' ) ) {
					$content = $GLOBALS['wp_embed']->autoembed( $content );
				}

				return $this->normalize_wp_embed_iframe_secrets( $content );
			},
			8
		);
		add_filter(
			'bbp_get_reply_content',
			function( $content ) {
				$has_embed_html = false !== strpos( $content, 'wp-embedded-content' );

				if ( ! $has_embed_html && ! has_blocks( $content ) ) {
					$content = $GLOBALS['wp_embed']->autoembed( $content );
				}

				$content = $this->do_blocks( $content, 'bbp_get_reply_content' );

				if ( false === strpos( $content, 'wp-embedded-content' ) ) {
					$content = $GLOBALS['wp_embed']->autoembed( $content );
				}

				return $this->normalize_wp_embed_iframe_secrets( $content );
			},
			8
		);
		add_filter(
			'blocks_everywhere_editor_settings',
			function( $settings ) {
				$settings['bbpress'] = [
					'topicId'     => $this->get_current_topic_id(),
					'forumId'     => $this->get_current_forum_id(),
					'isTopicEdit' => function_exists( 'bbp_is_topic_edit' ) ? (bool) bbp_is_topic_edit() : false,
					'isReplyEdit' => function_exists( 'bbp_is_reply_edit' ) ? (bool) bbp_is_reply_edit() : false,
				];
				return $settings;
			}
		);

		add_action( 'bbp_new_topic', [ $this, 'reparent_pending_content_embed_attachments' ], 10, 4 );

		// Apply block processing to email notifications
		$default_email = defined( 'BLOCKS_EVERYWHERE_EMAIL' ) ? BLOCKS_EVERYWHERE_EMAIL : false;
		if ( apply_filters( 'blocks_everywhere_email', $default_email ) ) {
			add_filter( 'bbp_subscription_mail_message', [ $this, 'remove_blocks_from_reply' ], 10, 2 );
			add_filter( 'bbp_forum_subscription_mail_message', [ $this, 'remove_blocks_from_topic' ], 10, 2 );
		}
	}

	/**
	 * Normalize WP oEmbed iframe secrets.
	 *
	 * Some rendering paths can produce an iframe `src` like:
	 * `.../embed/#?secret=AAA#?secret=BBB`.
	 * This breaks the WP embed host script which relies on `data-secret` matching.
	 *
	 * @param string $content Rendered HTML.
	 * @return string
	 */
	private function normalize_wp_embed_iframe_secrets( $content ) {
		if ( false === strpos( $content, 'wp-embedded-content' ) ) {
			return $content;
		}

		return preg_replace_callback(
			'/<iframe\b[^>]*\bclass="[^"]*\bwp-embedded-content\b[^"]*"[^>]*>/i',
			function( $matches ) {
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

		add_action( 'bbp_new_topic', [ $this, 'reparent_pending_content_embed_attachments' ], 10, 4 );

		// Apply block processing to email notifications
		$default_email = defined( 'BLOCKS_EVERYWHERE_EMAIL' ) ? BLOCKS_EVERYWHERE_EMAIL : false;
		if ( apply_filters( 'blocks_everywhere_email', $default_email ) ) {
			add_filter( 'bbp_subscription_mail_message', [ $this, 'remove_blocks_from_reply' ], 10, 2 );
			add_filter( 'bbp_forum_subscription_mail_message', [ $this, 'remove_blocks_from_topic' ], 10, 2 );
		}
	}

	/**
	 * This editor is for bbPress
	 *
	 * @return string
	 */
	public function get_editor_type() {
		return 'bbpress';
	}

	/**
	 * Loads the editor, if needed, after we know what kind of page to display
	 *
	 * @return void
	 */
	public function bbp_template_redirect() {
		$this->load_view_assets();

		if ( ! is_user_logged_in() ) {
			return;
		}

		// Decide whether we can load the editor
		$can_load_editor = apply_filters( 'blocks_everywhere_bbpress_editor', true );

		// If we can't load the editor then first check if we're editing a topic/reply that contains blocks
		if ( ! $can_load_editor && ! $this->is_editing_blocks() ) {
			// Nope, just return early so we leave KSES alone - plain text editor
			return;
		}

		$this->enable_editor();
	}

	private function enable_editor() {
		$area = '.bbp-the-content';

		if ( is_admin() ) {
			$area = '.wp-editor-area';
		}

		// Insert Gutenberg into the page
		add_filter( 'the_editor', [ $this, 'the_editor' ] );

		// Replace the editor settings
		add_filter( 'wp_editor_settings', [ $this, 'wp_editor_settings' ], 10, 2 );

		$this->load_editor( $area, '.blocks-everywhere' );

		// Modify the body class
		add_action( 'bbp_head', [ $this, 'bbp_head' ] );

		// We don't want an empty block
		$this->setup_content_filters();

		// If the user doesn't have unfiltered_html then we need to modify KSES to allow blocks
		if ( ! current_user_can( 'unfiltered_html' ) ) {
			$this->setup_kses();
		}

		// Required to prevent code blocks being reverted from `<code>` to backtics in editor, breaking blocks.
		// Also helps stop bbp_code_trick_reverse remove a trailing </p>
		remove_filter( 'bbp_get_form_forum_content', 'bbp_code_trick_reverse' );
		remove_filter( 'bbp_get_form_topic_content', 'bbp_code_trick_reverse' );
		remove_filter( 'bbp_get_form_reply_content', 'bbp_code_trick_reverse' );

		// Determine whether to show the bbPress CPT in the backend editor
		$default_admin = defined( 'BLOCKS_EVERYWHERE_ADMIN' ) ? BLOCKS_EVERYWHERE_ADMIN : false;
		if ( apply_filters( 'blocks_everywhere_admin', $default_admin ) ) {
			$cap = apply_filters( 'blocks_everywhere_admin_cap', 'manage_options' );

			if ( current_user_can( $cap ) ) {
				add_filter( 'bbp_register_topic_post_type', [ $this, 'support_gutenberg' ] );
				add_filter( 'bbp_register_reply_post_type', [ $this, 'support_gutenberg' ] );
				add_filter( 'bbp_register_forum_post_type', [ $this, 'support_gutenberg' ] );
			}
		}
	}

	/**
	 * Are we editing a topic or reply and does that topic or reply have blocks?
	 *
	 * @return boolean
	 */
	private function is_editing_blocks() {
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
		} elseif ( bbp_is_reply_edit() ) {
			$reply_id = bbp_get_reply_id();
		} elseif ( bbp_is_topic_edit() ) {
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

	private function get_current_topic_id() {
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

	private function get_current_forum_id() {
		if ( function_exists( 'bbp_is_single_forum' ) && bbp_is_single_forum() && function_exists( 'bbp_get_forum_id' ) ) {
			$forum_id = (int) bbp_get_forum_id();
			return $forum_id > 0 ? $forum_id : 0;
		}

		if ( ! function_exists( 'bbp_get_topic_forum_id' ) ) {
			return 0;
		}

		$topic_id = $this->get_current_topic_id();
		if ( $topic_id <= 0 ) {
			return 0;
		}

		$forum_id = (int) bbp_get_topic_forum_id( $topic_id );
		return $forum_id > 0 ? $forum_id : 0;
	}

	public function reparent_pending_content_embed_attachments( $topic_id, $forum_id, $anonymous_data, $topic_author ) {
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

		$attachment_ids = $this->get_attachment_ids_from_blocks( $blocks );
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

	private function get_attachment_ids_from_blocks( array $blocks ) {
		$attachment_ids = [];

		foreach ( $blocks as $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}

			if ( isset( $block['blockName'], $block['attrs'] ) ) {
				$block_name = $block['blockName'];
				$attrs      = is_array( $block['attrs'] ) ? $block['attrs'] : [];

				if ( $block_name === 'core/image' && isset( $attrs['id'] ) ) {
					$attachment_ids[] = (int) $attrs['id'];
				}

				if ( $block_name === 'core/gallery' && isset( $attrs['ids'] ) && is_array( $attrs['ids'] ) ) {
					foreach ( $attrs['ids'] as $id ) {
						$attachment_ids[] = (int) $id;
					}
				}
			}

			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$attachment_ids = array_merge( $attachment_ids, $this->get_attachment_ids_from_blocks( $block['innerBlocks'] ) );
			}
		}

		return $attachment_ids;
	}

	/**
	 * Get all the bbPress content filters - forums, topics, replies
	 *
	 * @return array
	 */
	private function get_content_filters() {
		return [
			'bbp_new_topic_pre_content',
			'bbp_edit_topic_pre_content',
			'bbp_new_reply_pre_content',
			'bbp_edit_reply_pre_content',
			'bbp_new_forum_pre_content',
			'bbp_edit_forum_pre_content',
		];
	}

	/**
	 * Setup KSES filters for bbPress. This involves disabling bbp_code_trick_reverse, which mangles <code> into ticks.
	 * Then each of the pre_content filters are hooked so that block markup comments are allowed. Finally, KSES is modified
	 * to allow blocks and block attributes.
	 *
	 * This is not comprehensive. If you use different blocks you may need custom KSES.
	 *
	 * @return void
	 */
	private function setup_kses() {
		// Allow block comments in content
		foreach ( $this->get_content_filters() as $filter ) {
			// just after bbp_encode_bad() would have run (if it ran)
			add_filter( $filter, [ $this, 'allow_comments_in_bbp_encode_bad_pre' ], 9 );
			add_filter( $filter, [ $this, 'allow_comments_in_bbp_encode_bad_post' ], 11 );
		}

		// Add the requisite tags for blocks
		add_filter( 'bbp_kses_allowed_tags', [ $this, 'get_kses_for_allowed_blocks' ] );
	}

	/**
	 * Setup the empty content checks
	 *
	 * @return void
	 */
	private function setup_content_filters() {
		foreach ( $this->get_content_filters() as $filter ) {
			add_filter( $filter, [ $this, 'no_empty_block_content' ], 12 );
			add_filter( $filter, [ $this, 'convert_pasted_images' ], 12 );
		}
	}

	/**
	 * WP Emoji modifies pasted emoji into <img></img>, but Gutenberg expects <img/>. This cleans up the emoji img so it doesnt break Gutenberg
	 *
	 * The ></img should never appear by any other normal Gutenberg means
	 *
	 * @param string $content Content.
	 * @return string
	 */
	public function convert_pasted_images( $content ) {
		$content = str_replace( '/>&lt;/img&gt;', '/>', $content );
		return str_replace( '></img>', '/>', $content );
	}

	/**
	 * Filter bbPress content and check for an empty block. Replace it with empty content so bbPress can detect it.
	 *
	 * @param string $content Content.
	 * @return string
	 */
	public function no_empty_block_content( $content ) {
		// Convert blocks to content
		$remove_blocks = do_blocks( $content );
		$remove_blocks = wp_strip_all_tags( $remove_blocks );
		$remove_blocks = trim( $remove_blocks );

		// Do we have any content?
		if ( empty( $remove_blocks ) ) {
			// After block markup is removed then we have no content - return no content so bbPress can handle it
			return '';
		}

		return $content;
	}

	/**
	 * The main regex. It consists of a [prefix]!--[blockmarkup]--[suffix].
	 *
	 * The block markup allows for these forms (shown with prefix as < and postfix as >)
	 *   <!-- wp:namespace/name {"somejson"} -->
	 *   <!-- wp:namespace/name {"somejson"} /-->
	 *   <!-- wp:namespace/name -->
	 *   <!-- wp:namespace/name /-->
	 * @param string $prefix Prefix.
	 * @param string $suffix Suffix.
	 * @return string
	 */
	private function get_markup_regex( $prefix, $suffix ) {
		$block_syntax = 'wp:[a-z0-9-/]+';

		return "@{$prefix}!--(" .
			// Opening blocks, supporting a self-closing block
			"(?:\\s*{$block_syntax}\\s*(?:\\{.*?\\}\\s*)?[/]?)" .
			'|' .
			// Closing block
			"(?:\\s*[/]{$block_syntax}\\s*)" .
			")--{$suffix}@";
	}

	/**
	 * Runs before bbPress and converts all &lt; and &gt; into a special square bracket format [[lt; and gt;]]. This
	 * takes it out of action from further encoding/decoding with the rest of bbPress. It will be restored later.
	 *
	 * @param string $content Content.
	 * @return string
	 */
	public function allow_comments_in_bbp_encode_bad_pre( $content ) {
		// Convert encoded markup into a square bracket version - this is if someone is typing markup as content, not as markup
		$content = str_replace( '&lt;', '[[lt;', $content );
		$content = str_replace( '&gt;', 'gt;]]', $content );

		return $content;
	}

	/**
	 * Runs after bbPress. At this point bbPress has encoded all the block markup so we need to unencoded it. We also need to convert
	 * the square bracket format back into encoded markup. If anyone does happen to use this in their content it will get replaced with
	 * encoded &lt;/&gt; (harmless if annoying)
	 *
	 * @param string $content Content
	 * @return string
	 */
	public function allow_comments_in_bbp_encode_bad_post( $content ) {
		$filter = current_filter();

		// If bbp_encode_bad is active then we need to unencoded block markup
		if ( has_filter( $filter, 'bbp_encode_bad' ) ) {
			// HTML comments have been escaped, we want to re-enable them. We need to handle:
			$content = preg_replace( $this->get_markup_regex( '&lt;', '&gt;' ), '<!--$1-->', $content );
		}

		// Convert the [[]] format back to encoded
		$content = str_replace( '[[lt;', '&lt;', $content );
		$content = str_replace( 'gt;]]', '&gt;', $content );

		return $content;
	}

	/**
	 * Remove blocks from reply emails
	 *
	 * @param string $content Content.
	 * @param integer $reply_id Reply ID.
	 * @return string
	 */
	public function remove_blocks_from_reply( $content, $reply_id ) {
		$new_content = bbp_get_reply_content( $reply_id );
		return $this->remove_blocks_from_email( $new_content, $content );
	}

	/**
	 * Remove blocks from topic emails
	 *
	 * @param string $content Content.
	 * @param integer $reply_id Topic ID.
	 * @return string
	 */
	public function remove_blocks_from_topic( $content, $topic_id ) {
		$new_content = bbp_get_topic_content( $topic_id );
		return $this->remove_blocks_from_email( $new_content, $content );
	}

	/**
	 * Remove blocks from email content, converting it markdown-lite.
	 *
	 * We are given the original new content (taken directly from the topic or reply) and the existing email. We then
	 * process blocks, try and convert some common HTML, and splice it back into the email.
	 *
	 * @param string  $content Email content.
	 * @param integer $reply_id Reply ID.
	 * @return string
	 */
	public function remove_blocks_from_email( $new_content, $old_email ) {
		// Don't do anything if not blocks
		if ( ! has_blocks( $new_content ) ) {
			return $old_email;
		}

		// Get a decoded version of the content
		$new_content = wp_specialchars_decode( $new_content );

		// Process blocks
		$new_content = $this->do_blocks( $new_content, 'bbp_get_new_content_content' );

		// Do a bit of markdown-lite
		$new_content = preg_replace( '@<li[^>]*>(.*?)<@s', ' - $1<', $new_content );
		$new_content = preg_replace( '@<strong[^>]*>(.*?)</strong>@', '*$1*', $new_content );
		$new_content = preg_replace( '@<blockquote[^>]*>.*?<p>(.*?)</p>.*?</blockquote>@s', '> $1', $new_content );
		$new_content = preg_replace( '@<a.*?href="(.*?)"[^>]*>(.*?)</a>@s', '$2 ( $1 )', $new_content );

		// Convert to plain text
		$new_content = wp_specialchars_decode( wp_strip_all_tags( $new_content ), ENT_QUOTES );

		// Remove a lot of the extra new lines
		$new_content = preg_replace( '/n{2,}/', "n\n", $new_content );

		// Get the scalpel out. Makes some assumptions about the existing email format
		$lines = explode( "n", $old_email );
		$lines = array_merge(
			array_slice( $lines, 0, 2 ),          // Email intro
			explode( "n", $new_content ),        // Our content
			$this->get_email_signature( $lines ), // Signature
		);

		// Package it all back up
		return implode( "n", $lines );
	}

	/**
	 * Get the bbPress email signature. Ideally we wouldn't need to mess around like this
	 *
	 * @param string[] $lines Lines of email.
	 * @return string[]
	 */
	private function get_email_signature( $lines ) {
		$found_marker = false;

		// Go backwards through the email so we match on the real signature and not user content
		for ( $pos = count( $lines ) - 1; $pos >= 0; $pos-- ) {
			if ( str_starts_with( $lines[ $pos ], '----------' ) ) {
				$found_marker = true;
			}

			if ( $found_marker && preg_match( '@^.*?: https?://.*$@', $lines[ $pos ], $matches ) > 0 ) {
				// Found the signature marker and the post link
				return array_merge( [ '' ], array_slice( $lines, $pos ) );
			}
		}

		// Something's gone wrong by this point
		return [];
	}

	/**
	 * Toggle the custom post types for Gutenberg
	 *
	 * @param array $args
	 * @return array
	 */
	public function support_gutenberg( $args ) {
		$args['show_in_rest'] = true;
		return $args;
	}

	/**
	 * Action callback for bbp_head. We use this to know when to modify the body class parameters
	 *
	 * @return void
	 */
	public function bbp_head() {
		add_filter( 'body_class', [ $this, 'body_class' ] );
	}

	/**
	 * Make it easier to restrict the CSS to pages where it is expected to run
	 *
	 * @param string[] $classes
	 * @return string[]
	 */
	public function body_class( $classes ) {
		$classes[] = 'gutenberg-support';

		$can_upload = false;
		if ( isset( $this->settings['editor']['hasUploadPermissions'] ) && $this->settings['editor']['hasUploadPermissions'] ) {
			$can_upload = true;
		}

		if ( $can_upload ) {
			$classes[] = 'gutenberg-support-upload';
		}

		return $classes;
	}
}
