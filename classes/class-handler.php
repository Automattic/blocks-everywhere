<?php

namespace Automattic\Blocks_Everywhere\Handler;

use Automattic\Blocks_Everywhere\Editor;

abstract class Handler {
	/**
	 * Editor object
	 *
	 * @var Editor|null
	 */
	protected $editor = null;

	/**
	 * Editor settings
	 *
	 * @var array
	 */
	protected $settings = [];

	/**
	 * Record the do_blocks hook
	 *
	 * @var string|null
	 */
	private $doing_hook = null;

	/**
	 * Whether the assets have been registered already.
	 */
	public static $registered_assets = false;

	/**
	 * The `Blocks_Everywhere::load_handlers()` method that would instantiate, and thereby invoke this, runs on init.
	 */
	public function __construct() {
		// We only need to run this once, no matter how many child classes are instantiated, so let's stash it in a static.
		if ( ! self::$registered_assets ) {
			$this->register_assets(
				'blocks-everywhere',
				'index.min.asset.php',
				'index.min.js',
				'style-index.min.css'
			);
			$this->register_assets(
				'support-content-editor',
				'support-content-editor.min.asset.php',
				'support-content-editor.min.js',
				'support-content-editor.min.css'
			);
			$this->register_assets(
				'support-content-view',
				'support-content-view.min.asset.php',
				'support-content-view.min.js',
				'support-content-view.min.css'
			);
			self::$registered_assets = true;
		}
	}

	/**
	 * Direct copy of core `do_blocks`, but for comments.
	 *
	 * This also has the benefit that we don't run `wpautop` on block transformed comments, potentially breaking them.
	 *
	 * @param String $content Comment text
	 * @return String
	 */
	public function do_blocks( $content, $hook ) {
		$blocks = parse_blocks( $content );
		$output = '';

		foreach ( $blocks as $block ) {
			$output .= render_block( $block );
		}

		// If there are blocks in this content, we shouldn't run wpautop() on it later.
		$priority = has_filter( $hook, 'wpautop' );
		if ( false !== $priority && doing_filter( $hook ) && has_blocks( $content ) ) {
			$this->doing_hook = $hook;
			remove_filter( $hook, 'wpautop', $priority );
			add_filter( $hook, [ $this, 'restore_wpautop_hook' ], $priority + 1 );
		}

		return ltrim( $output );
	}

	/**
	 * Restore the above `remove_filter` for comments
	 *
	 * @param String $content Comment ext
	 * @return String
	 **/
	public function restore_wpautop_hook( $content ) {
		$current_priority = has_filter( $this->doing_hook, [ $this, 'restore_wpautop_hook' ] );

		if ( $current_priority !== false ) {
			add_filter( $this->doing_hook, 'wpautop', $current_priority - 1 );
			remove_filter( $this->doing_hook, [ $this, 'restore_wpautop_hook' ], $current_priority );
		}

		$this->doing_hook = null;
		return $content;
	}

	/**
	 * Add the Gutenberg editor to the comment editor, but only if it includes blocks.
	 *
	 * @param string $editor Editor HTML.
	 * @return string
	 */
	public function the_editor( $editor ) {
		$editor = preg_replace( '@.*?(<textarea.*?</textarea>).*@', '$1', $editor );

		return '<div class="blocks-everywhere iso-editor__loading wp-exclude-emoji">' . $editor . '</div>';
	}

	public function wp_editor_settings( $settings ) {
		$settings['tinymce'] = false;
		$settings['quicktags'] = false;
		return $settings;
	}

	public function get_editor_type() {
		return 'core';
	}

	/**
	 * Remove blocks that aren't allowed
	 *
	 * @param string $content
	 * @return string
	 */
	public function remove_blocks( $content ) {
		if ( ! has_blocks( $content ) ) {
			return $content;
		}

		$allowed = $this->get_allowed_blocks();
		$blocks = parse_blocks( $content );
		$output = '';

		foreach ( $blocks as $block ) {
			if ( in_array( $block['blockName'], $allowed, true ) ) {
				$output .= serialize_block( $block );
			}
		}

		return ltrim( $output );
	}

	/**
	 * Get a list of allowed blocks by looking at the allowed comment tags
	 *
	 * @return string[]
	 */
	protected function get_allowed_blocks() {
		global $allowedtags;

		$allowed = [ 'core/paragraph', 'core/list', 'core/code', 'core/list-item' ];
		$convert = [
			'blockquote' => 'core/quote',
			'h1' => 'core/heading',
			'h2' => 'core/heading',
			'h3' => 'core/heading',
			'img' => 'core/image',
			'ul' => 'core/list',
			'ol' => 'core/list',
			'pre' => 'core/code',
			'table' => 'core/table',
			'video' => 'core/video',
		];

		foreach ( array_keys( $allowedtags ) as $tag ) {
			if ( isset( $convert[ $tag ] ) ) {
				$allowed[] = $convert[ $tag ];
			}
		}

		return apply_filters( 'blocks_everywhere_allowed_blocks', array_unique( $allowed ), $this->get_editor_type() );
	}

