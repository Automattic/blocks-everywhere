<?php

use Automattic\Blocks_Everywhere\Engine;
use PHPUnit\Framework\TestCase;

// phpcs:ignore
class bbPress_Kses_Recursion_Test extends TestCase {
	public function test_bbp_kses_allowed_tags_filter_does_not_recurse() {
		$engine = new Engine();

		add_filter( 'bbp_kses_allowed_tags', [ $engine, 'get_kses_for_allowed_blocks' ] );

		$tags = bbp_kses_allowed_tags();

		$this->assertIsArray( $tags );
		$this->assertArrayHasKey( 'p', $tags );
		$this->assertArrayHasKey( 'br', $tags );
	}
}
