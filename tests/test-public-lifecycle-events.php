<?php

use PHPUnit\Framework\TestCase;

// phpcs:ignore
class Public_Lifecycle_Events_Test extends TestCase {
	public function test_public_dom_lifecycle_events_use_sanitized_detail() {
		$source = file_get_contents( dirname( __DIR__ ) . '/src/editor/index.tsx' );

		$this->assertStringContainsString( 'function createPublicLifecycleEventDetail', $source );
		$this->assertStringContainsString( 'detail: createPublicLifecycleEventDetail( eventDetail )', $source );

		preg_match( '/function createPublicLifecycleEventDetail\( eventDetail \) \{(?<body>.*?)\n\}/s', $source, $matches );
		$this->assertNotEmpty( $matches['body'] );

		$public_detail_body = $matches['body'];
		$this->assertStringNotContainsString( 'settings', $public_detail_body );
		$this->assertStringNotContainsString( 'restNonce', $public_detail_body );
		$this->assertStringNotContainsString( 'services', $public_detail_body );
		$this->assertStringNotContainsString( 'registry', $public_detail_body );
	}
}
