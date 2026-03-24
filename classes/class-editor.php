<?php

namespace Automattic\Blocks_Everywhere;

use WP_Block_Editor_Context;
use WP_Theme_JSON_Data;
use WP_Theme_JSON_Data_Gutenberg;

/**
 * Provides functions to load Gutenberg assets.
 */
class Editor {
	/**
	 * Can upload?
	 *
	 * @var boolean
	 */
	private $can_upload = false;

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'template_redirect', [ $this, 'setup_media' ] );
		add_filter( 'block_editor_settings_all', [ $this, 'block_editor_settings_all' ] );
		add_filter( 'should_load_block_editor_scripts_and_styles', '__return_true' );
		add_filter( 'wp_theme_json_data_theme', [ $this, 'wp_theme_json_data_theme' ] );
	}

	/**
	 * Provide theme.json.
	 *
	 * @param WP_Theme_JSON_Data|WP_Theme_JSON_Data_Gutenberg $json JSON.
	 * @return WP_Theme_JSON_Data|WP_Theme_JSON_Data_Gutenberg
	 */
	public function wp_theme_json_data_theme( $json ) {
		$data = [
			'version'  => 2,
			'settings' => [
				'color'      => [
					'background'      => false,
					'custom'          => false,
					'customDuotone'   => false,
					'customGradient'  => false,
					'defaultGradients' => false,
					'defaultPalette'  => false,
					'text'            => false,
				],
				'typography' => [
					'customFontSize'  => false,
					'dropCap'         => false,
					'fontStyle'       => false,
					'fontWeight'      => false,
					'letterSpacing'   => false,
					'lineHeight'      => false,
					'textDecoration'  => false,
					'textTransform'   => false,
					'fontSizes'       => [],
					'fontFamilies'    => [],
				],
			],
		];

		if ( class_exists( 'WP_Theme_JSON_Data_Gutenberg' ) ) {
			return new WP_Theme_JSON_Data_Gutenberg( $data );
		}

		return new WP_Theme_JSON_Data( $data );
	}

	/**
	 * Restrict TinyMCE to the basics.
	 *
	 * @param array $settings TinyMCE settings.
	 * @return array
	 */
	public function tiny_mce_before_init( $settings ) {
		$settings['toolbar1'] = 'bold,italic,bullist,numlist,blockquote,pastetext,removeformat,undo,redo';
		$settings['toolbar2'] = '';

		return $settings;
	}

	/**
	 * Load Gutenberg.
	 *
	 * Based on wp-admin/edit-form-blocks.php
	 *
	 * @param array $settings Plugin settings.
	 * @return void
	 */
	public function load( $settings ) {
		global $post;

		$this->can_upload = isset( $settings['editor']['hasUploadPermissions'] ) && $settings['editor']['hasUploadPermissions'];
		$this->load_extra_blocks();

		add_filter(
			'jetpack_blocks_variation',
			function() {
				return 'no-post-editor';
			}
		);

		if ( ! defined( '__EXPERIMENTAL_DYNAMIC_LOAD' ) ) {
			// Enqueue block editor scripts that are required dependencies.
			// These are normally only loaded in the admin block editor context.
			wp_enqueue_script( 'lodash' );
			wp_enqueue_script( 'wp-block-library' );
			wp_enqueue_script( 'wp-format-library' );
			wp_enqueue_script( 'wp-editor' );
			wp_enqueue_script( 'wp-plugins' );
			wp_enqueue_script( 'wp-media-utils' );
			wp_enqueue_script( 'wp-viewport' );
			wp_enqueue_script( 'wp-admin-ui' );

			do_action( 'enqueue_block_editor_assets' );
		}

		$should_inline_styles = apply_filters( 'blocks_everywhere_should_enqueue_styles', true );

		if ( $should_inline_styles ) {
			// Core block styles needed for correct frontend rendering inside the iframe
			// (notably responsive embeds).
			wp_enqueue_style( 'wp-block-library' );
			wp_enqueue_style( 'wp-block-library-theme' );

			wp_enqueue_style( 'wp-edit-post' );
			wp_enqueue_style( 'wp-format-library' );

			set_current_screen( 'front' );
			wp_styles()->done = [ 'wp-reset-editor-styles' ];
		}

		$this->setup_rest_api();

		$block_editor_context = new WP_Block_Editor_Context( [ 'post' => $post ] );
		$categories           = wp_json_encode( get_block_categories( $block_editor_context ) );

		if ( $categories !== false ) {
			wp_add_inline_script(
				'wp-blocks',
				sprintf( 'wp.blocks.setCategories( %s );', $categories ),
				'after'
			);
		}

		/**
		 * @psalm-suppress PossiblyFalseOperand
		 */
		wp_add_inline_script(
			'wp-blocks',
			'if ( typeof wp.blocks.unstable__bootstrapServerSideBlockDefinitions === "function" ) { wp.blocks.unstable__bootstrapServerSideBlockDefinitions(' . wp_json_encode( get_block_editor_server_block_settings() ) . '); }',
			'after'
		);

		$this->setup_media();
	}

	/**
	 * Load any third-party blocks.
	 *
	 * @return void
	 */
	private function load_extra_blocks() {
		// phpcs:ignore
		$GLOBALS['hook_suffix'] = '';

		/**
		 * @psalm-suppress MissingFile
		 */
		require_once ABSPATH . 'wp-admin/includes/class-wp-screen.php';
		/**
		 * @psalm-suppress MissingFile
		 */
		require_once ABSPATH . 'wp-admin/includes/screen.php';
		/**
		 * @psalm-suppress MissingFile
		 */
		require_once ABSPATH . 'wp-admin/includes/post.php';

		set_current_screen();

		$current_screen = get_current_screen();
		if ( $current_screen ) {
			$current_screen->is_block_editor( true );
		}
	}

	/**
	 * Override some features that probably don't make sense in an isolated editor.
	 *
	 * @param array $settings Settings array.
	 * @return array
	 */
	public function block_editor_settings_all( array $settings ) {
		$settings['availableLegacyWidgets']        = (object) [];
		$settings['hasPermissionsToManageWidgets'] = false;

		return $settings;
	}

	/**
	 * Set up Gutenberg editor settings.
	 *
	 * @return array
	 */
	public function get_editor_settings() {
		global $post;

		$supports_layout = false;
		if ( function_exists( 'wp_theme_has_theme_json' ) ) {
			$supports_layout = wp_theme_has_theme_json();
		}

		// phpcs:ignore
		$body_placeholder = apply_filters( 'write_your_story', null, $post );

		$editor_settings = [
			'availableTemplates'                   => [],
			'disablePostFormats'                   => ! current_theme_supports( 'post-formats' ),
			// phpcs:ignore
			'titlePlaceholder'                     => apply_filters( 'enter_title_here', __( 'Add title', 'blocks-everywhere' ), $post ),
			'bodyPlaceholder'                      => $body_placeholder,
			'autosaveInterval'                     => AUTOSAVE_INTERVAL,
			'styles'                               => get_block_editor_theme_styles(),
			'richEditingEnabled'                   => user_can_richedit(),
			'postLock'                             => false,
			'supportsLayout'                       => $supports_layout,
			'hasFixedToolbar'                      => true,
			'hasInlineToolbar'                     => false,
			'__experimentalBlockPatterns'          => [],
			'__experimentalBlockPatternCategories' => [],
			'supportsTemplateMode'                 => current_theme_supports( 'block-templates' ),
			'enableCustomFields'                   => false,
			'generateAnchors'                      => true,
			'canLockBlocks'                        => false,
			'themeSupports'                        => [
				'responsive-embeds' => current_theme_supports( 'responsive-embeds' ),
			],
		];

		// Iframe editor styles - these are injected into the iframe document.
		// Embed responsive CSS and editor canvas styles that must live inside the iframe.
		$iframe_editor_css = '.wp-has-aspect-ratio .wp-block-embed__wrapper{position:relative;}'
			. "\n.wp-has-aspect-ratio .wp-block-embed__wrapper:before{content:\"\";display:block;padding-top:50%;}"
			. "\n.wp-has-aspect-ratio iframe{bottom:0;height:100%;left:0;position:absolute;right:0;top:0;width:100%;}"
			. "\n.wp-embed-aspect-21-9 .wp-block-embed__wrapper:before{padding-top:42.85%;}"
			. "\n.wp-embed-aspect-18-9 .wp-block-embed__wrapper:before{padding-top:50%;}"
			. "\n.wp-embed-aspect-16-9 .wp-block-embed__wrapper:before{padding-top:56.25%;}"
			. "\n.wp-embed-aspect-4-3 .wp-block-embed__wrapper:before{padding-top:75%;}"
			. "\n.wp-embed-aspect-1-1 .wp-block-embed__wrapper:before{padding-top:100%;}"
			. "\n.wp-embed-aspect-9-16 .wp-block-embed__wrapper:before{padding-top:177.77%;}"
			. "\n.wp-embed-aspect-1-2 .wp-block-embed__wrapper:before{padding-top:200%;}"
			// Editor canvas layout styles
			. "\n.editor-styles-wrapper .block-editor-block-list__layout.is-root-container{padding:var(--spacing-sm);}"
			. "\n.editor-styles-wrapper :where(.wp-block):not(ul > li > ul, li){margin-top:var(--spacing-lg);margin-bottom:var(--spacing-lg);}"
			. "\n.editor-styles-wrapper p{margin:0;}"
			. "\n.editor-styles-wrapper .block-editor-block-list__layout.is-root-container>:first-child{margin-top:0;}"
			. "\n.editor-styles-wrapper p.block-editor-default-block-appender__content{margin:0;}"
			// List block styling (bullets and indentation)
			. "\n.editor-styles-wrapper ul,.editor-styles-wrapper ol{list-style:revert;margin:0.5em 0;padding-left:1.5em;}"
			. "\n.editor-styles-wrapper li{margin-bottom:0.5em;}"
			// In-iframe inserter popover/menu styling
			. "\n:root{--wp-components-color-foreground:var(--text-color);--wp-components-color-foreground-inverted:var(--background-color);--wp-components-color-background:var(--background-color);--wp-components-color-icon:var(--text-color);--wp-components-color-icon-inverted:var(--background-color);--wp-components-color-accent:var(--accent);--wp-components-color-accent-darker-10:var(--accent-hover);--wp-components-color-accent-darker-20:var(--accent-hover);--wp-components-color-accent-inverted:var(--button-text-color);--wp-admin-theme-color:var(--accent);--wp-admin-theme-color-darker-10:var(--accent-hover);--wp-admin-theme-color-darker-20:var(--accent-hover);--wp-components-color-gray-100:var(--card-background);--wp-components-color-gray-200:var(--border-color);--wp-components-color-gray-300:var(--border-color);--wp-components-color-gray-400:var(--muted-text);--wp-components-color-gray-600:var(--muted-text);--wp-components-color-gray-700:var(--text-color);--wp-components-color-gray-800:var(--text-color);--wp-components-color-gray-900:var(--text-color);--wp-components-color-gray-950:var(--text-color);}"
			. "\n.components-popover__content,.block-editor-inserter__menu{background-color:var(--background-color);border:1px solid var(--border-color);color:var(--wp-components-color-foreground);}"
			. "\n.block-editor-inserter__menu .block-editor-block-types-list__item-icon,.block-editor-inserter__menu .block-editor-block-patterns-list__item-icon,.block-editor-inserter__menu svg,.block-editor-inserter__menu svg *{color:var(--wp-components-color-icon);fill:currentColor;}"
			. "\n.block-editor-inserter__menu svg [stroke]:not([stroke=\"none\"]){stroke:currentColor;}"
			. "\n.components-popover.block-editor-inserter__popover.is-quick{color:var(--wp-components-color-foreground);}"
			. "\n.components-popover.block-editor-inserter__popover.is-quick .components-search-control__icon,.components-popover.block-editor-inserter__popover.is-quick .block-editor-inserter__quick-inserter svg,.components-popover.block-editor-inserter__popover.is-quick .block-editor-inserter__quick-inserter svg *,.components-popover.block-editor-inserter__popover.is-quick .block-editor-block-icon,.components-popover.block-editor-inserter__popover.is-quick .block-editor-block-icon.has-colors{color:var(--wp-components-color-icon);fill:currentColor;}"
			. "\n.components-popover.block-editor-inserter__popover.is-quick svg [stroke]:not([stroke=\"none\"]){stroke:currentColor;}"
			// Modal styles
			. "\n.components-modal__frame{background-color:var(--background-color);border:1px solid var(--border-color);color:var(--text-color);}"
			. "\n.components-modal__header{border-bottom:1px solid var(--border-color);}"
			. "\n.components-modal__frame svg,n.components-modal__frame svg *{fill:currentColor;}"
			. "\n.components-modal__frame svg [stroke]:not([stroke=\"none\"]){stroke:currentColor;}"
;

		$enqueue_iframe_block_styles = static function() use ( $iframe_editor_css, $post ) {
			wp_enqueue_style( 'wp-block-library' );
			wp_add_inline_style( 'wp-block-library', $iframe_editor_css );

			if ( current_theme_supports( 'wp-block-styles' ) ) {
				wp_enqueue_style( 'wp-block-library-theme' );
			}

			if ( function_exists( 'wp_enqueue_global_styles' ) ) {
				wp_enqueue_global_styles();
			}

			if ( ! wp_style_is( 'blocks-everywhere', 'registered' ) ) {
				$asset_file = dirname( __DIR__ ) . '/build/index.min.asset.php';
				$asset      = file_exists( $asset_file ) ? require $asset_file : null;
				$version    = isset( $asset['version'] ) ? $asset['version'] : time();
				$plugin     = dirname( __DIR__ ) . '/blocks-everywhere.php';

				wp_register_style( 'blocks-everywhere', plugins_url( 'build/style-index.min.css', $plugin ), [], $version );
			}

			wp_enqueue_style( 'blocks-everywhere' );

			if ( function_exists( 'wp_enqueue_classic_theme_styles' ) ) {
				wp_enqueue_classic_theme_styles();
			}

			do_action( 'blocks_everywhere_enqueue_iframe_assets', $post );
		};

		add_action( 'enqueue_block_assets', $enqueue_iframe_block_styles, 0 );

		try {
			if ( function_exists( '_wp_get_iframed_editor_assets' ) ) {
				$editor_settings['__unstableResolvedAssets'] = _wp_get_iframed_editor_assets();
			} else {
				$editor_settings['__unstableResolvedAssets'] = $this->wp_get_iframed_editor_assets();
			}
		} finally {
			remove_action( 'enqueue_block_assets', $enqueue_iframe_block_styles, 0 );
		}

		if (
			isset( $editor_settings['__unstableResolvedAssets'] )
			&& is_array( $editor_settings['__unstableResolvedAssets'] )
			&& isset( $editor_settings['__unstableResolvedAssets']['styles'] )
			&& is_string( $editor_settings['__unstableResolvedAssets']['styles'] )
		) {
			$editor_settings['__unstableResolvedAssets']['styles'] .= "\n<style id='blocks-everywhere-iframe-styles'>\n"
				. $iframe_editor_css
				. "\n</style>\n";
		}

		$block_editor_context = new WP_Block_Editor_Context( [ 'post' => $post ] );
		return get_block_editor_settings( $editor_settings, $block_editor_context );
	}

	/**
	 * Set up the Gutenberg REST API and preloaded data.
	 *
	 * @return void
	 */
	public function setup_rest_api() {
		global $post;

		$post_type = 'post';

		$preload_paths = [
			'/',
			'/wp/v2/types?context=edit',
			'/wp/v2/taxonomies?per_page=-1&context=edit',
			'/wp/v2/themes?status=active',
			sprintf( '/wp/v2/types/%s?context=edit', $post_type ),
			sprintf( '/wp/v2/users/me?post_type=%s&context=edit', $post_type ),
			[ '/wp/v2/media', 'OPTIONS' ],
			[ '/wp/v2/blocks', 'OPTIONS' ],
		];

		/**
		 * @psalm-suppress TooManyArguments
		 */
		$preload_paths = apply_filters( 'block_editor_preload_paths', $preload_paths, $post );
		$preload_data  = array_reduce( $preload_paths, 'rest_preload_api_request', [] );

		$encoded = wp_json_encode( $preload_data );
		if ( $encoded !== false ) {
			wp_add_inline_script(
				'wp-editor',
				sprintf( 'wp.apiFetch.use( wp.apiFetch.createPreloadingMiddleware( %s ) );', $encoded ),
				'after'
			);
		}
	}

	/**
	 * Ensure media works in Gutenberg.
	 *
	 * @return void
	 */
	public function setup_media() {
		if ( ! $this->can_upload ) {
			return;
		}

		if ( did_action( 'wp_enqueue_media' ) > 0 ) {
			return;
		}

		/**
		 * @psalm-suppress MissingFile
		 */
		require_once ABSPATH . 'wp-admin/includes/media.php';

		wp_enqueue_media();
	}

	/**
	 * Fallback iframe asset resolver for older WordPress.
	 *
	 * @return array{styles:string,scripts:string}
	 */
	public function wp_get_iframed_editor_assets() {
		$script_handles = [];
		$style_handles  = [
			'wp-block-editor',
			'wp-block-library',
			'wp-edit-blocks',
		];

		if ( current_theme_supports( 'wp-block-styles' ) ) {
			$style_handles[] = 'wp-block-library-theme';
		}

		$block_registry = WP_Block_Type_Registry::get_instance();
		foreach ( $block_registry->get_all_registered() as $block_type ) {
			if ( ! empty( $block_type->style ) ) {
				$style_handles = array_merge( $style_handles, (array) $block_type->style );
			}

			if ( ! empty( $block_type->editor_style ) ) {
				$style_handles = array_merge( $style_handles, (array) $block_type->editor_style );
			}

			if ( ! empty( $block_type->script ) ) {
				$script_handles = array_merge( $script_handles, (array) $block_type->script );
			}

			if ( ! empty( $block_type->view_script ) ) {
				$script_handles = array_merge( $script_handles, (array) $block_type->view_script );
			}
		}

		$style_handles = apply_filters( 'blocks_everywhere_editor_styles', $style_handles );
		$style_handles = array_unique( $style_handles );
		$done          = wp_styles()->done;

		ob_start();

		// We do not need reset styles for the iframed editor.
		wp_styles()->done = [ 'wp-reset-editor-styles' ];
		wp_styles()->do_items( $style_handles );
		wp_styles()->done = $done;

		$styles = ob_get_clean();

		$script_handles = array_unique( apply_filters( 'blocks_everywhere_editor_scripts', $script_handles ) );
		$done           = wp_scripts()->done;

		ob_start();

		wp_scripts()->done = [];
		wp_scripts()->do_items( $script_handles );
		wp_scripts()->done = $done;

		$scripts = ob_get_clean();

		return [
			'styles'  => $styles,
			'scripts' => $scripts,
		];
	}
}
