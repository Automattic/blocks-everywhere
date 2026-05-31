<?php

use PHPUnit\Framework\TestCase;

// phpcs:ignore
class Pattern_Settings_Test extends TestCase {
	public function test_pattern_settings_are_exposed_to_native_gutenberg() {
		$source = file_get_contents( dirname( __DIR__ ) . '/src/editor/index.tsx' );
		$docs   = file_get_contents( dirname( __DIR__ ) . '/docs/portable-editor-adapters.md' );
		$types  = file_get_contents( dirname( __DIR__ ) . '/types.d.ts' );

		$this->assertStringContainsString( 'function resolvePatternSettings', $source );
		$this->assertStringContainsString( '__experimentalAdditionalBlockPatterns', $source );
		$this->assertStringContainsString( '__experimentalAdditionalBlockPatternCategories', $source );
		$this->assertStringContainsString( 'allowPatterns', $source );
		$this->assertStringContainsString( 'disallowPatterns', $source );
		$this->assertStringContainsString( 'BlocksEverywherePatterns', $types );
		$this->assertStringContainsString( 'Blocks Everywhere uses native Gutenberg block pattern settings', $docs );
	}

	public function test_server_contexts_can_configure_patterns() {
		$engine = file_get_contents( dirname( __DIR__ ) . '/classes/class-engine.php' );
		$docs   = file_get_contents( dirname( __DIR__ ) . '/docs/portable-editor-adapters.md' );

		$this->assertStringContainsString( "'patterns'", $engine );
		$this->assertStringContainsString( "'pattern_categories'", $engine );
		$this->assertStringContainsString( "'allowed_patterns'", $engine );
		$this->assertStringContainsString( "'disallowed_patterns'", $engine );
		$this->assertStringContainsString( "'pattern_categories' =>", $docs );
		$this->assertStringContainsString( "'allowed_patterns'", $docs );
	}

	public function test_synced_pattern_override_boundary_is_documented() {
		$docs = file_get_contents( dirname( __DIR__ ) . '/docs/portable-editor-adapters.md' );

		$this->assertStringContainsString( 'serializes as a normal `core/block` reference', $docs );
		$this->assertStringContainsString( 'override controls depend on canonical pattern/post editor state', $docs );
		$this->assertStringContainsString( 'mount Blocks Everywhere with a real `postEntity`', $docs );
	}
}
