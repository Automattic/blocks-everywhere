<?php

namespace Automattic\Blocks_Everywhere\Handler;

class Comments extends Handler {
	/**
	 * Constructor
	 */
	public function __construct() {
		parent::__construct();

		add_action( 'comment_form_after', [ $this, 'add_to_comments' ] );
		add_filter( 'comment_form_defaults', [ $this, 'comment_form_defaults' ] );
		add_filter( 'pre_comment_content', [ $this, 'remove_blocks' ] );

		// Ensure blocks are processed when displaying
		add_filter(
			'comment_text',
			function( $content ) {
				return $this->do_blocks( $content, 'comment_text' );
			},
			8
		);

		// Add needed tags/attributes to kses allowlist
		add_filter( 'wp_kses_allowed_html', [ $this, 'filter_kses_allowed_html' ], 10, 2 );
	}

	/**
	 * Filter on `wp_kses_allowed_html` -- accepting two arguments so we can only run it on the right contexts.
	 */
	public function filter_kses_allowed_html( $tags, $context ) {
		if ( 'pre_comment_content' === $context ) {
			// Handler::get_kses_for_allowed_blocks() doesn't accept a `$context` arg so we need to run this here.
			$tags = $this->get_kses_for_allowed_blocks( $tags );
		}

		return $tags;
	}

	public function can_show_admin_editor( $hook ) {
		return $hook === 'comment.php';
	}

	public function get_editor_type() {
		return 'comments';
	}

	/**
	 * Add the Gutenberg container to the comment field, and add 'gutenberg-comments' to the class to indicate it is enabled
	 *
	 * @param array $defaults Comment defaults.
	 * @return array
	 */
	public function comment_form_defaults( $defaults ) {
		$defaults['class_container'] .= ' gutenberg-comments';
		$defaults['comment_field'] .= '<div class="blocks-everywhere iso-editor__loading"></div>';

		return $defaults;
	}

	/**
	 * Get the HTML that the editor uses on the page
	 *
	 * @return void
	 */
	public function add_to_comments() {
		$this->load_editor( '#comment', '.blocks-everywhere' );
	}
}
