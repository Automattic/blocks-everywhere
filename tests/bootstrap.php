<?php

// Basic WP setup without needing PHPUnit and WP setup together
require_once dirname( __DIR__ ) . '/classes/class-editor.php';
require_once dirname( __DIR__ ) . '/classes/class-handler.php';
require_once dirname( __DIR__ ) . '/classes/handlers/class-bbpress.php';

function is_admin() {
	return false;
}

function doing_filter( $hook_name = null ) {
	if ( null === $hook_name ) {
		return ! empty( $GLOBALS['__wp_current_filter'] );
	}

	return in_array( $hook_name, (array) $GLOBALS['__wp_current_filter'], true );
}

function remove_filter( $hook_name, $callback, $priority = 10 ) {
	if ( empty( $GLOBALS['__wp_filters'][ $hook_name ][ $priority ] ) ) {
		return;
	}

	$GLOBALS['__wp_filters'][ $hook_name ][ $priority ] = array_values(
		array_filter(
			$GLOBALS['__wp_filters'][ $hook_name ][ $priority ],
			function( $entry ) use ( $callback ) {
				return $entry['callback'] !== $callback;
			}
		)
	);
}

function add_action( $hook_name, $callback = null, $priority = 10, $accepted_args = 1 ) {
	add_filter( $hook_name, $callback, $priority, $accepted_args );
}

$GLOBALS['__wp_filters'] = [];
$GLOBALS['__wp_current_filter'] = [];

function add_filter( $hook_name, $callback, $priority = 10, $accepted_args = 1 ) {
	$GLOBALS['__wp_filters'][ $hook_name ][ $priority ][] = [
		'callback'      => $callback,
		'accepted_args' => $accepted_args,
	];
}

function apply_filters( $hook_name, $value, ...$args ) {
	$GLOBALS['__wp_current_filter'][] = $hook_name;
	try {
		if ( empty( $GLOBALS['__wp_filters'][ $hook_name ] ) ) {
			return $value;
		}

		ksort( $GLOBALS['__wp_filters'][ $hook_name ] );
		foreach ( $GLOBALS['__wp_filters'][ $hook_name ] as $callbacks ) {
			foreach ( $callbacks as $entry ) {
				$callback = $entry['callback'];
				$accepted_args = (int) $entry['accepted_args'];
				$call_args = array_merge( [ $value ], $args );
				$call_args = array_slice( $call_args, 0, max( 1, $accepted_args ) );
				$value = call_user_func_array( $callback, $call_args );
			}
		}

		return $value;
	} finally {
		array_pop( $GLOBALS['__wp_current_filter'] );
	}
}

function current_filter() {
	if ( empty( $GLOBALS['__wp_current_filter'] ) ) {
		return '';
	}

	return end( $GLOBALS['__wp_current_filter'] );
}

function has_filter() {
	return true;
}

function current_user_can( $cap ) {
	return false;
}

function bbp_kses_allowed_tags() {
	$tags = [
		'a'          => [],
		'div'        => [],
		'blockquote' => [],
		'p'          => [],
		'pre'        => [ 'class' => true ],
		'code'       => [],
	];

	return apply_filters( 'bbp_kses_allowed_tags', $tags );
}

function bbp_encode_normal_callback( &$content = '', $key = '', $preg = '' ) {
	if ( strpos( $content, '`' ) !== 0 ) {
		$content = preg_replace( "|&lt;(/?{$preg})&gt;|i", '<$1>', $content );
	}
}

function bbp_encode_empty_callback( &$content = '', $key = '', $preg = '' ) {
	if ( strpos( $content, '`' ) !== 0 ) {
		$content = preg_replace( "|&lt;({$preg})\\s*?/*?&gt;|i", '<$1 />', $content );
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

function wpautop( $content ) {
	return $content;
}

function add_shortcode() {
}

function do_shortcode( $content ) {
	return $content;
}

function wp_parse_args( $args, $defaults = [] ) {
	if ( is_object( $args ) ) {
		$parsed_args = get_object_vars( $args );
	} elseif ( is_array( $args ) ) {
		$parsed_args = $args;
	} else {
		$parsed_args = [];
	}

	return array_merge( (array) $defaults, $parsed_args );
}

function plugins_url( $path = '', $plugin = '' ) {
	return $path;
}

function wp_register_script() {
}

function wp_register_style() {
}

function wp_enqueue_script() {
}

function wp_enqueue_style() {
}

function wp_script_is() {
	return false;
}

function wp_style_is() {
	return false;
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
		$preg = $args ? "{$tag}(?:\\s.*?)?" : $tag;

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
