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
			'bbp_get_reply_content',
			function( $content ) {
				return $this->do_blocks( $content, 'bbp_get_reply_content' );
			},
			8
		);

		// Besides Gutenberg, it is also required to embed topic via support-content-block
		add_filter( 'bbp_register_topic_post_type', [ $this, 'support_gutenberg' ] );
		add_filter( 'bbp_register_reply_post_type', [ $this, 'support_gutenberg' ] );
		add_filter( 'bbp_register_forum_post_type', [ $this, 'support_gutenberg' ] );
		add_action( 'bbp_head', [ $this, 'bbp_head' ] );
	}

	public function support_gutenberg( $args ) {
		$args['show_in_rest'] = true;
		return $args;
	}

	public function add_to_bbpress( $content ) {
		$this->load_editor( '.bbp-the-content', '.blocks-everywhere' );
		return $content;
	}

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
