/**
 * WordPress dependencies
 */

import { render } from '@wordpress/element';
import { useEffect } from '@wordpress/element';
import domReady from '@wordpress/dom-ready';
import { useDispatch } from '@wordpress/data';
import { mediaUpload } from '@wordpress/editor';
import IsolatedBlockEditor, { EditorLoaded } from '@automattic/isolated-block-editor';
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */

import './style.scss';

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

/**
 * Save blocks to the comment form
 *
 * @param {string} content Comment content.
 */
function saveBlocks( textarea, content ) {
	if ( textarea ) {
		textarea.value = content;
	}
}

function setLoaded( container ) {
	const closest = container.closest( '.iso-editor__loading' );

	if ( closest ) {
		closest.classList.remove( 'iso-editor__loading' );
	}
}

function createContainer( textarea, existingContainer ) {
	if ( existingContainer && !existingContainer.contains( textarea ) ) {
		return existingContainer;
	}

	const container = document.createElement( 'div' );

	// Insert the container
	textarea.parentNode.insertBefore( container, textarea );

	return container;
}

function BuddyPress( props ) {
	const { textarea } = props;
	const { resetBlocks } = useDispatch( 'core/block-editor' );

	function onClear( mutationsList, observer ) {
		jQuery( '#whats-new' ).focusin();
		resetBlocks( [] );
	}

	useEffect( () => {
		// Show the buddypress buttons
		jQuery( '#whats-new' ).focusin();
		const observer = new MutationObserver( onClear );

		observer.observe( textarea, { attributes: true } );

		return () => {
			observer.disconnect();
		};
	}, [] );

	return null;
}

function createEditor( container, textarea, settings ) {
	if ( settings?.editor?.hasUploadPermissions ) {
		// Connect the media uploader if it's enabled
		settings.editor.mediaUpload = mediaUpload;
	}

	render(
		<IsolatedBlockEditor
			settings={ settings }
			onSaveContent={ ( content ) => saveBlocks( textarea, content ) }
			onLoad={ ( parser ) => ( textarea && textarea.nodeName === 'TEXTAREA' ? parser( textarea.value ) : [] ) }
			onError={ () => document.location.reload() }
		>
			<EditorLoaded onLoaded={ () => setLoaded( container ) } />

			{ settings.editorType === 'buddypress' && <BuddyPress textarea={ textarea } /> }
		</IsolatedBlockEditor>,
		container
	);
}

// If the container is inside a form then we need insulate button clicks inside the editor from propagating out into the form
// This is because a lot of Gutenberg buttons don't set a 'type', and so default to 'submit'
function insulateForm( container ) {
	const form = container.closest( 'form' );

	if ( form ) {
		form.addEventListener( 'submit', ( ev ) => {
			if ( ev.submitter && ev.submitter.closest( '.iso-editor' ) ) {
				ev.stopPropagation();
				ev.preventDefault();
			}
		} );
	}
}

domReady( () => {
	apiFetch.use( removeNullPostFromFileUploadMiddleware );

	document.querySelectorAll( wpBlocksEverywhere.saveTextarea ).forEach( ( node ) => {
		let container;

		// Prefer enclosing containers, so check if one exists outside.
		const outerContainerNode = node.closest( wpBlocksEverywhere.container );
		if ( outerContainerNode ) {
			container = createContainer( node, outerContainerNode );
		} else {
			container = createContainer( node, document.querySelector( wpBlocksEverywhere.container ) );
		}

		insulateForm( container );
		createEditor( container, node, wpBlocksEverywhere );
	} );
} );