	/**
	 * Modify KSES filters to match the allowed blocks
	 *
	 * @param array $tags
	 * @return array
	 */
	public function get_kses_for_allowed_blocks( array $tags ) {
		$allowed = $this->get_allowed_blocks();

		if ( in_array( 'core/paragraph', $allowed, true ) ) {
			$tags['p'] = [ 'class' => true ];
			$tags['br'] = [];
		}

		if ( in_array( 'core/code', $allowed, true ) ) {
			if ( ! isset( $tags['pre'] ) ) {
				$tags['pre'] = [];
			}

			$tags['pre']['class'] = true;
		}

		if ( in_array( 'core/quote', $allowed, true ) ) {
			if ( ! isset( $tags['blockquote'] ) ) {
				$tags['blockquote'] = [];
			}

			$tags['blockquote']['class'] = true;
		}

		if ( in_array( 'core/image', $allowed, true ) ) {
			// If `img` already exists, merge its arguments in. Otherwise create it.
			$tags['img'] = wp_parse_args(
				array(
					'alt'      => true,
					'height'   => true,
					'src'      => true,
					'width'    => true,
					'class'    => true,
				),
				$tags['img'] ?? []
			);
		}

		if ( in_array( 'core/image', $allowed, true ) || in_array( 'core/quote', $allowed, true ) ) {
			$tags['figure'] = [ 'class' => true ];
			$tags['figcaption'] = [ 'class' => true ];
		}

		if ( in_array( 'core/embed', $allowed, true ) ) {
			if ( ! isset( $tags['figure'] ) ) {
				$tags['figure'] = [];
			}

			$tags['figure']['class'] = true;
			$tags['div'] = [ 'class' => true ];
		}

		if ( in_array( 'core/list', $allowed, true ) ) {
			if ( ! isset( $tags['ul'] ) ) {
				$tags['ul'] = [];
			}
			if ( ! isset( $tags['ol'] ) ) {
				$tags['ol'] = [];
			}
			if ( ! isset( $tags['li'] ) ) {
				$tags['li'] = [];
			}

			$tags['ul']['class'] = true;
			$tags['ol']['class'] = true;
			$tags['li']['class'] = true;
		}

		// General formatting
		$tags['strike'] = [];
		$tags['s'] = [];
		$tags['cite'] = [];
		$tags['kbd'] = [];
		$tags['mark'] = [ 'class' => true ];
		$tags['sub'] = [];
		$tags['sup'] = [];

		return $tags;
	}

	/**
	 * Load any view assets
	 *
	 * @return void
	 */
	protected function load_view_assets() {
		$settings = apply_filters( 'blocks_everywhere_editor_settings', $this->get_default_settings() );

		if ( in_array( 'blocks-everywhere/support-content', $settings['iso']['blocks']['allowBlocks'], true ) ) {
			register_block_type(
				'blocks-everywhere/support-content',
				[
					'editor_script' => 'support-content-editor',
					'editor_style' => 'support-content-editor',
					'style' => 'support-content-view',
					'render_callback' => function( $attribs, $content ) {
						$this->enqueue_assets(
							'support-content-view',
							'support-content-view.min.asset.php',
							'support-content-view.min.js',
							'support-content-view.min.css'
						);
						return $content;
					},
				]
			);
		}
	}

	/**
	 * Get the default settings for the editor
	 *
	 * @return array
	 */
	private function get_default_settings() {
		// Settings for the editor
		$default_settings = [
			'editor' => [],
			'iso' => [
				'blocks' => [
					'allowBlocks' => $this->get_allowed_blocks(),
				],
				'moreMenu' => false,
				'sidebar' => [
					'inserter' => false,
					'inspector' => false,
				],
				'toolbar' => [
					'navigation' => true,
				],
				'defaultPreferences' => [
					'fixedToolbar'    => true,
					'hasFixedToolbar' => true,
				],
				'allowEmbeds' => [
					'youtube',
					'vimeo',
					'wordpress',
					'wordpress-tv',
					'videopress',
					'crowdsignal',
					'imgur',
				],
			],
			'editorType' => $this->get_editor_type(),
			'allowUrlEmbed' => false,
			'pastePlainText' => false,
			'replaceParagraphCode' => false,
			'patchEmoji' => false,
			'pluginsUrl' => plugins_url( '', __DIR__ ),
			'version' => \Automattic\Blocks_Everywhere\Blocks_Everywhere::VERSION,
			'autocompleter' => true,
		];

		return apply_filters( 'blocks_everywhere_editor_settings', $default_settings );
	}

