/**
 * WordPress dependencies
 */

import domReady from '@wordpress/dom-ready';
import { addFilter } from '@wordpress/hooks';
import apiFetch from '@wordpress/api-fetch';
import { unregisterFormatType } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */

import createEditor from './editor';
import { registerSlotFill } from './editor/slot-fills';
import customBlocks from './block-customization';
import './styles/style.scss';

// Expose createEditor globally for dynamic editor initialization (e.g., inline reply forms)
( window as any ).blocksEverywhereCreateEditor = createEditor;

/**
 * Get the content API for an editor instance by its textarea element.
 *
 * The ContentBridge component (rendered inside each editor instance) attaches
 * a content API object to the textarea. This function provides a clean
 * lookup without consumers needing to know the internal property name.
 *
 * @param textarea - The textarea element the editor was created from.
 * @return The content API, or null if the editor isn't ready yet.
 *
 * @example
 *   const api = window.blocksEverywhereGetContentApi( myTextarea );
 *   if ( api ) {
 *       api.replaceContent( '<p>Hello world</p>' );
 *       const html = api.getContent();
 *   }
 */
( window as any ).blocksEverywhereGetContentApi = ( textarea: HTMLTextAreaElement ) => {
	return textarea?.__blocksEverywhereContentApi ?? null;
};

/**
 * Public namespace for Blocks Everywhere host-page integration APIs.
 *
 * Currently exposes:
 *   - registerSlotFill( slot, renderFn ) — render React content into the editor
 *     footer / toolbar / heading slots from outside BE's React tree.
 *
 * See src/editor/slot-fills.tsx for the full API contract.
 */
( window as any ).blocksEverywhere = {
	registerSlotFill,
};

const removeNullPostFromFileUploadMiddleware = ( options, next ) => {
	if ( options.method === 'POST' && options.path === '/wp/v2/media' ) {
		const formData = options.body;

		if ( formData instanceof FormData && formData.has( 'post' ) && formData.get( 'post' ) === 'null' ) {
			formData.delete( 'post' );
		}
	}

	return next( options );
};

domReady( () => {
	// Stops an error when Gutenberg tries to save a post with a file upload and we dont have a post ID
	apiFetch.use( removeNullPostFromFileUploadMiddleware );

	if ( wpBlocksEverywhere?.restNonce ) {
		apiFetch.use( apiFetch.createNonceMiddleware( wpBlocksEverywhere.restNonce ) );
	}

	// Modify any blocks we need to
	addFilter( 'blocks.registerBlockType', 'blocks-everywhere/modify-blocks', customBlocks );

	// Register core blocks once per page. WordPress enqueues `wp-block-library`
	// which exposes `wp.blockLibrary.registerCoreBlocks` on the global, but
	// nothing calls it on the host page — so without this, `getBlockType()`
	// returns undefined for every block name, and `createBlock()` recurses on
	// `core/missing` until the stack overflows (see Extra-Chill/blocks-everywhere#9).
	// IBE used to call this from its own initializer; PR #6 dropped IBE but
	// didn't carry this call forward.
	const blockLibrary = ( window as any ).wp?.blockLibrary;
	if ( blockLibrary?.registerCoreBlocks && ! ( window as any ).blocksEverywhereCoreBlocksRegistered ) {
		blockLibrary.registerCoreBlocks();
		( window as any ).blocksEverywhereCoreBlocksRegistered = true;
	}

	// Remove some formatting options
	unregisterFormatType( 'core/text-color' );
	unregisterFormatType( 'core/image' );

	// Remove some items from the toolbar “More” dropdown.
	// Keep: strikethrough, subscript, superscript.
	unregisterFormatType( 'core/code' );
	unregisterFormatType( 'core/keyboard' );
	unregisterFormatType( 'core/language' );
	unregisterFormatType( 'core/math' );

	// Strip Gutenberg's default `users` completer in bbPress contexts. The
	// default completer queries /wp/v2/users and lists post authors, which is
	// not meaningful for forum topics/replies. Consumers register their own
	// completers (e.g. @mentions of forum users) via the standard
	// `editor.Autocomplete.completers` filter.
	if ( wpBlocksEverywhere.editorType === 'bbpress' && wpBlocksEverywhere.autocompleter ) {
		addFilter( 'editor.Autocomplete.completers', 'blocks-everywhere/strip-default-users-completer', ( completers = [] ) => {
			return completers.filter( ( completer ) => completer.name !== 'users' );
		} );
	}

	if ( wpBlocksEverywhere?.patchEmoji && window?.twemoji?.parse ) {
		const original = window.twemoji.parse;

		window.twemoji.parse = ( object, args ) => {
			if ( object.closest( '.blocks-everywhere' ) ) {
				return object;
			}

			return original( object, args );
		};
	}

	// Add the editor
	document.querySelectorAll( wpBlocksEverywhere.saveTextarea ).forEach( createEditor );

	// Set the loaded flag
	setTimeout( () => document.body.classList.add( 'gutenberg-support-loaded' ), 250 );
} );
