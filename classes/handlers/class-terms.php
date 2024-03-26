<?php

namespace Automattic\Blocks_Everywhere\Handler;

class Terms extends Handler {
	/**
	 * Constructor
	 */
	public function __construct() {
		parent::__construct();

		/* Only users with the "publish_posts" capability can use this feature */
		if ( current_user_can( 'publish_posts' ) ) {

			/* Remove the filters which disallow HTML in term descriptions */
			remove_filter( 'pre_term_description', 'wp_filter_kses' );
			remove_filter( 'term_description', 'wp_kses_data' );

			/* Add filters to disallow unsafe HTML tags */
			if ( ! current_user_can( 'unfiltered_html' ) ) {
				add_filter( 'pre_term_description', 'wp_kses_post' );
				add_filter( 'term_description', 'wp_kses_post' );
			}
		}

		add_filter( 'pre_term_description', [ $this, 'remove_blocks' ] );

		/* Loop through the taxonomies, adding actions */
		$taxonomies = get_taxonomies( [
			'show_ui' => true,
			'public' => true,
		] );
		foreach ( $taxonomies as $taxonomy ) {
			add_action( $taxonomy . '_edit_form_fields', [ $this, 'add_to_terms_edit' ], 1, 2 );
			add_action( $taxonomy . '_add_form_fields', [ $this, 'add_to_terms_add' ], 1, 1 );
		}

		// Ensure blocks are processed when displaying
		add_filter(
			'term_description',
			function( $content ) {
				return $this->do_blocks( $content, 'term_description' );
			},
			8
		);
	}

	public function can_show_admin_editor( $hook ) {
		return $hook === 'term.php';
	}

	public function get_editor_type() {
		return 'core';
	}

	/**
	 * Get the HTML that the editor uses on the page
	 *
	 * @return void
	 */
	public function add_to_terms_edit() {
		$this->load_editor( '#description' );
	}

	/**
	 * Get the HTML that the editor uses on the page
	 *
	 * @return void
	 */
	public function add_to_terms_add() {
		$this->load_editor( '#tag-description' );
	}

	public function wp_editor_settings( $settings ) {
		$settings['tinymce'] = true;
		$settings['quicktags'] = true;
		return $settings;
	}
}
