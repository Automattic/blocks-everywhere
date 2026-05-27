/**
 * WordPress dependencies
 */
import { MediaUpload } from '@wordpress/media-utils';
import {
	BlockEditorProvider,
	mediaUpload as blockEditorMediaUpload,
	// @ts-ignore __experimentalLibrary is an unstable API but is the only
	// way to render the inline block inserter panel (same surface IBE used).
	__experimentalLibrary as Library,
} from '@wordpress/block-editor';
import { mediaUpload as legacyMediaUpload } from '@wordpress/editor';
import { SlotFillProvider } from '@wordpress/components';
import { createRoot, useCallback, useEffect, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { createBlock, getBlockTypes, parse, rawHandler, serialize, unregisterBlockType } from '@wordpress/blocks';
import { useDispatch } from '@wordpress/data';

/**
 * Internal dependencies
 */
import BuddyPress from './buddypress';
import ContentBridge from './content-bridge';
import DetachedSidebar from './detached-sidebar';
import EmbeddedEditorShell, { type ResolvedToolbarConfig } from './embedded-editor-shell';
import PostEntityShell, { EditorEditsBridge, type PostEntityRef } from './post-entity-shell';
import { RegisteredSlotFills } from './slot-fills';

/**
 * Inline block inserter panel rendered into the detached sidebar portal.
 *
 * Mirrors the surface IBE's `InserterSidebar` exposed via
 * `__experimentalLibrary`. We deliberately keep this minimal — no close
 * button, no tab filtering — because the BE detached sidebar is intended
 * for persistent host-owned slots (e.g. a host application sidebar). Tab
 * filtering can be reintroduced if/when a consumer needs it.
 */
function DetachedInserterPanel() {
	return (
		<div className="blocks-everywhere-editor__detached-inserter edit-widgets-layout__inserter-panel">
			<div className="edit-widgets-layout__inserter-panel-content blocks-everywhere-editor__inserter-tabs">
				{ /* @ts-ignore __experimentalLibrary is unstable */ }
				<Library showMostUsedBlocks={ false } showInserterHelpPanel />
			</div>
		</div>
	);
}

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
	const closest = container.closest( '.blocks-everywhere-editor__loading' );

	if ( closest ) {
		closest.classList.remove( 'blocks-everywhere-editor__loading' );
	}
}

function EditorLoaded( { onLoaded } ) {
	useEffect( () => {
		onLoaded?.();
	}, [ onLoaded ] );

	return null;
}

/**
 * Resolve the consumer's toolbar configuration into a fully-specified
 * `ResolvedToolbarConfig`.
 *
 * Default toolbar matches the upstream wp-admin post editor (every primitive
 * enabled). Consumers opt OUT individual primitives via
 * `settings.blocksEverywhere.toolbar`; they never need to opt IN. Any key left
 * `undefined` is treated as `true`.
 *
 * Notes on the underlying primitives (rendered by `<EmbeddedEditorShell>`):
 * - `inserter` — document-level "+" block inserter button. May be effectively
 *   suppressed when a persistent detached sidebar is mounted (the sidebar
 *   always shows the inserter panel, making the toolbar button redundant).
 * - `undo` / `redo` — delegate to the core editor history. They are no-ops
 *   when no entity is being edited (BE mounts without a `postEntity` do not
 *   accumulate undo state); the buttons render disabled in that case, which
 *   matches the upstream behavior for an empty post.
 * - `listView` — block list-view tree. Toggle button + dropdown panel on the
 *   toolbar, owned by the shell.
 * - `blockTools` — selected-block format toolbar (the contextual `¶ B I link`
 *   row Gutenberg shows when a block is selected).
 *
 * @param raw              Consumer-supplied partial toolbar config from `settings.blocksEverywhere.toolbar`, or undefined.
 * @param suppressInserter When true, forces `inserter: false` regardless of consumer config. Used when a persistent detached sidebar already exposes the inserter panel.
 */
