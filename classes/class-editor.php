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
	 * Whether iframe-canvas inline CSS should be appended to editor_settings['styles']
	 * for the next get_block_editor_settings() call. Set inside get_editor_settings()
	 * so the injection is scoped to BE's own block editor invocation and does not
	 * affect unrelated block editor contexts (e.g. wp-admin post editor).
	 *
	 * @var boolean
	 */
	private $inject_iframe_canvas_styles = false;

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
		// Merge our customization restrictions into the existing theme.json
		// data instead of replacing it. Replacing would clobber font-family
		// definitions that themes register via the same filter to make
		// @font-face declarations land in the editor iframe via
		// wp_print_font_faces() — see WP_Font_Face_Resolver::get_fonts_from_theme_json().
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
				],
			],
		];

		if ( method_exists( $json, 'update_with' ) ) {
			$json->update_with( $data );
			return $json;
		}

		// Fallback for older WP / Gutenberg without update_with().
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
			// Also fire enqueue_block_assets so styles from plugins reach the
			// Gutenberg 22.8+ iframe. enqueue_block_editor_assets only runs on
			// the host page; enqueue_block_assets fires for both host and iframe.
			do_action( 'enqueue_block_assets' );
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
	 * Also injects BE-owned iframe canvas CSS into editor_settings['styles'][]
	 * during BE's own get_editor_settings() invocation. Gutenberg inlines these
	 * entries directly into the iframe srcdoc, which is the canonical iframe
	 * styling API and avoids the iframe-compat clone warning that fires when
	 * host-page <link>/<style> elements target .editor-styles-wrapper/.wp-block
	 * selectors. See classes/class-editor.php::get_editor_settings() for the
	 * flag that scopes the injection to BE's invocation only.
	 *
	 * @param array $settings Settings array.
	 * @return array
	 */
	public function block_editor_settings_all( array $settings ) {
		$settings['availableLegacyWidgets']        = (object) [];
		$settings['hasPermissionsToManageWidgets'] = false;

		if ( $this->inject_iframe_canvas_styles ) {
			$iframe_css = $this->get_iframe_canvas_css();
			if ( $iframe_css !== '' ) {
				if ( ! isset( $settings['styles'] ) || ! is_array( $settings['styles'] ) ) {
					$settings['styles'] = [];
				}
				$settings['styles'][] = [
					'css'            => $iframe_css,
					'__unstableType' => 'plugin',
					'isGlobalStyles' => false,
				];
			}
		}

		return $settings;
	}

	/**
	 * Build the iframe-canvas CSS string injected into editor_settings['styles'][].
	 *
	 * Includes:
	 *   - Embed responsive CSS that must live inside the iframe to size iframed embeds.
	 *   - Editor canvas layout (block list spacing, root container padding, list block bullets).
	 *   - A :root CSS custom property mapping that bridges consumer-defined host theme
	 *     tokens (--text-color, --background-color, --accent, etc.) onto Gutenberg's
	 *     own component tokens (--wp-components-color-*). Host :root variables do NOT
	 *     cascade across document boundaries into the iframe; consumers must re-declare
	 *     them inside the iframe document. The default mapping references the same
	 *     variable names Extra Chill themes ship; consumers with different naming
	 *     should filter the result via 'blocks_everywhere_iframe_inline_css'.
	 *   - In-iframe popover/inserter and modal styles (these can render inside the
	 *     iframe when the inserter is anchored to a block in the canvas).
	 *
	 * .editor-styles-wrapper rules previously in src/styles/theme-compat.scss and
	 * src/styles/bbpress.scss were removed from the host-page stylesheet because
	 * Gutenberg's iframe compat layer clones any host stylesheet matching those
	 * selectors into the iframe AND logs a console warning per clone. The
	 * theme-compat rules (canvas background, code/list spacing) are re-emitted
	 * below so they reach the iframe via the canonical srcdoc path. The bbPress
	 * rules were scoped under host-page ancestors (#bbpress-forums / .bbp-topic-form)
	 * that never appear inside the iframe document, so they were dead-code clones —
	 * they have not been ported here.
	 *
	 * Consumers can extend, replace, or strip the default CSS via the
	 * 'blocks_everywhere_iframe_inline_css' filter; the filter receives the default
	 * string and should return the desired CSS.
	 *
	 * @return string
	 */
	public function get_iframe_canvas_css() {
		$css = '.wp-has-aspect-ratio .wp-block-embed__wrapper{position:relative;}'
			. "\n.wp-has-aspect-ratio .wp-block-embed__wrapper:before{content:\"\";display:block;padding-top:50%;}"
			. "\n.wp-has-aspect-ratio iframe{bottom:0;height:100%;left:0;position:absolute;right:0;top:0;width:100%;}"
			. "\n.wp-embed-aspect-21-9 .wp-block-embed__wrapper:before{padding-top:42.85%;}"
			. "\n.wp-embed-aspect-18-9 .wp-block-embed__wrapper:before{padding-top:50%;}"
			. "\n.wp-embed-aspect-16-9 .wp-block-embed__wrapper:before{padding-top:56.25%;}"
			. "\n.wp-embed-aspect-4-3 .wp-block-embed__wrapper:before{padding-top:75%;}"
			. "\n.wp-embed-aspect-1-1 .wp-block-embed__wrapper:before{padding-top:100%;}"
			. "\n.wp-embed-aspect-9-16 .wp-block-embed__wrapper:before{padding-top:177.77%;}"
			. "\n.wp-embed-aspect-1-2 .wp-block-embed__wrapper:before{padding-top:200%;}"
			// Editor canvas layout styles.
			. "\n.editor-styles-wrapper .block-editor-block-list__layout.is-root-container{padding:var(--spacing-sm);}"
			. "\n.editor-styles-wrapper :where(.wp-block):not(ul > li > ul, li){margin-top:var(--spacing-lg);margin-bottom:var(--spacing-lg);}"
			. "\n.editor-styles-wrapper p{margin:0;}"
			. "\n.editor-styles-wrapper .block-editor-block-list__layout.is-root-container>:first-child{margin-top:0;}"
			. "\n.editor-styles-wrapper p.block-editor-default-block-appender__content{margin:0;}"
			// List block styling (bullets and indentation).
			. "\n.editor-styles-wrapper ul,.editor-styles-wrapper ol{list-style:revert;margin:0.5em 0;padding-left:1.5em;}"
			. "\n.editor-styles-wrapper li{margin-bottom:0.5em;}"
			// Host theme token bridge: re-declare consumer-defined :root vars inside the iframe
			// document so Gutenberg's --wp-components-color-* tokens (used by toolbar, popovers,
			// inputs) resolve to the host palette. Host :root vars do not cross into the iframe
			// document on their own; consumers filter this block via blocks_everywhere_iframe_inline_css.
			. "\n:root{--wp-components-color-foreground:var(--text-color);--wp-components-color-foreground-inverted:var(--background-color);--wp-components-color-background:var(--background-color);--wp-components-color-icon:var(--text-color);--wp-components-color-icon-inverted:var(--background-color);--wp-components-color-accent:var(--accent);--wp-components-color-accent-darker-10:var(--accent-hover);--wp-components-color-accent-darker-20:var(--accent-hover);--wp-components-color-accent-inverted:var(--button-text-color);--wp-admin-theme-color:var(--accent);--wp-admin-theme-color-darker-10:var(--accent-hover);--wp-admin-theme-color-darker-20:var(--accent-hover);--wp-components-color-gray-100:var(--card-background);--wp-components-color-gray-200:var(--border-color);--wp-components-color-gray-300:var(--border-color);--wp-components-color-gray-400:var(--muted-text);--wp-components-color-gray-600:var(--muted-text);--wp-components-color-gray-700:var(--text-color);--wp-components-color-gray-800:var(--text-color);--wp-components-color-gray-900:var(--text-color);--wp-components-color-gray-950:var(--text-color);}"
			// Apply host palette to the canvas root so empty/text areas adopt the host background/foreground.
			// Moved from src/styles/theme-compat.scss (which was being cloned into the iframe
			// via the compat layer + console warning); now reaches the iframe via the canonical srcdoc path.
			. "\n.editor-styles-wrapper{background-color:var(--background-color);color:var(--text-color);}"
			. "\n.editor-styles-wrapper .wp-block code{background-color:var(--card-background);padding-left:5px;padding-right:5px;}"
			. "\n.editor-styles-wrapper ol.wp-block-list{margin-left:10px;}"
			// In-iframe inserter popover/menu styling.
			. "\n.components-popover__content,.block-editor-inserter__menu{background-color:var(--background-color);border:1px solid var(--border-color);color:var(--wp-components-color-foreground);}"
			. "\n.block-editor-inserter__menu .block-editor-block-types-list__item-icon,.block-editor-inserter__menu .block-editor-block-patterns-list__item-icon,.block-editor-inserter__menu svg,.block-editor-inserter__menu svg *{color:var(--wp-components-color-icon);fill:currentColor;}"
			. "\n.block-editor-inserter__menu svg [stroke]:not([stroke=\"none\"]){stroke:currentColor;}"
			. "\n.components-popover.block-editor-inserter__popover.is-quick{color:var(--wp-components-color-foreground);}"
			. "\n.components-popover.block-editor-inserter__popover.is-quick .components-search-control__icon,.components-popover.block-editor-inserter__popover.is-quick .block-editor-inserter__quick-inserter svg,.components-popover.block-editor-inserter__popover.is-quick .block-editor-inserter__quick-inserter svg *,.components-popover.block-editor-inserter__popover.is-quick .block-editor-block-icon,.components-popover.block-editor-inserter__popover.is-quick .block-editor-block-icon.has-colors{color:var(--wp-components-color-icon);fill:currentColor;}"
			. "\n.components-popover.block-editor-inserter__popover.is-quick svg [stroke]:not([stroke=\"none\"]){stroke:currentColor;}"
			// Modal styles.
			. "\n.components-modal__frame{background-color:var(--background-color);border:1px solid var(--border-color);color:var(--text-color);}"
			. "\n.components-modal__header{border-bottom:1px solid var(--border-color);}"
			. "\n.components-modal__frame svg,.components-modal__frame svg *{fill:currentColor;}"
			. "\n.components-modal__frame svg [stroke]:not([stroke=\"none\"]){stroke:currentColor;}";

		/**
		 * Filter the CSS injected into the editor iframe canvas via editor_settings['styles'][].
		 *
		 * Consumers can extend or replace the default token-bridge / canvas CSS. The filter
		 * receives the default CSS string and should return the final string to inject.
		 * Gutenberg inlines this string into the iframe srcdoc <head>, so it does not need
		 * to be scoped to a stylesheet wrapper and does not produce a compat-clone warning.
		 *
		 * @since 2.4.0
		 *
		 * @param string $css Default iframe canvas CSS.
		 */
		return (string) apply_filters( 'blocks_everywhere_iframe_inline_css', $css );
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

		// Iframe-canvas CSS is built lazily in block_editor_settings_all() so it
		// rides the canonical editor_settings['styles'][] path (Gutenberg inlines
		// each entry directly into the iframe srcdoc <head>). The compat-clone
		// path that __unstableResolvedAssets['styles'] used to walk has been
		// removed: it produced a "<id> was added to the iframe incorrectly" warning
		// for every host-page stylesheet whose rules matched .editor-styles-wrapper
		// or .wp-block. See @wordpress/block-editor/src/components/iframe/get-compatibility-styles.js.
		$enqueue_iframe_block_styles = static function() use ( $post ) {
			wp_enqueue_style( 'wp-block-library' );

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

		$block_editor_context = new WP_Block_Editor_Context( [ 'post' => $post ] );

		// Scope the iframe-canvas CSS injection to BE's own get_block_editor_settings() call.
		// block_editor_settings_all fires for every block editor context (wp-admin post editor,
		// widgets, site editor, etc.); without this flag the iframe CSS would leak into them.
		$this->inject_iframe_canvas_styles = true;
		try {
			return get_block_editor_settings( $editor_settings, $block_editor_context );
		} finally {
			$this->inject_iframe_canvas_styles = false;
		}
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
