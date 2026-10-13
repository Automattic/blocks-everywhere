<?php

use Automattic\Blocks_Everywhere\Handler;
use PHPUnit\Framework\TestCase;

class Filter_Blocks_Test extends TestCase {
	const ALLOWED = [ 'core/paragraph', 'core/list', 'core/list-item', 'core/quote' ];

	private function filter( $blocks ) {
		$bbpress = new Handler\bbPress();

		return $bbpress->filter_blocks( $blocks, self::ALLOWED );
	}

	private function block( $name, $inner_blocks = [], $inner_content = null, $attrs = [] ) {
		return [
			'blockName' => $name,
			'attrs' => $attrs,
			'innerBlocks' => $inner_blocks,
			'innerHTML' => '',
			'innerContent' => $inner_content === null ? [] : $inner_content,
		];
	}

	public function testAllowedTopLevel() {
		$blocks = [ $this->block( 'core/paragraph', [], [ '<p>hi</p>' ] ) ];

		$this->assertEquals( $blocks, $this->filter( $blocks ) );
	}

	public function testDisallowedTopLevel() {
		$blocks = [
			$this->block( 'core/paragraph', [], [ '<p>hi</p>' ] ),
			$this->block( 'core/rss', [], [], [ 'feedURL' => 'https://example.com' ] ),
		];

		$this->assertEquals( [ $blocks[0] ], $this->filter( $blocks ) );
	}

	public function testFreeformKept() {
		$blocks = [
			$this->block( null, [], [ "\n\n" ] ),
			$this->block( 'core/paragraph', [], [ '<p>hi</p>' ] ),
		];

		$this->assertEquals( $blocks, $this->filter( $blocks ) );
	}

	public function testDisallowedNested() {
		$rss = $this->block( 'core/rss', [], [], [ 'feedURL' => 'https://example.com' ] );
		$blocks = [ $this->block( 'core/paragraph', [ $rss ], [ '<p>hi</p>', null, '' ] ) ];
		$expected = [ $this->block( 'core/paragraph', [], [ '<p>hi</p>', '' ] ) ];

		$this->assertEquals( $expected, $this->filter( $blocks ) );
	}

	public function testDisallowedDeeplyNested() {
		$rss = $this->block( 'core/rss' );
		$paragraph = $this->block( 'core/paragraph', [ $rss ], [ '<p>', null, '</p>' ] );
		$blocks = [ $this->block( 'core/quote', [ $paragraph ], [ '<blockquote>', null, '</blockquote>' ] ) ];

		$expected_paragraph = $this->block( 'core/paragraph', [], [ '<p>', '</p>' ] );
		$expected = [ $this->block( 'core/quote', [ $expected_paragraph ], [ '<blockquote>', null, '</blockquote>' ] ) ];

		$this->assertEquals( $expected, $this->filter( $blocks ) );
	}

	public function testMixedNested() {
		$item1 = $this->block( 'core/list-item', [], [ '<li>one</li>' ] );
		$item2 = $this->block( 'core/list-item', [], [ '<li>two</li>' ] );
		$bad = $this->block( 'core/latest-comments' );
		$blocks = [ $this->block( 'core/list', [ $item1, $bad, $item2 ], [ '<ul>', null, '', null, '', null, '</ul>' ] ) ];

		$expected = [ $this->block( 'core/list', [ $item1, $item2 ], [ '<ul>', null, '', '', null, '</ul>' ] ) ];

		$this->assertEquals( $expected, $this->filter( $blocks ) );
	}

	public function testFreeformNestedNotAllowed() {
		// The parser never creates nested freeform blocks, but they should not bypass the allowlist
		$blocks = [ $this->block( 'core/paragraph', [ $this->block( null ) ], [ '<p>', null, '</p>' ] ) ];
		$expected = [ $this->block( 'core/paragraph', [], [ '<p>', '</p>' ] ) ];

		$this->assertEquals( $expected, $this->filter( $blocks ) );
	}
}
