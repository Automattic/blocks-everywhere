<?php
/**
 * Comments context configuration for Blocks Everywhere.
 *
 * @package Automattic\Blocks_Everywhere\Contexts
 * @since   2.0.0
 */

namespace Automattic\Blocks_Everywhere\Contexts;

use Automattic\Blocks_Everywhere\Engine;

/**
 * Build the Comments context configuration array.
 *
 * @param Engine $engine The engine instance.
 * @return array|null
 */
function comments_context( Engine $engine ) {
	$default_comments = defined( 'BLOCKS_EVERYWHERE_COMMENTS' ) ? BLOCKS_EVERYWHERE_COMMENTS : false;

	if ( ! apply_filters( 'blocks_everywhere_comments', $default_comments ) ) {
		return null;
	}

	// Comment form container.
	add_filter( 'comment_form_defaults', function ( $defaults ) {
		$defaults['class_container'] .= ' gutenberg-comments';
		$defaults['comment_field']   .= '<div class="blocks-everywhere blocks-everywhere-editor__loading"></div>';
		return $defaults;
	} );

	// Content display filter.
	add_filter( 'comment_text', function ( $content ) use ( $engine ) {
		return $engine->do_blocks( $content, 'comment_text' );
	}, 8 );

	// Pre-save block removal.
	add_filter( 'pre_comment_content', function ( $content ) use ( $engine ) {
		return $engine->remove_blocks( $content );
	} );

	// KSES for comments.
	add_filter( 'wp_kses_allowed_html', function ( $tags, $context ) use ( $engine ) {
		if ( 'pre_comment_content' === $context ) {
			$tags = $engine->get_kses_for_allowed_blocks( $tags );
		}
		return $tags;
	}, 10, 2 );

	return [
		'type'       => 'comments',
		'textarea'   => '#comment',
		'container'  => '.blocks-everywhere',
		'trigger'    => 'comment_form_after',
		'admin_hook' => 'comment.php',
	];
}
