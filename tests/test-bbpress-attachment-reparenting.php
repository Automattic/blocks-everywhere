<?php

use Automattic\Blocks_Everywhere\Contexts;
use PHPUnit\Framework\TestCase;

// phpcs:ignore
class bbPress_Attachment_Reparenting_Test extends TestCase {
	protected function setUp(): void {
		$GLOBALS['__wp_filters'] = [];
	}

	public function test_reparenting_is_disabled_by_default() {
		$this->assertFalse( Contexts\bbpress_should_reparent_pending_attachments( 12, 34, 56 ) );
	}

	public function test_reparenting_filter_receives_topic_context() {
		add_filter(
			'blocks_everywhere_reparent_pending_attachments',
			function ( $enabled, $topic_id, $forum_id, $topic_author ) {
				return false === $enabled && 12 === $topic_id && 34 === $forum_id && 56 === $topic_author;
			},
			10,
			4
		);

		$this->assertTrue( Contexts\bbpress_should_reparent_pending_attachments( 12, 34, 56 ) );
	}

	public function test_pending_parent_meta_key_is_filterable() {
		$this->assertSame(
			'_blocks_everywhere_content_embed_pending_parent',
			Contexts\bbpress_get_pending_attachment_parent_meta_key()
		);

		add_filter(
			'blocks_everywhere_pending_attachment_parent_meta_key',
			function ( $meta_key, $topic_id, $forum_id, $topic_author ) {
				return '_blocks_everywhere_content_embed_pending_parent' === $meta_key && 12 === $topic_id && 34 === $forum_id && 56 === $topic_author
					? '_legacy_pending_parent'
					: $meta_key;
			},
			10,
			4
		);

		$this->assertSame( '_legacy_pending_parent', Contexts\bbpress_get_pending_attachment_parent_meta_key( 12, 34, 56 ) );
	}
}
