<?php

use PHPUnit\Framework\TestCase;

// phpcs:ignore
class Initial_Content_Pipeline_Test extends TestCase {
	public function test_initial_content_pipeline_is_pre_mount_orchestration() {
		$source = file_get_contents( dirname( __DIR__ ) . '/src/editor/index.tsx' );
		$docs   = file_get_contents( dirname( __DIR__ ) . '/docs/portable-editor-adapters.md' );

		$this->assertStringContainsString( 'function applyInitialContentPipeline', $source );
		$this->assertStringContainsString( 'initialContent', $source );
		$this->assertStringContainsString( 'pattern', $source );
		$this->assertStringContainsString( 'template', $source );
		$this->assertStringContainsString( 'Blocks Everywhere does not own heavy HTML-to-block conversion', $docs );
	}
}
