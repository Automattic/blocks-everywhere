/**
 * Smoke test the editor on a running Playground site (see start.sh).
 *
 * Logs in as the participant, replies to the test topic using the block editor, and checks that the reply is saved and
 * displayed as blocks.
 *
 * Usage: node playground/smoke-test.cjs [url]
 *
 * Uses the installed Google Chrome. Set CHROME_PATH to use a different browser.
 */

const puppeteer = require( 'puppeteer-core' );

const URL = process.argv[ 2 ] || 'http://127.0.0.1:9400';
const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let failed = 0;

function check( name, pass, details = '' ) {
	console.log( `  ${ pass ? 'PASS' : 'FAIL' }  ${ name }${ details && ! pass ? ' - ' + details : '' }` );

	if ( ! pass ) {
		failed++;
	}
}

/**
 * Write some text into the editor on the current page and submit the form
 */
async function submitWithEditor( page, textarea, submit, text ) {
	// An empty editor shows a placeholder button, which adds a paragraph when focused
	const appender = await page.waitForSelector(
		'.blocks-everywhere .block-editor-default-block-appender__content, .blocks-everywhere [contenteditable="true"]',
		{ timeout: 30000 }
	);
	check( 'editor loads', !! appender );

	await appender.focus();
	const paragraph = await page.waitForSelector( '.blocks-everywhere [contenteditable="true"]', { timeout: 10000 } );
	await paragraph.focus();

	// Keystrokes don't reach the editor in headless Chrome, but inserted text fires the same input events
	await page.evaluate( ( value ) => document.execCommand( 'insertText', false, value ), text );

	const content = await page.$eval( textarea, ( element ) => element.value );
	check( 'editor saves blocks to the form', content.includes( '<!-- wp:paragraph -->' ) && content.includes( text ), content );

	await Promise.all( [
		page.waitForNavigation( { waitUntil: 'networkidle0' } ),
		page.$eval( submit, ( button ) => button.click() ),
	] );

	const html = await page.content();
	check( 'content is displayed after saving', new RegExp( '<p[^>]*>' + text + '</p>' ).test( html ) );
	check( 'block markup is not displayed', ! html.includes( '&lt;!-- wp:' ) );
}

( async () => {
	const browser = await puppeteer.launch( { executablePath: CHROME_PATH, headless: true } );
	const page = await browser.newPage();
	const errors = [];

	page.on( 'pageerror', ( error ) => errors.push( error.message ) );
	page.on( 'console', ( message ) => message.type() === 'error' && errors.push( message.text() ) );
	await page.setViewport( { width: 1280, height: 1000 } );

	try {
		console.log( `Testing ${ URL }` );

		await page.goto( URL + '/wp-login.php' );
		await page.type( '#user_login', 'participant' );
		await page.type( '#user_pass', 'password' );
		await Promise.all( [ page.waitForNavigation(), page.click( '#wp-submit' ) ] );

		console.log( '\nbbPress reply' );
		await page.goto( URL + '/forums/topic/test-topic/', { waitUntil: 'networkidle0' } );
		await submitWithEditor( page, '.bbp-the-content', '#bbp_reply_submit', 'Smoke test reply ' + Date.now() );

		console.log( '' );
		check( 'no JavaScript errors', errors.length === 0, errors.join( '; ' ) );
	} catch ( error ) {
		check( 'test ran', false, error.message );
	}

	await browser.close();

	console.log( failed ? `\n${ failed } failed` : '\nAll passed' );
	process.exit( failed ? 1 : 0 );
} )();
