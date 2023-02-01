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
import topicUsersCompleter from './completer/topic-users';
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
	apiFetch.use( removeNullPostFromFileUploadMiddleware );

	// Modify any blocks we need to
	addFilter( 'blocks.registerBlockType', 'blocks-everywhere/modify-blocks', customBlocks );

	// Remove some formatting options
	unregisterFormatType( 'core/text-color' );
	unregisterFormatType( 'core/image' );

	if ( wpBlocksEverywhere.editorType === 'bbpress' ) {
		addFilter(
			'editor.Autocomplete.completers',
			'blocks-everywhere/autocompleters',
			( completers = [] ) => {
				return completers
					.filter( ( filter ) => filter.name !== 'users' )
					.concat( [ topicUsersCompleter ] );
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
