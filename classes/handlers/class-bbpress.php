<?php

namespace Automattic\Blocks_Everywhere\Handler;

// phpcs:ignore
class bbPress extends Handler {
	/**
	 * Constructor
	 */
	public function __construct() {
		if ( ! is_admin() ) {
			add_filter( 'the_editor', [ $this, 'the_editor' ] );
			add_filter( 'wp_editor_settings', [ $this, 'wp_editor_settings' ], 10, 2 );
		}

		add_filter( 'bbp_get_the_content', [ $this, 'add_to_bbpress' ] );

		// Ensure blocks are processed when displaying
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

		$default_email = defined( 'BLOCKS_EVERYWHERE_EMAIL' ) ? BLOCKS_EVERYWHERE_EMAIL : false;
		if ( apply_filters( 'blocks_everywhere_email', $default_email ) ) {
			add_filter( 'bbp_subscription_mail_message', [ $this, 'remove_blocks_from_email' ], 10, 2 );
		}

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

		add_action( 'bbp_head', [ $this, 'bbp_head' ] );
	}

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
		$reply = wp_specialchars_decode( strip_tags( $reply ), ENT_QUOTES );

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
	 * Determine whether to load Gutenberg in this forum and then do that.
	 *
	 * @param string $content Content.
	 * @return string Content/
	 */
	public function add_to_bbpress( $content ) {
		$this->load_editor( '.bbp-the-content', '.blocks-everywhere' );
		return $content;
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
		return $classes;
	}
}
