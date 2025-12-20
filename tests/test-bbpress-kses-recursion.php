<?php

use Automattic\Blocks_Everywhere\Handler;
use PHPUnit\Framework\TestCase;

// phpcs:ignore
class bbPress_Kses_Recursion_Test extends TestCase {
	public function test_bbp_kses_allowed_tags_filter_does_not_recurse() {
		$bbpress = new Handler\bbPress();

		add_filter( 'bbp_kses_allowed_tags', [ $bbpress, 'get_kses_for_allowed_blocks' ] );

		$tags = bbp_kses_allowed_tags();

		$this->assertIsArray( $tags );
		$this->assertArrayHasKey( 'p', $tags );
		$this->assertArrayHasKey( 'br', $tags );
	}
}