	/**
	 * Load Gutenberg if a comment form is enabled
	 *
	 * @return void
	 */
	public function load_editor( $textarea, $container = null ) {
		$this->editor = new \Automattic\Blocks_Everywhere\Editor();

		$settings = $this->get_default_settings();
		$settings['editor']       = array_merge( $settings['editor'], $this->editor->get_editor_settings() );
		$settings['saveTextarea'] = $textarea;
		$settings['container']    = $container;

		$this->editor->load( $settings );
		$this->settings = $settings;

		// Enqueue assets
		$this->enqueue_assets(
			'blocks-everywhere',
			'index.min.asset.php',
			'index.min.js',
			'style-index.min.css'
		);

		// Enqueue settings separately to allow for dynamic loading.
		wp_register_script( 'blocks-everywhere-settings', '', [], $settings['version'], true );
		wp_add_inline_script( 'blocks-everywhere-settings', 'const wpBlocksEverywhere = ' . wp_json_encode( $settings ), 'before' );
		wp_enqueue_script( 'blocks-everywhere-settings' );

		if ( in_array( 'blocks-everywhere/support-content', $settings['iso']['blocks']['allowBlocks'], true ) ) {
			$this->enqueue_assets(
				'support-content-editor',
				'support-content-editor.min.asset.php',
				'support-content-editor.min.js',
				'support-content-editor.min.css'
			);
			$this->enqueue_assets(
				'support-content-view',
				'support-content-view.min.asset.php',
				'support-content-view.min.js',
				'support-content-view.min.css'
			);
		}

		$theme_compat = defined( 'BLOCKS_EVERYWHERE_THEME_COMPAT' ) ? BLOCKS_EVERYWHERE_THEME_COMPAT : false;
		if ( apply_filters( 'blocks_everywhere_theme_compat', $theme_compat ) ) {
			$plugin = dirname( __DIR__ ) . '/blocks-everywhere.php';

			wp_register_style( 'blocks-everywhere-compat', plugins_url( 'build/theme-compat.min.css', $plugin ), [ 'blocks-everywhere' ], true );
			wp_enqueue_style( 'blocks-everywhere-compat' );
		}
	}

	/**
	 * Register the CSS and JS in case we want to later enqueue it.
	 *
	 * @param string $name Resource name.
	 * @param string $asset_file Resource file.
	 * @param string|null $js_file JS file, if it exists.
	 * @param string|null $css_file CSS file, if it exists.
	 * @return string
	 */
	private function register_assets( $name, $asset_file, $js_file = null, $css_file = null ) {
		$asset_file = dirname( __DIR__ ) . '/build/' . $asset_file;
		$asset = file_exists( $asset_file ) ? require_once $asset_file : null;
		$version = isset( $asset['version'] ) ? $asset['version'] : time();
		$plugin = dirname( __DIR__ ) . '/blocks-everywhere.php';

		if ( $js_file ) {
			wp_register_script( $name, plugins_url( 'build/' . $js_file, $plugin ), $asset['dependencies'], $version, true );
		}

		if ( $css_file ) {
			wp_register_style( $name, plugins_url( 'build/' . $css_file, $plugin ), [], $version );
		}

		return $version;
	}

	/**
	 * Enqueue the CSS and JS.
	 *
	 * @param string $name Resource name.
	 * @param string $asset_file Resource file.
	 * @param string $js_file JS file.
	 * @param string $css_file CSS file.
	 * @return string
	 */
	private function enqueue_assets( $name, $asset_file, $js_file = null, $css_file = null ) {
		if ( $js_file && ! wp_script_is( $name, 'registered' ) ) {
			$this->register_assets( $name, $asset_file, $js_file, null );
		}

		if ( defined( '__EXPERIMENTAL_DYNAMIC_LOAD' ) && 'blocks-everywhere' === $name ) {
			\WP_Enqueue_Dynamic_Script::enqueue_script( $name );
		} else {
			wp_enqueue_script( $name );
		}

		if ( $css_file && ! wp_style_is( $name, 'registered' ) ) {
			$this->register_assets( $name, $asset_file, null, $css_file );
		}
		wp_enqueue_style( $name );
	}

	/**
	 * Callback to show admin editor
	 *
	 * @param string $hook Hook.
	 * @return boolean
	 */
	public function can_show_admin_editor( $hook ) {
		return false;
	}
}
