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
				$content = $GLOBALS['wp_embed']->autoembed( $content );
				return $this->do_blocks( $content, 'bbp_get_forum_content' );
			},
			8
		);
		add_filter(
			'bbp_get_topic_content',
			function( $content ) {
				$content = $GLOBALS['wp_embed']->autoembed( $content );
				return $this->do_blocks( $content, 'bbp_get_topic_content' );
			},
			8
		);
		add_filter(
			'bbp_get_reply_content',
			function( $content ) {
				$content = $GLOBALS['wp_embed']->autoembed( $content );
				return $this->do_blocks( $content, 'bbp_get_reply_content' );
			},
			8
		);
		add_filter(
			'blocks_everywhere_editor_settings',
			function( $settings ) {
				$settings['topicUsers'] = $this->get_topic_users();
				return $settings;
			}
		);

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
			"(?:\s*{$block_syntax}\s*(?:\{.*?\}\s*)?[/]?)" .
			'|' .
			// Closing block
			"(?:\s*[/]{$block_syntax}\s*)" .
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
		$new_content = preg_replace( '/\n{2,}/', "\n\n", $new_content );

		// Get the scalpel out. Makes some assumptions about the existing email format
		$lines = explode( "\n", $old_email );
		$lines = array_merge(
			array_slice( $lines, 0, 2 ),          // Email intro
			explode( "\n", $new_content ),        // Our content
			$this->get_email_signature( $lines ), // Signature
		);

		// Package it all back up
		return implode( "\n", $lines );
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

	/**
	 * Given a $user_id return the data needed for completers
	 *
	 * @param $user_id
	 * @return array
	 */
	private function get_user_data( $user_id, $reply_id ) {
		return [
			'nicename'  => bbp_get_user_nicename( $user_id ),
			'avatarUrl' => apply_filters( 'bbp_get_reply_author_avatar_url', get_avatar_url( $user_id ), $reply_id ),
		];
	}

	/**
	 * Returns all the users involved in the current topic.
	 *
	 * @return array
	 */
	public function get_topic_users( $topic_id = 0 ) {
		if ( ! function_exists( 'get_topic_users' ) ) {
			return [];
		}

		$topic_id = bbp_get_topic_id( $topic_id );
		if ( empty( $topic_id ) ) {
			return [];
		}

		$user_id = bbp_get_topic_author_id( $topic_id );
		$users = [ $user_id ];
		$users_formatted = [ $this->get_user_data( $user_id, $topic_id ) ];

		// Get an array of replies for the topic
		$replies = get_posts(
			[
				'fields'      => 'ids',
				'numberposts' => 100,
				'post_parent' => $topic_id,
				'post_type'   => bbp_get_reply_post_type(),
				'post_status' => bbp_get_public_status_id(),
			]
		);

		// Loop through the replies and get the user IDs
		foreach ( $replies as $reply_id ) {
			$user_id = bbp_get_reply_author_id( $reply_id );
			// Add the user ID to the array if it's not already there
			if ( ! in_array( $user_id, $users ) ) {
				$users[] = $user_id;
				$users_formatted[] = $this->get_user_data( $user_id, $reply_id );
			}
		}

		return $users_formatted;
	}
}
