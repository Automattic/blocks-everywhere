/**
 * WordPress dependencies
 */

import { MediaUpload } from '@wordpress/media-utils';
import { mediaUpload as blockEditorMediaUpload } from '@wordpress/block-editor';
import { mediaUpload as legacyMediaUpload } from '@wordpress/editor';
import { createRoot, useEffect } from '@wordpress/element';
import IsolatedBlockEditor, { EditorLoaded } from '@chubes4/isolated-block-editor';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { getBlockTypes, unregisterBlockType } from '@wordpress/blocks';

/**
 * Local dependencies
 */

import BuddyPress from './buddypress';

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

function removeInlineStylesFromEmptyBlockInserter( iframeDoc ) {
	// Gutenberg sets `style="color:#fff;background:#fff"` on this toggle in some states.
	// Since inline styles win over CSS, remove them so theme-token CSS can apply.
	const toggles = iframeDoc.querySelectorAll(
		'.block-editor-block-list__empty-block-inserter .block-editor-inserter__toggle.has-icon'
	);

	toggles.forEach( ( toggle ) => {
		if ( toggle.hasAttribute( 'style' ) ) {
			toggle.removeAttribute( 'style' );
		}

		toggle.style.removeProperty( 'color' );
		toggle.style.removeProperty( 'background' );
		toggle.style.removeProperty( 'background-color' );
	} );
}

function installIframeThemeFixes( container ) {
	if ( ! container ) {
		return () => undefined;
	}

	let iframeObserver;
	let docObserver;
	let attachedIframe;
	let attachedIframeLoadHandler;

	const attachToIframe = ( iframe ) => {
		if ( ! iframe || iframe === attachedIframe ) {
			return;
		}

		if ( attachedIframe && attachedIframeLoadHandler ) {
			attachedIframe.removeEventListener( 'load', attachedIframeLoadHandler );
		}

		attachedIframe = iframe;

		const refresh = () => {
			const iframeDoc = iframe.contentDocument;
			if ( ! iframeDoc ) {
				return;
			}

			removeInlineStylesFromEmptyBlockInserter( iframeDoc );

			docObserver?.disconnect?.();
			docObserver = new MutationObserver( ( mutations ) => {
				for ( const mutation of mutations ) {
					if ( mutation.type === 'attributes' && mutation.target?.matches?.( '.block-editor-inserter__toggle.has-icon' ) ) {
						removeInlineStylesFromEmptyBlockInserter( iframeDoc );
						continue;
					}

					if ( mutation.type === 'childList' && ( mutation.addedNodes?.length || mutation.removedNodes?.length ) ) {
						removeInlineStylesFromEmptyBlockInserter( iframeDoc );
					}
				}
			} );

			docObserver.observe( iframeDoc.documentElement, {
				subtree: true,
				childList: true,
				attributes: true,
				attributeFilter: [ 'style', 'class' ],
			} );
		};

		attachedIframeLoadHandler = refresh;
		iframe.addEventListener( 'load', refresh );
		refresh();
	};

	const findAndAttach = () => {
		const iframe = container.querySelector( 'iframe[name="editor-canvas"]' );
		if ( iframe ) {
			attachToIframe( iframe );
			return true;
		}

		return false;
	};

	if ( ! findAndAttach() ) {
		iframeObserver = new MutationObserver( () => {
			if ( findAndAttach() ) {
				iframeObserver.disconnect();
			}
		} );
		iframeObserver.observe( container, { subtree: true, childList: true } );
	}

	return () => {
		iframeObserver?.disconnect?.();
		docObserver?.disconnect?.();

		if ( attachedIframe && attachedIframeLoadHandler ) {
			attachedIframe.removeEventListener( 'load', attachedIframeLoadHandler );
		}
	};
}

function IframeThemeFixes( { container } ) {
	useEffect( () => installIframeThemeFixes( container ), [ container ] );
	return null;
}

function createContainer( textarea, existingContainer ) {
	if ( existingContainer && ! existingContainer.contains( textarea ) ) {
		return existingContainer;
	}

	const container = document.createElement( 'div' );

	// Insert the container
	textarea.parentNode.insertBefore( container, textarea );

	return container;
}

function RemoveBlockTypes() {
	useEffect( () => {
		try {
			const blocks = getBlockTypes();

			if ( ! Array.isArray( blocks ) ) {
				return;
			}

			blocks
				.filter( ( block ) => wpBlocksEverywhere?.iso?.blocks?.allowBlocks?.indexOf( block.name ) === -1 )
				.forEach( ( block ) => unregisterBlockType( block.name ) );
		} catch ( error ) {
			// Avoid hard-fail if registry API shape changes.
			// eslint-disable-next-line no-console
			console.error( 'Blocks Everywhere: failed to prune blocks', error );
		}
	}, [] );

	return null;
}

