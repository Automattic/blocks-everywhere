<?php

namespace Automattic\Blocks_Everywhere\Handler;
use WP_Block_Type;
use WP_Block_Type_Registry;

class Terms extends Handler {
	/**
	 * Constructor
	 */

	private $enabled_blocks;

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

			add_action( 'current_screen', function() {

				$this->enabled_blocks = array_values( array_map( function( $block ) {
					return $block->name;
				}, WP_Block_Type_Registry::get_instance()->get_all_registered() ) );

				$this->enabled_blocks[] = 'blocks-everywhere/support-content';

				/* Loop through the taxonomies, adding actions */
				$taxonomies = get_taxonomies( [
					'show_ui' => true,
					'public' => true,
				] );
				foreach ( $taxonomies as $taxonomy ) {
					add_action( $taxonomy . '_edit_form_fields', [ $this, 'add_to_terms_edit' ], 1, 2 );
					add_action( $taxonomy . '_add_form_fields', [ $this, 'add_to_terms_add' ], 1, 1 );
				}
			} );

		}

		add_filter( 'pre_term_description', [ $this, 'remove_blocks' ] );

		// Ensure blocks are processed when displaying
		add_filter(
			'term_description',
			function( $content ) {
				return $this->do_blocks( $content, 'term_description' );
			},
			8
		);

		add_filter( 'blocks_everywhere_editor_settings', [ $this, 'settings' ], 1, 1 );
		add_filter( 'blocks_everywhere_allowed_blocks', [ $this, 'allowed_blocks' ], 1, 1 );

		add_filter( 'body_class', [ $this, 'body_class' ] );

	}

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

	public function can_show_admin_editor( $hook ) {
		return false; //$hook === 'term.php';
	}

	public function get_editor_type() {
		return 'core';
	}

	public function allowed_blocks( $blocks ) {
		return $this->enabled_blocks;
	}

	public function settings( $settings ) {

		$settings['iso']['moreMenu'] = array(
			'editor' => true,
			'fullscreen' => true,
			'preview' => true,
			'topToolbar' => true
		);

		$settings['iso']['sidebar'] = array(
			'inserter'  => false,
			'inspector' => false
		);

		$settings['editor']['hasUploadPermissions'] = true;
		$settings['editor']['reusableBlocks'] = true;


		return $settings;
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
		$settings['tinymce'] = false;
		$settings['quicktags'] = true;
		return $settings;
	}
}