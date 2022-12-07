<?php

namespace Automattic\Blocks_Everywhere\Handler;

// phpcs:ignore
class bbPress extends Handler {
	/**
	 * Constructor
	 */
	public function __construct() {
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
				return $this->do_blocks( $content, 'bbp_get_forum_content' );
			},
			8
		);
		add_filter(
			'bbp_get_topic_content',
			function( $content ) {
				return $this->do_blocks( $content, 'bbp_get_topic_content' );
			},
			8
		);
		add_filter(
			'bbp_get_reply_content',
			function( $content ) {
				return $this->do_blocks( $content, 'bbp_get_reply_content' );
			},
			8
		);

		// Apply block processing to email notifications
		$default_email = defined( 'BLOCKS_EVERYWHERE_EMAIL' ) ? BLOCKS_EVERYWHERE_EMAIL : false;
		if ( apply_filters( 'blocks_everywhere_email', $default_email ) ) {
			add_filter( 'bbp_subscription_mail_message', [ $this, 'remove_blocks_from_email' ], 10, 2 );
		}
	}

	/**
	 * Loads the editor, if needed, after we know what kind of page to display
	 *
	 * @return void
	 */
	public function bbp_template_redirect() {
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
		if ( bbp_is_reply_edit() ) {
			$reply = bbp_get_reply( bbp_get_reply_id() );

			if ( $reply ) {
				return has_blocks( $reply->post_content );
			}
		}

		if ( bbp_is_topic_edit() ) {
			$topic = get_post_field( 'post_content', bbp_get_topic_id() );

			return has_blocks( $topic );
		}

		return false;
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
		foreach (
			[
				'bbp_new_topic_pre_content',
				'bbp_edit_topic_pre_content',
				'bbp_new_reply_pre_content',
				'bbp_edit_reply_pre_content',
			] as $filter
		) {
			// just after bbp_encode_bad() would have run (if it ran)
			add_filter( $filter, [ $this, 'allow_comments_in_bbp_encode_bad' ], 11 );
		}

		// Add the requisite tags for blocks
		add_filter( 'bbp_kses_allowed_tags', [ $this, 'get_kses_for_allowed_blocks' ] );
	}

	/**
	 * Replace encoded block markup with a decoded version
	 *
	 * @param string $content Content.
	 * @return string
	 */
	public function allow_comments_in_bbp_encode_bad( $content ) {
		$filter = current_filter();

		// If not hooked, we have no need to alter anything.
		if ( ! has_filter( $filter, 'bbp_encode_bad' ) ) {
			return $content;
		}

		// HTML comments have been escaped, we want to re-enable them.
		$content = preg_replace( '~&lt;!--\s*(.+?):(.+?)\s*--&gt;~i', '<!-- $1:$2 -->', $content );

		return $content;
	}

	/**
	 * Remove blocks from email content, converting it markdown-lite
	 *
	 * @param string  $content Email content.
	 * @param integer $reply_id Reply ID.
	 * @return string
	 */
	public function remove_blocks_from_email( $content, $reply_id ) {
		// Get a decoded version of the content
		$reply = wp_specialchars_decode( bbp_get_reply_content( $reply_id ) );

		// Process blocks
		$reply = $this->do_blocks( $reply, 'bbp_get_reply_content' );

		// Do a bit of markdown-lite
		$reply = preg_replace( '@<li>(.*?)</li>@', '<li>  - $1</li>', $reply );
		$reply = preg_replace( '@<strong>(.*?)</strong>@', '*$1*', $reply );
		$reply = preg_replace( '@<blockquote>.*?<p>(.*?)</p>.*?</blockquote>@s', '> $1', $reply );

		// Remove a lot of the extra new lines
		$reply = preg_replace( '/\n{2,}/', "\n\n", $reply );

		// Convert to plain text
		$reply = wp_specialchars_decode( wp_strip_all_tags( $reply ), ENT_QUOTES );

		// Replace the original message
		return preg_replace( '@<!--.*-->@s', trim( $reply ), $content );
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
