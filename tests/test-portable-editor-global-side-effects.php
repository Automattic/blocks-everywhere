<?php

use PHPUnit\Framework\TestCase;

// phpcs:ignore
class Portable_Editor_Global_Side_Effects_Test extends TestCase {
	public function test_rest_middlewares_are_resolved_per_editor_instance() {
		$bootstrap_source = file_get_contents( dirname( __DIR__ ) . '/src/index.tsx' );
		$editor_source    = file_get_contents( dirname( __DIR__ ) . '/src/editor/index.tsx' );

		$this->assertStringNotContainsString( 'apiFetch.use(', $bootstrap_source );
		$this->assertStringContainsString( 'function getDefaultApiFetchMiddlewares', $editor_source );
		$this->assertStringContainsString( 'removeNullPostFromFileUploadMiddleware', $editor_source );
		$this->assertStringContainsString( 'apiFetch.createNonceMiddleware', $editor_source );
		$this->assertStringContainsString( 'apiFetchMiddlewares', $editor_source );
	}

	public function test_bbpress_autocomplete_filter_lives_with_bbpress_adapter() {
		$bootstrap_source       = file_get_contents( dirname( __DIR__ ) . '/src/index.tsx' );
		$bbpress_adapter_source = file_get_contents( dirname( __DIR__ ) . '/src/editor/bbpress-adapter.ts' );

		$this->assertStringNotContainsString( 'editor.Autocomplete.completers', $bootstrap_source );
		$this->assertStringContainsString( 'editor.Autocomplete.completers', $bbpress_adapter_source );
		$this->assertStringContainsString( 'bbpress-strip-default-users-completer', $bbpress_adapter_source );
	}
}