function createEditorContainer( container, textarea, settings ) {
	const root = createRoot( container );

	const uploadViaExtraChillApi = async ( file, topicId = 0 ) => {
		const formData = new FormData();
		formData.append( 'file', file );
		formData.append( 'context', 'content_embed' );
		if ( topicId ) {
			formData.append( 'target_id', String( topicId ) );
		}

		const configuredNonce = settings?.restNonce || window?.wpApiSettings?.nonce || null;
		const headers = configuredNonce ? { 'X-WP-Nonce': configuredNonce } : undefined;

		const response = await window.fetch( '/wp-json/extrachill/v1/media', {
			method: 'POST',
			credentials: 'same-origin',
			headers,
			body: formData,
		} );

		if ( ! response.ok ) {
			let errorMessage = 'Upload failed.';
			try {
				const payload = await response.json();
				if ( payload?.message ) {
					errorMessage = payload.message;
				}
			} catch ( error ) {
				// ignore
			}
			throw new Error( errorMessage );
		}

		return response.json();
	};

	if ( settings?.editorType === 'bbpress' ) {
		settings.editor.mediaUpload = ( { filesList, onFileChange, onError } ) => {
			const files = Array.from( filesList );
			const topicId = settings?.bbpress?.topicId ? Number( settings.bbpress.topicId ) : 0;

			Promise.all(
				files.map( async ( file ) => {
					const result = await uploadViaExtraChillApi( file, topicId );
					const attachment = result?.attachment;
					if ( attachment ) {
						return attachment;
					}

					return {
						id: result?.attachment_id,
						url: result?.url,
					};
				} )
			)
				.then( ( mediaItems ) => onFileChange( mediaItems ) )
				.catch( ( error ) => onError( error ) );
		};

		addFilter( 'editor.MediaUpload', 'blocks-everywhere/media-upload', () => MediaUpload );
	} else if ( settings?.editor?.hasUploadPermissions ) {
		// Prefer block-editor mediaUpload; fall back to legacy editor if absent.
		const resolvedMediaUpload = blockEditorMediaUpload || legacyMediaUpload || null;
		settings.editor.mediaUpload = resolvedMediaUpload;

		if ( resolvedMediaUpload ) {
			addFilter( 'editor.MediaUpload', 'blocks-everywhere/media-upload', () => MediaUpload );
		}
	} else {
		settings.editor.mediaUpload = null;
	}

	root.render(
		<IsolatedBlockEditor
			settings={ settings }
			onSaveContent={ ( content ) => saveBlocks( textarea, content ) }
			onLoad={ ( parser ) => ( textarea && textarea.nodeName === 'TEXTAREA' ? parser( textarea.value ) : [] ) }
			onError={ ( error ) => {
				// eslint-disable-next-line no-console
				console.error( 'Blocks Everywhere: editor initialization failed', error );
				container?.classList?.add( 'blocks-everywhere--error' );
				document?.body?.classList?.add( 'gutenberg-support-loaded' );
				setLoaded( container );
			} }
			__experimentalOnInput={ ( newBlocks ) => settings?.iso.__experimentalOnInput?.( newBlocks ) }
			__experimentalOnChange={ ( newBlocks ) => settings?.iso.__experimentalOnChange?.( newBlocks ) }
			__experimentalOnSelection={ ( selection ) => settings?.iso.__experimentalOnSelection?.( selection ) }
			className={ settings?.iso?.className }
		>
			<IframeThemeFixes container={ container } />
			<EditorLoaded onLoaded={ () => setLoaded( container ) } />

			{ settings.editorType === 'buddypress' && <BuddyPress textarea={ textarea } /> }
			<RemoveBlockTypes />
		</IsolatedBlockEditor>
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

export default function createEditor( node ) {
	if ( typeof wpBlocksEverywhere === 'undefined' || ! wpBlocksEverywhere?.container ) {
		// eslint-disable-next-line no-console
		console.error( 'Blocks Everywhere: settings object missing; cannot initialize editor.' );
		setLoaded( node?.parentNode || document.body );
		return;
	}

	let container;

	// Prefer enclosing containers, so check if one exists outside.
	const outerContainerNode = node.closest( wpBlocksEverywhere.container );
	if ( outerContainerNode ) {
		container = createContainer( node, outerContainerNode );
	} else {
		container = createContainer( node, document.querySelector( wpBlocksEverywhere.container ) );
	}

	insulateForm( container );
	createEditorContainer( container, node, wpBlocksEverywhere );
}

