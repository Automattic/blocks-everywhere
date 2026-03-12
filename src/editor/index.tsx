/**
 * WordPress dependencies
 */
import { MediaUpload } from '@wordpress/media-utils';
import { mediaUpload as blockEditorMediaUpload } from '@wordpress/block-editor';
import { mediaUpload as legacyMediaUpload } from '@wordpress/editor';
import { createRoot, useEffect } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { getBlockTypes, serialize, unregisterBlockType } from '@wordpress/blocks';
import { useDispatch } from '@wordpress/data';

/**
 * External dependencies
 */
import IsolatedBlockEditor, { EditorLoaded } from '@chubes4/isolated-block-editor';

/**
 * Internal dependencies
 */
import BuddyPress from './buddypress';

/**
 * Save blocks to the comment form
 *
 * @param {HTMLTextAreaElement} textarea - The textarea element.
 * @param {string}              content  - Comment content.
 */
function saveBlocks( textarea: HTMLTextAreaElement, content: string ): void {
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
					if (
						mutation.type === 'attributes' &&
						mutation.target instanceof Element &&
						mutation.target.matches( '.block-editor-inserter__toggle.has-icon' )
					) {
						removeInlineStylesFromEmptyBlockInserter( iframeDoc );
						continue;
					}

					if (
						mutation.type === 'childList' &&
						( mutation.addedNodes?.length || mutation.removedNodes?.length )
					) {
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

function RemoveBlockVariations() {
	useEffect( () => {
		if ( wpBlocksEverywhere?.editorType !== 'bbpress' ) {
			return;
		}

		try {
			window?.wp?.blocks?.unregisterBlockVariation?.( 'core/paragraph', 'stretchy-paragraph' );
			window?.wp?.blocks?.unregisterBlockVariation?.( 'core/heading', 'stretchy-heading' );
		} catch ( error ) {
			// eslint-disable-next-line no-console
			console.error( 'Blocks Everywhere: failed to prune block variations', error );
		}
	}, [] );

	return null;
}

/**
 * Dispatches theme supports to WordPress core store.
 * This enables blocks like core/embed to detect responsive-embeds support
 * and apply proper aspect ratio classes when saving content.
 */
function ThemeSupportsDispatcher( { themeSupports } ) {
	const { receiveCurrentTheme } = useDispatch( 'core' );

	useEffect( () => {
		if ( themeSupports && receiveCurrentTheme ) {
			receiveCurrentTheme( {
				theme_supports: themeSupports,
			} );
		}
	}, [ themeSupports, receiveCurrentTheme ] );

	return null;
}

function createEditorContainer( container, textarea, settings ) {
	const root = createRoot( container );

	const bbpress = settings?.bbpress || {};
	const bbpressIsTopicEdit = Boolean( bbpress?.isTopicEdit );
	const bbpressIsReplyEdit = Boolean( bbpress?.isReplyEdit );
	const bbpressTopicId = bbpress?.topicId ? Number( bbpress.topicId ) : 0;

	let currentForumId = bbpress?.forumId ? Number( bbpress.forumId ) : 0;
	let autosaveTimer = null;
	let lastSavedPayload = null;
	let lastSerializedContent = '';
	let isSubmitting = false;
	let isContextSwitching = false;
	let editorKey = 0;
	const draftRequestControllers = new Set< AbortController >();

	const configuredNonce = settings?.restNonce || window?.wpApiSettings?.nonce || null;
	const restHeaders = configuredNonce ? { 'X-WP-Nonce': configuredNonce } : {};

	const requestDraft = async ( method, payload ) => {
		const controller = new AbortController();
		draftRequestControllers.add( controller );

		const restRoot = settings?.restUrl || window?.wpApiSettings?.root || null;
		if ( ! restRoot ) {
			throw new Error( 'REST root not configured.' );
		}

		const url = new URL( 'extrachill/v1/community/drafts', restRoot );
		if ( ( method === 'DELETE' || method === 'GET' ) && payload && typeof payload === 'object' ) {
			Object.keys( payload ).forEach( ( key ) => {
				if ( payload[ key ] === undefined || payload[ key ] === null ) {
					return;
				}
				url.searchParams.set( key, String( payload[ key ] ) );
			} );
		}

		try {
			const response = await window.fetch( url.toString(), {
				method,
				credentials: 'same-origin',
				signal: controller.signal,
				headers: {
					...restHeaders,
					'Content-Type': 'application/json',
				},
				body:
					method === 'DELETE' || method === 'GET'
						? undefined
						: payload
						? JSON.stringify( payload )
						: undefined,
			} );

			if ( ! response.ok ) {
				throw new Error( 'Draft request failed.' );
			}

			return response.json();
		} finally {
			draftRequestControllers.delete( controller );
		}
	};

	const isTopicDraft = () => {
		if ( settings?.editorType !== 'bbpress' ) {
			return false;
		}

		if ( bbpressIsTopicEdit ) {
			return false;
		}

		return Boolean( textarea?.name === 'bbp_topic_content' || document.getElementById( 'bbp_topic_title' ) );
	};

	const isReplyDraft = () => {
		if ( settings?.editorType !== 'bbpress' ) {
			return false;
		}

		if ( bbpressIsReplyEdit ) {
			return false;
		}

		return Boolean( textarea?.name === 'bbp_reply_content' ) && bbpressTopicId > 0;
	};

	const getTopicTitle = () => {
		const el = document.getElementById( 'bbp_topic_title' );
		return el && 'value' in el ? String( el.value || '' ) : '';
	};

	const getForumIdFromDom = () => {
		const el = document.getElementById( 'bbp_forum_id' );
		if ( ! el || ! ( 'value' in el ) ) {
			return 0;
		}

		const numberValue = Number( el.value );
		return Number.isFinite( numberValue ) && numberValue >= 0 ? numberValue : 0;
	};

	const getReplyToFromDom = () => {
		const replyToField = textarea?.closest?.( 'form' )?.querySelector?.( 'input[name="bbp_reply_to"]' );
		if ( ! replyToField || ! ( 'value' in replyToField ) ) {
			return 0;
		}

		const numberValue = Number( replyToField.value );
		return Number.isFinite( numberValue ) && numberValue >= 0 ? numberValue : 0;
	};

	const isEffectivelyEmptyBlockContent = ( value ) => {
		const content = String( value || '' ).trim();
		if ( ! content ) {
			return true;
		}

		const normalized = content
			.replace( /<!--\s+wp:paragraph\s+-->/g, '' )
			.replace( /<!--\s+\/wp:paragraph\s+-->/g, '' )
			.replace( /<p>(?:\s|&nbsp;|&#160;|<br\s*\/?>)*<\/p>/gi, '' )
			.replace( /\s+/g, '' );

		return normalized === '';
	};

	const buildDraftPayload = ( contentOverride = null, forumIdOverride = null ) => {
		const content = typeof contentOverride === 'string' ? contentOverride : textarea?.value || '';

		if ( isReplyDraft() ) {
			return {
				type: 'reply',
				topic_id: bbpressTopicId,
				reply_to: getReplyToFromDom(),
				content,
			};
		}

		if ( isTopicDraft() ) {
			const resolvedForumId = forumIdOverride !== null ? Number( forumIdOverride ) : currentForumId;
			return {
				type: 'topic',
				forum_id: resolvedForumId,
				title: getTopicTitle(),
				content,
			};
		}

		return null;
	};

	const shouldAutorestoreDraft = () => {
		if ( ! textarea ) {
			return false;
		}

		const hasContent = ! isEffectivelyEmptyBlockContent( textarea.value || '' );
		if ( hasContent ) {
			return false;
		}

		if ( isTopicDraft() ) {
			const titleInput = document.getElementById( 'bbp_topic_title' );
			const titleValue = titleInput && 'value' in titleInput ? String( titleInput.value || '' ).trim() : '';
			return titleValue === '';
		}

		return isReplyDraft();
	};

	const restoreDraftIfNeeded = async () => {
		if ( ! shouldAutorestoreDraft() ) {
			return;
		}

		try {
			if ( isTopicDraft() ) {
				const forumIdFromDom = getForumIdFromDom();
				const response = await requestDraft( 'GET', {
					type: 'topic',
					forum_id: forumIdFromDom,
					prefer_unassigned: true,
				} );
				const draft = response?.draft;
				if ( ! draft ) {
					return;
				}

				const titleInput = document.getElementById( 'bbp_topic_title' );
				if ( titleInput && 'value' in titleInput && String( titleInput.value || '' ).trim() === '' ) {
					titleInput.value = String( draft?.title || '' );
				}

				if ( isEffectivelyEmptyBlockContent( textarea.value || '' ) ) {
					textarea.value = String( draft?.content || '' );
					lastSerializedContent = textarea.value;
				}
				return;
			}

			if ( isReplyDraft() && bbpressTopicId ) {
				const response = await requestDraft( 'GET', {
					type: 'reply',
					topic_id: bbpressTopicId,
					reply_to: getReplyToFromDom(),
				} );
				const draft = response?.draft;
				if ( ! draft ) {
					return;
				}

				if ( isEffectivelyEmptyBlockContent( textarea.value || '' ) ) {
					textarea.value = String( draft?.content || '' );
					lastSerializedContent = textarea.value;
				}
			}
		} catch ( error ) {
			if ( error?.name === 'AbortError' ) {
				return;
			}
			// eslint-disable-next-line no-console
			console.error( 'Blocks Everywhere: failed to restore bbPress draft', error );
		}
	};

	const scheduleAutosaveFromContent = ( content, forumIdOverride = null ) => {
		if ( isSubmitting || isContextSwitching ) {
			return;
		}

		lastSerializedContent = typeof content === 'string' ? content : '';
		const draft = buildDraftPayload( lastSerializedContent, forumIdOverride );
		if ( ! draft ) {
			return;
		}

		const hasAnyContent =
			Boolean( String( draft?.content || '' ).trim() ) || Boolean( String( draft?.title || '' ).trim() );
		if ( ! hasAnyContent ) {
			return;
		}

		const payloadString = JSON.stringify( draft );
		if ( payloadString === lastSavedPayload ) {
			return;
		}

		if ( autosaveTimer ) {
			clearTimeout( autosaveTimer );
		}

		autosaveTimer = setTimeout( async () => {
			if ( isSubmitting || isContextSwitching ) {
				return;
			}

			try {
				await requestDraft( 'POST', draft );
				lastSavedPayload = payloadString;
			} catch ( error ) {
				if ( error?.name === 'AbortError' ) {
					return;
				}
				// eslint-disable-next-line no-console
				console.error( 'Blocks Everywhere: bbPress draft autosave failed', error );
			}
		}, 800 );
	};

	const scheduleAutosave = ( nextBlocks ) => {
		const serialized = Array.isArray( nextBlocks ) ? serialize( nextBlocks ) : '';
		scheduleAutosaveFromContent( serialized );
	};

	const maybeInstallForumMoveHandler = () => {
		if ( ! isTopicDraft() ) {
			return;
		}

		const forumSelect = document.getElementById( 'bbp_forum_id' );
		if ( ! forumSelect || forumSelect.__extrachillDraftMoveInstalled ) {
			return;
		}

		forumSelect.__extrachillDraftMoveInstalled = true;
		currentForumId = getForumIdFromDom();

		if ( isTopicDraft() ) {
			const titleInput = document.getElementById( 'bbp_topic_title' );
			if ( titleInput && ! titleInput.__extrachillDraftTitleInstalled ) {
				titleInput.__extrachillDraftTitleInstalled = true;
				titleInput.addEventListener( 'input', () => {
					scheduleAutosaveFromContent( lastSerializedContent || textarea?.value || '' );
				} );
			}
		}

		forumSelect.addEventListener( 'change', async () => {
			if ( isSubmitting ) {
				return;
			}

			const nextForumId = getForumIdFromDom();
			const previousForumId = currentForumId;
			currentForumId = nextForumId;

			if ( previousForumId !== 0 || nextForumId <= 0 ) {
				return;
			}

			const draft = buildDraftPayload( lastSerializedContent || null, nextForumId );
			if ( ! draft ) {
				return;
			}

			const hasAnyContent =
				Boolean( String( draft?.content || '' ).trim() ) || Boolean( String( draft?.title || '' ).trim() );
			if ( ! hasAnyContent ) {
				return;
			}

			try {
				await requestDraft( 'POST', draft );
				await requestDraft( 'DELETE', { type: 'topic', forum_id: 0 } );
				lastSavedPayload = JSON.stringify( draft );
			} catch ( error ) {
				if ( error?.name === 'AbortError' ) {
					return;
				}
				// eslint-disable-next-line no-console
				console.error( 'Blocks Everywhere: failed to move forum draft', error );
			}
		} );
	};

	const uploadViaExtraChillApi = async ( file, topicId = 0 ) => {
		const formData = new FormData();
		formData.append( 'file', file );
		formData.append( 'context', 'content_embed' );
		if ( topicId ) {
			formData.append( 'target_id', String( topicId ) );
		}

		const configuredNonce = settings?.restNonce || window?.wpApiSettings?.nonce || null;
		const headers = configuredNonce ? { 'X-WP-Nonce': configuredNonce } : undefined;

		const restRoot = settings?.restUrl || window?.wpApiSettings?.root || null;
		if ( ! restRoot ) {
			throw new Error( 'REST root not configured.' );
		}

		const response = await window.fetch( new URL( 'extrachill/v1/media', restRoot ).toString(), {
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

	const renderEditor = () => {
		root.render(
			<IsolatedBlockEditor
				key={ editorKey }
				settings={ settings }
				onSaveContent={ ( content ) => saveBlocks( textarea, content ) }
				onLoad={ ( parser ) => {
					if ( textarea && textarea.nodeName === 'TEXTAREA' ) {
						return parser( textarea.value );
					}
					return [];
				} }
				onError={ ( error ) => {
					// eslint-disable-next-line no-console
					console.error( 'Blocks Everywhere: editor initialization failed', error );
					container?.classList?.add( 'blocks-everywhere--error' );
					document?.body?.classList?.add( 'gutenberg-support-loaded' );
					setLoaded( container );
				} }
				__experimentalOnInput={ ( newBlocks ) => {
					settings?.iso.__experimentalOnInput?.( newBlocks );
					scheduleAutosave( newBlocks );
				} }
				__experimentalOnChange={ ( newBlocks ) => {
					settings?.iso.__experimentalOnChange?.( newBlocks );
					scheduleAutosave( newBlocks );
				} }
				__experimentalOnSelection={ ( selection ) => settings?.iso.__experimentalOnSelection?.( selection ) }
				className={ settings?.iso?.className }
			>
				<IframeThemeFixes container={ container } />
				<EditorLoaded onLoaded={ () => setLoaded( container ) } />
				<ThemeSupportsDispatcher themeSupports={ settings?.editor?.themeSupports } />

				{ settings.editorType === 'buddypress' && <BuddyPress textarea={ textarea } /> }
				<RemoveBlockVariations />
				<RemoveBlockTypes />
			</IsolatedBlockEditor>
		);
	};

	const maybeInstallSubmitHandler = () => {
		if ( settings?.editorType !== 'bbpress' ) {
			return;
		}

		if ( ! container || container.__extrachillDraftSubmitInstalled ) {
			return;
		}

		const form = container.closest( 'form' );
		if ( ! form ) {
			return;
		}

		container.__extrachillDraftSubmitInstalled = true;
		form.addEventListener( 'submit', ( event ) => {
			if ( event.submitter && event.submitter.closest( '.iso-editor' ) ) {
				return;
			}

			isSubmitting = true;
			if ( autosaveTimer ) {
				clearTimeout( autosaveTimer );
			}

			draftRequestControllers.forEach( ( controller ) => controller.abort() );
		} );
	};

	const maybeInstallReplyDraftContextHandler = () => {
		if ( ! isReplyDraft() ) {
			return;
		}

		if ( ! container || container.__extrachillReplyDraftContextInstalled ) {
			return;
		}

		container.__extrachillReplyDraftContextInstalled = true;

		const handler = async ( event ) => {
			if ( ! event?.detail || event.detail.type !== 'reply' ) {
				return;
			}

			const topicId = event.detail.topicId ? Number( event.detail.topicId ) : 0;
			if ( ! topicId || topicId !== bbpressTopicId ) {
				return;
			}

			if ( isSubmitting ) {
				return;
			}

			const previousReplyTo = event.detail.previousReplyTo ? Number( event.detail.previousReplyTo ) : 0;
			const nextReplyTo = event.detail.nextReplyTo ? Number( event.detail.nextReplyTo ) : 0;

			if ( previousReplyTo === nextReplyTo ) {
				return;
			}

			isContextSwitching = true;
			if ( autosaveTimer ) {
				clearTimeout( autosaveTimer );
			}

			draftRequestControllers.forEach( ( controller ) => controller.abort() );

			try {
				const outgoingContent = String( lastSerializedContent || textarea?.value || '' );
				if ( outgoingContent.trim() ) {
					const outgoingPayload = {
						type: 'reply',
						topic_id: bbpressTopicId,
						reply_to: previousReplyTo,
						content: outgoingContent,
					};
					await requestDraft( 'POST', outgoingPayload );
					lastSavedPayload = JSON.stringify( outgoingPayload );
				}

				lastSerializedContent = '';
				lastSavedPayload = null;
				textarea.value = '';

				const incoming = await requestDraft( 'GET', {
					type: 'reply',
					topic_id: bbpressTopicId,
					reply_to: nextReplyTo,
				} );

				const incomingDraft = incoming?.draft;
				if ( incomingDraft && String( incomingDraft?.content || '' ).trim() ) {
					textarea.value = String( incomingDraft.content );
					lastSerializedContent = textarea.value;
				}

				editorKey += 1;
				renderEditor();
			} catch ( error ) {
				if ( error?.name === 'AbortError' ) {
					return;
				}
				// eslint-disable-next-line no-console
				console.error( 'Blocks Everywhere: failed to switch reply draft context', error );
			} finally {
				isContextSwitching = false;
			}
		};

		document.addEventListener( 'extrachill:bbpressDraftContextChange', handler );
	};

	if ( settings?.editorType === 'bbpress' ) {
		maybeInstallForumMoveHandler();
		maybeInstallSubmitHandler();
		maybeInstallReplyDraftContextHandler();
		settings.editor.mediaUpload = ( { filesList, onFileChange, onError } ) => {
			const files = Array.from( filesList );
			const topicId = bbpressTopicId;

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

	void ( async () => {
		await restoreDraftIfNeeded();

		renderEditor();
	} )();
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
