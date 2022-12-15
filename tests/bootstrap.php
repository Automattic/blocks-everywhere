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

function wp_kses_normalize_entities2( $matches ) {
	if ( empty( $matches[1] ) ) {
		return '';
	}

	$i = $matches[1];
	if ( valid_unicode( $i ) ) {
		$i = str_pad( ltrim( $i, '0' ), 3, '0', STR_PAD_LEFT );
		$i = "&#$i;";
	} else {
		$i = "&amp;#$i;";
	}

	return $i;
}

function wp_kses_named_entities( $matches ) {
	$allowedentitynames = [
		'amp',
		'lt',
		'gt',
	];

	if ( empty( $matches[1] ) ) {
		return '';
	}

	$i = $matches[1];
	return ( ! in_array( $i, $allowedentitynames, true ) ) ? "&amp;$i;" : "&$i;";
}

function wp_kses_normalize_entities3( $matches ) {
	if ( empty( $matches[1] ) ) {
		return '';
	}

	$hexchars = $matches[1];
	return ( ! valid_unicode( hexdec( $hexchars ) ) ) ? "&amp;#x$hexchars;" : '&#x' . ltrim( $hexchars, '0' ) . ';';
}

function wp_kses_normalize_entities( $string, $context = 'html' ) {
	// Disarm all entities by converting & to &amp;
	$string = str_replace( '&', '&amp;', $string );

	// Change back the allowed entities in our list of allowed entities.
	if ( 'xml' === $context ) {
		$string = preg_replace_callback( '/&amp;([A-Za-z]{2,8}[0-9]{0,2});/', 'wp_kses_xml_named_entities', $string );
	} else {
		$string = preg_replace_callback( '/&amp;([A-Za-z]{2,8}[0-9]{0,2});/', 'wp_kses_named_entities', $string );
	}
	$string = preg_replace_callback( '/&amp;#(0*[0-9]{1,7});/', 'wp_kses_normalize_entities2', $string );
	$string = preg_replace_callback( '/&amp;#[Xx](0*[0-9A-Fa-f]{1,6});/', 'wp_kses_normalize_entities3', $string );

	return $string;
}

function _wp_specialchars( $string, $quote_style = ENT_NOQUOTES, $charset = false, $double_encode = false ) {
	$string = (string) $string;

	if ( 0 === strlen( $string ) ) {
		return '';
	}

	// Don't bother if there are no specialchars - saves some processing.
	if ( ! preg_match( '/[&<>"\']/', $string ) ) {
		return $string;
	}

	// Account for the previous behaviour of the function when the $quote_style is not an accepted value.
	if ( empty( $quote_style ) ) {
		$quote_style = ENT_NOQUOTES;
	} elseif ( ENT_XML1 === $quote_style ) {
		$quote_style = ENT_QUOTES | ENT_XML1;
	} elseif ( ! in_array( $quote_style, array( ENT_NOQUOTES, ENT_COMPAT, ENT_QUOTES, 'single', 'double' ), true ) ) {
		$quote_style = ENT_QUOTES;
	}

	// Store the site charset as a static to avoid multiple calls to wp_load_alloptions().
	if ( ! $charset ) {
		static $_charset = null;
		$charset = 'UTF-8';
	}

	if ( in_array( $charset, array( 'utf8', 'utf-8', 'UTF8' ), true ) ) {
		$charset = 'UTF-8';
	}

	$_quote_style = $quote_style;

	if ( 'double' === $quote_style ) {
		$quote_style  = ENT_COMPAT;
		$_quote_style = ENT_COMPAT;
	} elseif ( 'single' === $quote_style ) {
		$quote_style = ENT_NOQUOTES;
	}

	if ( ! $double_encode ) {
		// Guarantee every &entity; is valid, convert &garbage; into &amp;garbage;
		// This is required for PHP < 5.4.0 because ENT_HTML401 flag is unavailable.
		$string = wp_kses_normalize_entities( $string, ( $quote_style & ENT_XML1 ) ? 'xml' : 'html' );
	}

	$string = htmlspecialchars( $string, $quote_style, $charset, $double_encode );

	// Back-compat.
	if ( 'single' === $_quote_style ) {
		$string = str_replace( "'", '&#039;', $string );
	}

	return $string;
}

function bbp_encode_bad( $content = '' ) {

	// Setup variables
	$content = _wp_specialchars( $content, ENT_NOQUOTES );
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
