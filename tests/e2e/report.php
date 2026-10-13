<?php
/**
 * Print the e2e results and exit with a failure code if anything failed
 *
 * Usage: php report.php results.json [--verbose]
 */

$results = json_decode( file_get_contents( $argv[1] ), true );
$verbose = in_array( '--verbose', $argv, true );

if ( ! is_array( $results ) || count( $results ) === 0 ) {
	echo "No results\n";
	exit( 1 );
}

$failed = 0;
$type = '';

foreach ( $results as $result ) {
	if ( $result['type'] !== $type ) {
		$type = $result['type'];
		echo $type === 'attack' ? "\nAttacks (should be blocked)\n" : "\nLegitimate content (should be unchanged)\n";
	}

	$details = [];

	if ( ! empty( $result['stored_disallowed'] ) ) {
		$details[] = 'stored ' . implode( ', ', $result['stored_disallowed'] );
	}

	if ( ! empty( $result['rendered_markers'] ) ) {
		$details[] = 'rendered ' . implode( ', ', $result['rendered_markers'] );
	}

	if ( ! empty( $result['http_requests'] ) ) {
		$details[] = count( $result['http_requests'] ) . ' HTTP request(s) to ' . implode( ', ', array_unique( $result['http_requests'] ) );
	}

	if ( ! empty( $result['error'] ) ) {
		$details[] = 'error: ' . $result['error'];
	}

	if ( ! $result['pass'] ) {
		$failed++;

		if ( $result['type'] === 'content' ) {
			$details[] = 'stored: ' . $result['stored'];
		}
	}

	printf( "  %s  %-46s %-30s %s\n", $result['pass'] ? 'PASS' : 'FAIL', $result['surface'], $result['case'], implode( '; ', $details ) );

	if ( $verbose && $result['pass'] && $result['type'] === 'content' ) {
		echo '        ' . str_replace( "\n", "\n        ", $result['stored'] ) . "\n";
	}

	if ( $verbose && ! $result['pass'] && $result['type'] === 'attack' ) {
		echo '        stored:   ' . json_encode( $result['stored'] ) . "\n";
		echo '        rendered: ' . json_encode( $result['rendered'] ) . "\n";
	}
}

printf( "\n%d passed, %d failed\n", count( $results ) - $failed, $failed );
exit( $failed > 0 ? 1 : 0 );
