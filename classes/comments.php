<?php

class Gutenberg_Comments extends Gutenberg_Handler {
	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'comment_form_after', [ $this, 'add_to_comments' ] );
		add_filter( 'comment_form_defaults', [ $this, 'comment_form_defaults' ] );
		add_filter( 'pre_comment_content', [ $this, 'remove_blocks' ] );

		// Ensure blocks are processed when displaying
		add_filter( 'comment_text', function( $content ) {
			return $this->do_blocks( $content, 'comment_text' );
		}, 8 );
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
		$defaults['comment_field'] .= '<div class="gutenberg-everywhere iso-editor__loading"></div>';

		return $defaults;
	}

	/**
	 * Get the HTML that the editor uses on the page
	 *
	 * @return string
	 */
	public function add_to_comments() {
		$this->load_editor( '#comment', '.gutenberg-everywhere' );
	}
}
