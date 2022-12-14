<?php

// Basic WP setup without needing PHPUnit and WP setup together
require_once dirname( __DIR__ ) . '/classes/class-handler.php';

function is_admin() {
	return false;
}

function add_action() {
}

function add_filter() {
}

function apply_filters() {
}

function current_filter() {
	return '';
}

function has_filter() {
	return true;
}

function bbp_kses_allowed_tags() {
	return [
		'a' => true,
		'div' => true,
		'blockquote' => true,
		'p' => true,
	];
}

function bbp_encode_normal_callback( &$content = '', $key = '', $preg = '' ) {
	if ( strpos( $content, '`' ) !== 0 ) {
		$content = preg_replace( "|&lt;(/?{$preg})&gt;|i", '<$1>', $content );
	}
}

function bbp_encode_empty_callback( &$content = '', $key = '', $preg = '' ) {
	if ( strpos( $content, '`' ) !== 0 ) {
		$content = preg_replace( "|&lt;({$preg})\s*?/*?&gt;|i", '<$1 />', $content );
	}
}

function bbp_encode_bad( $content = '' ) {

	// Setup variables
	$content = htmlspecialchars( $content, ENT_NOQUOTES );
	$content = preg_split( '@(`[^`]*`)@m', $content, -1, PREG_SPLIT_NO_EMPTY + PREG_SPLIT_DELIM_CAPTURE );
	$allowed = bbp_kses_allowed_tags();
	$empty   = array(
		'br'    => true,
		'hr'    => true,
		'img'   => true,
		'input' => true,
		'param' => true,
		'area'  => true,
		'col'   => true,
		'embed' => true,
	);

	// Loop through allowed tags and compare for empty and normal tags
	foreach ( $allowed as $tag => $args ) {
		$preg = $args ? "{$tag}(?:\s.*?)?" : $tag;

		// Which walker to use based on the tag and arguments
		if ( isset( $empty[ $tag ] ) ) {
			array_walk( $content, 'bbp_encode_empty_callback', $preg );
		} else {
			array_walk( $content, 'bbp_encode_normal_callback', $preg );
		}
	}

	// Return the joined content array
	return implode( '', $content );
}
