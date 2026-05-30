<?php

use Automattic\Blocks_Everywhere\Engine;
use PHPUnit\Framework\TestCase;

// phpcs:ignore
class Context_Bootstrap_Test extends TestCase {
	protected function setUp(): void {
		$GLOBALS['__wp_filters'] = [];
		$GLOBALS['__wp_current_filter'] = [];
	}

	public function test_context_bootstrap_callbacks_customize_server_context() {
		$events = [];
		$engine = new class() extends Engine {
			public $loaded = null;

			public function load_editor( $textarea, $container = null ) {
				$this->loaded = [ $textarea, $container ];
			}
		};

		add_filter(
			'blocks_everywhere_contexts',
			function ( $contexts ) use ( &$events ) {
				$contexts['portable'] = [
					'type'                  => 'portable',
					'textarea'              => '#portable-content',
					'container'             => '.portable-editor',
					'trigger'               => 'portable_boot',
					'settings_provider'     => function ( $settings ) {
						$settings['blocksEverywhere']['portable'] = true;

						return $settings;
					},
					'mode'                  => [ 'comment', 'compact' ],
					'modes'                 => [
						'comment' => [
							'toolbar' => [ 'listView' => false ],
						],
						'compact' => [
							'chrome'        => [ 'mode' => 'compact', 'footer' => false ],
							'preferenceKey' => 'portable-compact',
						],
					],
					'settings_transforms'   => [
						[
							'template'     => [ [ 'core/paragraph', [ 'placeholder' => 'Start writing' ] ] ],
							'templateLock' => false,
						],
					],
					'allowed_blocks'        => [ 'core/paragraph', 'core/image' ],
					'disallowed_blocks'     => [ 'core/image' ],
					'features'              => [ 'portableToolbar' => true ],
					'preload_paths'         => function ( $paths ) {
						$paths[] = '/portable/v1/context';

						return $paths;
					},
					'block_categories'      => function ( $categories ) {
						$categories[] = [ 'slug' => 'portable', 'title' => 'Portable' ];

						return $categories;
					},
					'server_block_settings' => function ( $settings ) {
						$settings['core/paragraph']['name'] = 'core/paragraph';

						return $settings;
					},
					'body_classes'          => function ( $classes ) {
						$classes[] = 'portable-editor-ready';

						return $classes;
					},
					'editor_assets'         => function () use ( &$events ) {
						$events[] = 'assets';
					},
					'after_load'            => function () use ( &$events ) {
						$events[] = 'after_load';
					},
				];

				return $contexts;
			}
		);

		$engine->boot();
		$engine->load_editor_for_context( 'portable' );

		$settings = apply_filters(
			'blocks_everywhere_editor_settings',
			[
				'blocksEverywhere' => [
					'blocks' => [ 'allowBlocks' => [ 'core/quote' ] ],
				],
			]
		);

		$this->assertSame( [ '#portable-content', '.portable-editor' ], $engine->loaded );
		$this->assertSame( [ 'assets', 'after_load' ], $events );
		$this->assertTrue( $settings['blocksEverywhere']['portable'] );
		$this->assertSame( [ 'comment', 'compact' ], $settings['blocksEverywhere']['mode'] );
		$this->assertFalse( $settings['blocksEverywhere']['modes']['comment']['toolbar']['listView'] );
		$this->assertSame( 'compact', $settings['blocksEverywhere']['modes']['compact']['chrome']['mode'] );
		$this->assertSame( 'portable-compact', $settings['blocksEverywhere']['modes']['compact']['preferenceKey'] );
		$this->assertSame( [ [ 'core/paragraph', [ 'placeholder' => 'Start writing' ] ] ], $settings['blocksEverywhere']['settingsTransforms'][0]['template'] );
		$this->assertFalse( $settings['blocksEverywhere']['settingsTransforms'][0]['templateLock'] );
		$this->assertSame( [ 'core/paragraph' ], $settings['blocksEverywhere']['blocks']['allowBlocks'] );
		$this->assertSame( [ 'core/image' ], $settings['blocksEverywhere']['blocks']['disallowBlocks'] );
		$this->assertTrue( $settings['blocksEverywhere']['features']['portableToolbar'] );
		$this->assertSame( [ '/', '/portable/v1/context' ], apply_filters( 'block_editor_preload_paths', [ '/' ], null ) );
		$this->assertSame( [ [ 'slug' => 'portable', 'title' => 'Portable' ] ], apply_filters( 'block_categories_all', [], null ) );
		$this->assertSame( [ 'core/paragraph' => [ 'name' => 'core/paragraph' ] ], apply_filters( 'blocks_everywhere_server_block_settings', [], null ) );
		$this->assertSame( [ 'gutenberg-support', 'portable-editor-ready' ], apply_filters( 'body_class', [] ) );
	}
}
