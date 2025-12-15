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
import customBlocks from './block-customization';
import mentionsCompleter from './completer/mentions';
import './styles/style.scss';

const removeNullPostFromFileUploadMiddleware = ( options, next ) => {
	if ( options.method === 'POST' && options.path === '/wp/v2/media' ) {
		const formData = options.body;

		if (
			formData instanceof FormData &&
			formData.has( 'post' ) &&
			formData.get( 'post' ) === 'null'
		) {
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

	// Remove some formatting options
	unregisterFormatType( 'core/text-color' );
	unregisterFormatType( 'core/image' );

	// Remove some items from the toolbar “More” dropdown.
	// Keep: strikethrough, subscript, superscript.
	unregisterFormatType( 'core/code' );
	unregisterFormatType( 'core/keyboard' );
	unregisterFormatType( 'core/language' );
	unregisterFormatType( 'core/math' );

	if ( wpBlocksEverywhere.editorType === 'bbpress' && wpBlocksEverywhere.autocompleter ) {
		addFilter(
			'editor.Autocomplete.completers',
			'blocks-everywhere/autocompleters',
			( completers = [] ) => {
				return completers
					.filter( ( completer ) => completer.name !== 'users' )
					.concat( [ mentionsCompleter ] );
			}
		);
	}

	if ( wpBlocksEverywhere?.patchEmoji && window?.twemoji?.parse ) {
		const original = window.twemoji.parse;

		window.twemoji.parse = ( object, args ) => {
			if ( object.closest( '.blocks-everywhere' ) ) {
				return object;
			}

			return original( object, args );
		}
	}

	// Add the editor
	document.querySelectorAll( wpBlocksEverywhere.saveTextarea ).forEach( createEditor );

	// Set the loaded flag
	setTimeout( () => document.body.classList.add( 'gutenberg-support-loaded' ), 250 );
} );
