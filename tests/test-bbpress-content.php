<?php

use Automattic\Blocks_Everywhere\Handler;
use PHPUnit\Framework\TestCase;

// phpcs:ignore
class bbPress_Content_Test extends TestCase {
	private function process_content( $content ) {
		$bbpress = new Handler\bbPress();
		$content = $bbpress->allow_comments_in_bbp_encode_bad_pre( $content );
		$content = bbp_encode_bad( $content );

		return $bbpress->allow_comments_in_bbp_encode_bad_post( $content );
	}

	public function testEmpty() {
		$content = '';
		$expected = '';

		$this->assertEquals( $expected, $this->process_content( $content ) );
	}

	public function testSelfClosed() {
		$content = '<!-- wp:paragraph /-->';
		$expected = $content;

		$this->assertEquals( $expected, $this->process_content( $content ) );
	}

	public function testSelfClosedAttributes() {
		$content = '<!-- wp:paragraph {"thing":"there"} /-->';
		$expected = $content;

		$this->assertEquals( $expected, $this->process_content( $content ) );
	}

	public function testWithContent() {
		$content = '<!-- wp:paragraph --><p>here is the thing</p><!-- /wp:paragraph -->';
		$expected = $content;

		$this->assertEquals( $expected, $this->process_content( $content ) );
	}

	public function testWithContentAndAttributes() {
		$content = '<!-- wp:paragraph {"thing":"there"} --><p>here is the thing</p><!-- /wp:paragraph -->';
		$expected = $content;

		$this->assertEquals( $expected, $this->process_content( $content ) );
	}

	public function testNested() {
		$content = '<!-- wp:blockquote --><blockquote><!-- wp:paragraph {"thing":"there"} --><p>here is the thing</p><!-- /wp:paragraph --></blockquote><!-- /wp:blockquote -->';
		$expected = $content;

		$this->assertEquals( $expected, $this->process_content( $content ) );
	}

	public function testMarkupInAttribute() {
		$content = '<!-- wp:paragraph {"thing":"&lt;!-- wp:paragraph --&gt;"} --><p>here is the thing</p><!-- /wp:paragraph -->';
		$expected = $content;

		$this->assertEquals( $expected, $this->process_content( $content ) );
	}

	public function testEncodedMarkup() {
		$content = '<!-- wp:paragraph --><p>&lt;!-- wp:paragraph --&gt;</p><!-- /wp:paragraph -->';
		$expected = $content;

		$this->assertEquals( $expected, $this->process_content( $content ) );
	}

	public function testSquareBrackets() {
		$content = '<!-- wp:paragraph --><p>[[!-- wp:paragraph --]]</p><!-- /wp:paragraph -->';
		$expected = '<!-- wp:paragraph --><p>&lt;!-- wp:paragraph --&gt;</p><!-- /wp:paragraph -->';

		$this->assertEquals( $expected, $this->process_content( $content ) );
	}

	public function testInvalid() {
		$invalid = [
			'<!-- invalid:format -->' => '&lt;!-- invalid:format --&gt;',
			'<!-- /invalid:block-format -->' => '&lt;!-- /invalid:block-format --&gt;',
			'<!-- wp:invalid-block-name_!#@$ -->' => '&lt;!-- wp:invalid-block-name_!#@$ --&gt;',
			'<!-- wp:invalid-block-json { -->' => '&lt;!-- wp:invalid-block-json { --&gt;',
			'<!-- /wp:invalid-block-closing-self-closing /-->' => '&lt;!-- /wp:invalid-block-closing-self-closing /--&gt;',
			'<!-- /wp:invalid-block-closing-self-closing-attributes {"invalid":"attribute"} /-->' => '&lt;!-- /wp:invalid-block-closing-self-closing-attributes {"invalid":"attribute"} /--&gt;',
			'<!-- wp:questionable-self-closing-block-with-space-after-closer / -->' => '&lt;!-- wp:questionable-self-closing-block-with-space-after-closer / --&gt;',
		];

		foreach ( $invalid as $content => $expected ) {
			$this->assertEquals( $expected, $this->process_content( $content ) );
		}
	}
}