function resolveToolbarConfig(
	raw: Partial< ResolvedToolbarConfig > | undefined,
	suppressInserter: boolean
): ResolvedToolbarConfig {
	const requested: ResolvedToolbarConfig = {
		inserter: raw?.inserter !== false,
		undo: raw?.undo !== false,
		redo: raw?.redo !== false,
		listView: raw?.listView !== false,
		blockTools: raw?.blockTools !== false,
	};

	// Persistent detached sidebar already exposes the inserter; the toolbar
	// button becomes redundant chrome. Suppression is orthogonal to the
	// consumer's `toolbar.inserter` config — it modifies the effective value.
	if ( suppressInserter ) {
		requested.inserter = false;
	}

	return requested;
}

function ensureSeededBlocks( blocks ) {
	if ( Array.isArray( blocks ) && blocks.length > 0 ) {
		return blocks;
	}
	return [ createBlock( 'core/paragraph' ) ];
}

function EmbeddedBlockEditor( { children, className, onChange, onError, onInput, onLoad, onSelection, settings } ) {
	const [ blocks, setBlocks ] = useState( () => {
		try {
			const initial = onLoad ? onLoad( parse, rawHandler ) : [];
			return ensureSeededBlocks( initial );
		} catch ( error ) {
			onError?.( error );
			return ensureSeededBlocks( [] );
		}
	} );
	const [ selection, setSelection ] = useState( null );

	// Public API for a detached sidebar portal:
	// `settings.blocksEverywhere.sidebar.detached = { target, className?, persistent?, defaultView? }`.
	// `target` is required to enable the detached portal. `defaultView`
	// currently supports only `'inserter'`; `'list-view'` is reserved and
	// falls back to the inserter panel (BE has no list-view chrome yet).
	const detachedSidebar = settings?.blocksEverywhere?.sidebar?.detached || null;
	const hasDetachedSidebar = Boolean( detachedSidebar?.target );
	// When the detached sidebar is persistent, the inserter panel is always
	// visible in the host's portal target — so the toolbar's "+" inserter
	// button becomes redundant chrome. Suppress it in that case.
	// Non-persistent detached sidebars (or the default in-shell sidebar)
	// keep the toolbar button as the trigger.
	const suppressToolbarInserter = Boolean( hasDetachedSidebar && detachedSidebar?.persistent );

	// Resolve the toolbar config (consumer overrides + persistent-sidebar
	// inserter suppression). Defaults match the upstream wp-admin post editor:
	// every primitive on, consumers opt OUT individually.
	const toolbar = resolveToolbarConfig( settings?.blocksEverywhere?.toolbar, suppressToolbarInserter );

	const updateBlocks = useCallback(
		( nextBlocks ) => {
			setBlocks( nextBlocks );
			onChange?.( nextBlocks );
		},
		[ onChange ]
	);
	const inputBlocks = useCallback(
		( nextBlocks ) => {
			setBlocks( nextBlocks );
			onInput?.( nextBlocks );
		},
		[ onInput ]
	);
	const replaceBlocks = useCallback(
		( nextBlocks ) => {
			setBlocks( nextBlocks );
			onChange?.( nextBlocks );
		},
		[ onChange ]
	);
	const updateSelection = useCallback(
		( nextSelection ) => {
			setSelection( nextSelection );
			onSelection?.( nextSelection );
		},
		[ onSelection ]
	);

	return (
		<SlotFillProvider>
			<BlockEditorProvider
				value={ blocks }
				onInput={ inputBlocks }
				onChange={ updateBlocks }
				selection={ selection }
				onChangeSelection={ updateSelection }
				settings={ settings.editor }
				useSubRegistry={ false }
			>
				<EmbeddedEditorShell
					toolbar={ toolbar }
					styles={ settings.editor?.styles || [] }
					className={ className }
				/>
				{ hasDetachedSidebar && (
					<DetachedSidebar
						target={ detachedSidebar.target }
						className={ detachedSidebar.className }
					>
						<DetachedInserterPanel />
					</DetachedSidebar>
				) }
				{ typeof children === 'function' ? children( { blocks, replaceBlocks } ) : children }
			</BlockEditorProvider>
		</SlotFillProvider>
	);
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
				.filter( ( block ) => wpBlocksEverywhere?.blocksEverywhere?.blocks?.allowBlocks?.indexOf( block.name ) === -1 )
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
 * @param root0
 * @param root0.themeSupports
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
	const bbpressDraftEndpoint = bbpress?.draftEndpoint || null;
	const bbpressMediaEndpoint = bbpress?.mediaEndpoint || null;
	const blocksEverywhereMediaEndpoint = settings?.blocksEverywhere?.mediaUploadEndpoint || null;
	const configuredMediaUploadEndpoint = bbpressMediaEndpoint || blocksEverywhereMediaEndpoint || null;
	const hasBbpressMediaUploadSupport =
		settings?.editor?.hasUploadPermissions === true && Boolean( configuredMediaUploadEndpoint );

	let currentForumId = bbpress?.forumId ? Number( bbpress.forumId ) : 0;
	let autosaveTimer = null;
	let lastSavedPayload = null;
	let lastSerializedContent = '';
	let isSubmitting = false;
	let isContextSwitching = false;
	const editorKey = 0;
	const draftRequestControllers = new Set< AbortController >();

	const configuredNonce = settings?.restNonce || window?.wpApiSettings?.nonce || null;
	const restHeaders = configuredNonce ? { 'X-WP-Nonce': configuredNonce } : {};

	const requestDraft = async ( method, payload ) => {
		const controller = new AbortController();
		draftRequestControllers.add( controller );

		const restRoot = settings?.restUrl || window?.wpApiSettings?.root || null;
		if ( ! bbpressDraftEndpoint && ! restRoot ) {
			throw new Error( 'Draft endpoint not configured.' );
		}

		const url = bbpressDraftEndpoint ? new URL( bbpressDraftEndpoint ) : new URL( restRoot );
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
		if ( ! forumSelect || forumSelect.__blocksEverywhereDraftMoveInstalled ) {
			return;
		}

		forumSelect.__blocksEverywhereDraftMoveInstalled = true;
		currentForumId = getForumIdFromDom();

		if ( isTopicDraft() ) {
			const titleInput = document.getElementById( 'bbp_topic_title' );
			if ( titleInput && ! titleInput.__blocksEverywhereDraftTitleInstalled ) {
				titleInput.__blocksEverywhereDraftTitleInstalled = true;
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

	const uploadViaConfiguredMediaEndpoint = async ( file, topicId = 0 ) => {
		const formData = new FormData();
		formData.append( 'file', file );
		formData.append( 'context', 'content_embed' );
		if ( topicId ) {
			formData.append( 'target_id', String( topicId ) );
		}

		const uploadNonce = settings?.restNonce || window?.wpApiSettings?.nonce || null;
		const headers = uploadNonce ? { 'X-WP-Nonce': uploadNonce } : undefined;

		if ( ! configuredMediaUploadEndpoint ) {
			throw new Error( 'Media endpoint not configured.' );
		}

		const response = await window.fetch(
			new URL( configuredMediaUploadEndpoint, window.location.origin ).toString(),
			{
				method: 'POST',
				credentials: 'same-origin',
				headers,
				body: formData,
			}
		);

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
		// Opt-in postEntity wiring: when the consumer declares this BE mount is
		// backed by a canonical WP post, wrap the editor in <EditorProvider> so
		// `core/editor` is populated. <AutosaveMonitor> + <LocalAutosaveMonitor>
		// then fire on the standard WordPress autosave path with no per-consumer
		// debounce/in-flight/sendBeacon code required.
		//
		// When postEntity is absent or has no id, PostEntityShell is a pass-through
		// — existing textarea-only behavior is preserved.
		const postEntity: PostEntityRef | null =
			settings?.postEntity && typeof settings.postEntity === 'object'
				? {
						type: String( settings.postEntity.type || '' ),
						id: Number( settings.postEntity.id ) || 0,
				  }
				: null;

		root.render(
			<PostEntityShell postEntity={ postEntity } editorSettings={ settings?.editor }>
				<EmbeddedBlockEditor
					key={ editorKey }
					settings={ settings }
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
					onInput={ ( newBlocks ) => {
						settings?.blocksEverywhere?.__experimentalOnInput?.( newBlocks );
						saveBlocks( textarea, serialize( newBlocks ) );
						scheduleAutosave( newBlocks );
					} }
					onChange={ ( newBlocks ) => {
						settings?.blocksEverywhere?.__experimentalOnChange?.( newBlocks );
						saveBlocks( textarea, serialize( newBlocks ) );
						scheduleAutosave( newBlocks );
					} }
					onSelection={ ( selection ) => settings?.blocksEverywhere?.__experimentalOnSelection?.( selection ) }
					className={ settings?.blocksEverywhere?.className }
				>
					{ ( { blocks, replaceBlocks } ) => (
						<>
							<EditorLoaded onLoaded={ () => setLoaded( container ) } />
							<ThemeSupportsDispatcher themeSupports={ settings?.editor?.themeSupports } />
							<ContentBridge textarea={ textarea } blocks={ blocks } replaceBlocks={ replaceBlocks } />
							<RegisteredSlotFills textarea={ textarea } />

							{ /* Forward block changes to core/editor edits so <AutosaveMonitor> sees dirty state. */ }
							{ postEntity?.id > 0 && <EditorEditsBridge blocks={ blocks } /> }

							{ settings.editorType === 'buddypress' && <BuddyPress textarea={ textarea } /> }
							<RemoveBlockVariations />
							<RemoveBlockTypes />
						</>
					) }
				</EmbeddedBlockEditor>
			</PostEntityShell>
		);
	};

	const maybeInstallSubmitHandler = () => {
		if ( settings?.editorType !== 'bbpress' ) {
			return;
		}

		if ( ! container || container.__blocksEverywhereDraftSubmitInstalled ) {
			return;
		}

		const form = container.closest( 'form' );
		if ( ! form ) {
			return;
		}

		container.__blocksEverywhereDraftSubmitInstalled = true;
		form.addEventListener( 'submit', ( event ) => {
			if ( event.submitter && event.submitter.closest( '.blocks-everywhere-editor' ) ) {
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

		if ( ! container || container.__blocksEverywhereReplyDraftContextInstalled ) {
			return;
		}

		container.__blocksEverywhereReplyDraftContextInstalled = true;

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

				const incoming = await requestDraft( 'GET', {
					type: 'reply',
					topic_id: bbpressTopicId,
					reply_to: nextReplyTo,
				} );

				const incomingDraft = incoming?.draft;
				const incomingContent =
					incomingDraft && String( incomingDraft?.content || '' ).trim()
						? String( incomingDraft.content )
						: '';

				// Use the ContentBridge API to hot-swap content without remounting.
				const contentApi = textarea?.__blocksEverywhereContentApi;
				if ( contentApi ) {
					contentApi.replaceContent( incomingContent );
				}

				// Keep textarea in sync for onSaveContent and autosave tracking.
				textarea.value = incomingContent;
				lastSerializedContent = incomingContent;
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

		document.addEventListener( 'blocksEverywhere:bbpressDraftContextChange', handler );
	};

	if ( settings?.editorType === 'bbpress' ) {
		maybeInstallForumMoveHandler();
		maybeInstallSubmitHandler();
		maybeInstallReplyDraftContextHandler();

		if ( ! hasBbpressMediaUploadSupport ) {
			settings.editor.mediaUpload = null;
		} else {
			settings.editor.mediaUpload = ( { filesList, onFileChange, onError } ) => {
				const files = Array.from( filesList );
				const topicId = bbpressTopicId;

				Promise.all(
					files.map( async ( file ) => {
						const result = await uploadViaConfiguredMediaEndpoint( file, topicId );
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
		}
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
			if ( ev.submitter && ev.submitter.closest( '.blocks-everywhere-editor' ) ) {
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
