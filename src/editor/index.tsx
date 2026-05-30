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
import EmbeddedEditorShell, { type ResolvedChromeConfig, type ResolvedToolbarConfig } from './embedded-editor-shell';
import PostEntityShell, { EditorEditsBridge, type PostEntityRef } from './post-entity-shell';
import { RegisteredSlotFills } from './slot-fills';

export type EditorMountSettings = typeof wpBlocksEverywhere;

export interface EditorMountOptions {
	container?: HTMLElement | string | null;
	mode?: string | string[];
	settings?: Partial< EditorMountSettings >;
	settingsTransforms?: SettingsTransform[];
}

type SettingsTransformContext = {
	mode?: string;
	modes: string[];
	options: EditorMountOptions;
	settings: EditorMountSettings;
	textarea: HTMLTextAreaElement | null;
};

type SettingsTransform =
	| Record< string, unknown >
	| ( ( settings: EditorMountSettings, context: SettingsTransformContext ) => Record< string, unknown > | void );

export interface EditorMount {
	container: HTMLElement;
	focus: () => void;
	textarea: HTMLTextAreaElement;
	unmount: () => void;
}

const mountedEditors = new WeakMap< HTMLTextAreaElement, EditorMount >();

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

function createContentBridgeHelpers( textarea, settings ) {
	return {
		parse,
		rawHandler,
		serialize,
		getTextareaContent() {
			return textarea?.value || '';
		},
		setTextareaContent( content ) {
			if ( textarea ) {
				textarea.value = String( content || '' );
			}
		},
		textarea,
		settings,
	};
}

function createContentBridgeContext( textarea, settings ) {
	return {
		textarea,
		settings,
		editorType: settings?.editorType,
	};
}

function normalizeLoadedBlocks( value, helpers ) {
	if ( Array.isArray( value ) ) {
		return value;
	}

	if ( typeof value === 'string' ) {
		return helpers.parse( value );
	}

	return null;
}

function createContentBridgeController( textarea, settings ) {
	const bridge = settings?.blocksEverywhere?.contentBridge || null;
	const helpers = createContentBridgeHelpers( textarea, settings );
	const context = createContentBridgeContext( textarea, settings );
	const syncTextarea = bridge?.syncTextarea !== false;
	const serializeBlocks = ( blocks ) => {
		const serialized = helpers.serialize( blocks );

		if ( typeof bridge?.serialize !== 'function' ) {
			return serialized;
		}

		const nextSerialized = bridge.serialize( blocks, context, helpers );
		return typeof nextSerialized === 'string' ? nextSerialized : serialized;
	};

	return {
		bridge,
		helpers,
		context,
		load() {
			if ( typeof bridge?.load === 'function' ) {
				const loaded = normalizeLoadedBlocks( bridge.load( helpers, context ), helpers );
				if ( loaded ) {
					return loaded;
				}
			}

			return textarea && textarea.nodeName === 'TEXTAREA' ? helpers.parse( textarea.value ) : [];
		},
		serializeBlocks,
		save( blocks ) {
			const serialized = serializeBlocks( blocks );

			if ( syncTextarea ) {
				saveBlocks( textarea, serialized );
			}

			if ( typeof bridge?.save === 'function' ) {
				bridge.save( blocks, serialized, context, helpers );
			}

			return serialized;
		},
		replaceContent( content ) {
			let nextContent = content;

			if ( typeof bridge?.replaceContent === 'function' ) {
				const replaced = bridge.replaceContent( content, context, helpers );
				if ( replaced !== undefined ) {
					nextContent = replaced;
				}
			}

			const nextBlocks = normalizeLoadedBlocks( nextContent, helpers );
			return nextBlocks || [];
		},
	};
}

const lifecycleCallbackNames = {
	'before-mount': 'onBeforeMount',
	mounted: 'onMounted',
	'before-load': 'onBeforeLoad',
	loaded: 'onLoaded',
	input: 'onInput',
	change: 'onChange',
	save: 'onSave',
	submit: 'onSubmit',
	'focus-requested': 'onFocusRequested',
	focused: 'onFocused',
	blurred: 'onBlurred',
	error: 'onError',
	'before-unmount': 'onBeforeUnmount',
	unmounted: 'onUnmounted',
};

const hostAdapterContentEvents = new Set( [ 'input', 'change', 'save' ] );

function getHostAdapter( settings ) {
	const adapter = settings?.blocksEverywhere?.hostAdapter;
	return adapter && typeof adapter === 'object' ? adapter : null;
}

function getHostAdapterMetadata( settings ) {
	return getHostAdapter( settings )?.metadata ?? settings?.blocksEverywhere?.hostContext ?? undefined;
}

function createHostAdapterContext( { container, instance, settings, textarea } ) {
	return {
		container,
		getContentApi: () => textarea?.__blocksEverywhereContentApi ?? null,
		instance,
		metadata: getHostAdapterMetadata( settings ),
		settings,
		textarea,
	};
}

function invokeHostAdapterCallback( adapter, callbackName, args ) {
	if ( ! adapter || typeof adapter?.[ callbackName ] !== 'function' ) {
		return undefined;
	}

	return adapter[ callbackName ]( ...args );
}

function runHostAdapterCallback( adapter, callbackName, args ) {
	try {
		return invokeHostAdapterCallback( adapter, callbackName, args );
	} catch ( error ) {
		// eslint-disable-next-line no-console
		console.error( 'Blocks Everywhere: host adapter callback failed', error );
		return undefined;
	}
}

function runHostAdapterCleanup( cleanup ) {
	if ( typeof cleanup !== 'function' ) {
		return;
	}

	try {
		cleanup();
	} catch ( error ) {
		// eslint-disable-next-line no-console
		console.error( 'Blocks Everywhere: host adapter cleanup failed', error );
	}
}

function setLoaded( container ) {
	const closest = container.closest( '.blocks-everywhere-editor__loading' );

	if ( closest ) {
		closest.classList.remove( 'blocks-everywhere-editor__loading' );
	}
}

function dispatchLifecycleEvent( name, { container, detail = {}, settings, textarea } ) {
	const instance =
		detail?.instance || textarea?.__blocksEverywhereEditor || container?.__blocksEverywhereEditor || null;
	const eventDetail = {
		container,
		getContentApi: () => textarea?.__blocksEverywhereContentApi ?? null,
		instance,
		metadata: getHostAdapterMetadata( settings ),
		settings,
		textarea,
		...detail,
	};
	const lifecycle = settings?.blocksEverywhere?.lifecycle;
	const hostAdapter = getHostAdapter( settings );
	const event = new CustomEvent( `blocksEverywhere:editor:${ name }`, {
		bubbles: true,
		cancelable: false,
		detail: eventDetail,
	} );

	container?.dispatchEvent?.( event );

	try {
		lifecycle?.onEvent?.( name, eventDetail );

		const callbackName = lifecycleCallbackNames[ name ];
		if ( callbackName ) {
			lifecycle?.[ callbackName ]?.( eventDetail );
		}

		hostAdapter?.onEvent?.( name, eventDetail );

		if ( callbackName && ! hostAdapterContentEvents.has( name ) ) {
			hostAdapter?.[ callbackName ]?.( eventDetail );
		}
	} catch ( error ) {
		// eslint-disable-next-line no-console
		console.error( 'Blocks Everywhere: lifecycle callback failed', error );
	}
}

function focusEditor( container ) {
	const target = container?.querySelector?.(
		'.block-editor-block-list__layout [contenteditable="true"], .block-editor-block-list__layout textarea, .block-editor-block-list__layout input'
	);
	target?.focus?.();
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

function resolveChromeConfig( raw: Partial< ResolvedChromeConfig > | undefined ): ResolvedChromeConfig {
	const mode = [ 'inline', 'full-height', 'modal', 'compact' ].includes( String( raw?.mode ) )
		? ( raw?.mode as ResolvedChromeConfig[ 'mode' ] )
		: 'inline';

	return {
		mode,
		topBar: raw?.topBar === true,
		toolbar: raw?.toolbar !== false,
		secondaryToolbar: raw?.secondaryToolbar === true,
		footer: raw?.footer !== false,
		documentSidebar: raw?.documentSidebar === true,
		inserterSidebar: raw?.inserterSidebar === true,
	};
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
	const chrome = resolveChromeConfig( settings?.blocksEverywhere?.chrome );

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
					chrome={ chrome }
					toolbar={ toolbar }
					styles={ settings.editor?.styles || [] }
					className={ className }
				/>
				{ hasDetachedSidebar && (
					<DetachedSidebar target={ detachedSidebar.target } className={ detachedSidebar.className }>
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
		return { container: existingContainer, inserted: false };
	}

	const container = document.createElement( 'div' );

	// Insert the container
	textarea.parentNode.insertBefore( container, textarea );

	return { container, inserted: true };
}

function RemoveBlockTypes( { settings } ) {
	useEffect( () => {
		try {
			const blocks = getBlockTypes();

			if ( ! Array.isArray( blocks ) ) {
				return;
			}

			blocks
				.filter( ( block ) => settings?.blocksEverywhere?.blocks?.allowBlocks?.indexOf( block.name ) === -1 )
				.forEach( ( block ) => unregisterBlockType( block.name ) );
		} catch ( error ) {
			// Avoid hard-fail if registry API shape changes.
			// eslint-disable-next-line no-console
			console.error( 'Blocks Everywhere: failed to prune blocks', error );
		}
	}, [ settings ] );

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
	const cleanupCallbacks = [];
	const hostAdapter = getHostAdapter( settings );

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
	let isUnmounted = false;
	const editorKey = 0;
	const draftRequestControllers = new Set< AbortController >();
	const contentBridge = createContentBridgeController( textarea, settings );
	let hasEditorFocus = false;

	const emitLifecycle = ( name, detail = {} ) => {
		dispatchLifecycleEvent( name, { container, detail, settings, textarea } );
	};
	const emitContentHook = ( name, blocks, serialized ) => {
		const context = createHostAdapterContext( { container, instance, settings, textarea } );
		const callbackName = lifecycleCallbackNames[ name ];

		runHostAdapterCallback( hostAdapter, 'onContent', [ name, blocks, serialized, context ] );
		if ( callbackName ) {
			runHostAdapterCallback( hostAdapter, callbackName, [ blocks, serialized, context ] );
		}

		runHostAdapterCallback( hostAdapter, 'onSave', [ blocks, serialized, context, { source: name } ] );
		emitLifecycle( name, { blocks, serialized, instance } );
		emitLifecycle( 'save', { blocks, serialized, source: name, instance } );
	};

	const onFocusIn = () => {
		if ( hasEditorFocus ) {
			return;
		}

		hasEditorFocus = true;
		emitLifecycle( 'focused', { instance } );
	};
	const onFocusOut = ( event ) => {
		if ( ! container?.contains?.( event.relatedTarget ) ) {
			hasEditorFocus = false;
			emitLifecycle( 'blurred', { instance } );
		}
	};

	container?.addEventListener?.( 'focusin', onFocusIn );
	container?.addEventListener?.( 'focusout', onFocusOut );

	const instance = {
		container,
		focus: () => {
			emitLifecycle( 'focus-requested', { instance } );
			focusEditor( container );
		},
		textarea,
		unmount: () => unmountEditor( textarea ),
	};

	textarea.__blocksEverywhereEditor = instance;
	container.__blocksEverywhereEditor = instance;

	emitLifecycle( 'before-mount', { instance } );
	const hostAdapterContext = createHostAdapterContext( { container, instance, settings, textarea } );
	runHostAdapterCallback( hostAdapter, 'beforeMount', [ hostAdapterContext ] );
	const cleanupHostAdapter = runHostAdapterCallback( hostAdapter, 'setup', [ hostAdapterContext ] );
	if ( typeof cleanupHostAdapter === 'function' ) {
		cleanupCallbacks.push( () => runHostAdapterCleanup( cleanupHostAdapter ) );
	}
	emitLifecycle( 'mounted', { instance } );

	const form = container.closest( 'form' );
	if ( form ) {
		const onSubmit = ( event ) => emitLifecycle( 'submit', { event, instance } );
		form.addEventListener( 'submit', onSubmit );
		cleanupCallbacks.push( () => form.removeEventListener( 'submit', onSubmit ) );
	}

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

	const scheduleAutosave = ( serializedContent ) => {
		scheduleAutosaveFromContent( typeof serializedContent === 'string' ? serializedContent : '' );
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
				const handler = () => {
					scheduleAutosaveFromContent( lastSerializedContent || textarea?.value || '' );
				};

				titleInput.addEventListener( 'input', handler );
				cleanupCallbacks.push( () => {
					titleInput.removeEventListener( 'input', handler );
					delete titleInput.__blocksEverywhereDraftTitleInstalled;
				} );
			}
		}

		const handler = async () => {
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
		};

		forumSelect.addEventListener( 'change', handler );
		cleanupCallbacks.push( () => {
			forumSelect.removeEventListener( 'change', handler );
			delete forumSelect.__blocksEverywhereDraftMoveInstalled;
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
					onLoad={ () => contentBridge.load() }
					onError={ ( error ) => {
						// eslint-disable-next-line no-console
						console.error( 'Blocks Everywhere: editor initialization failed', error );
						container?.classList?.add( 'blocks-everywhere--error' );
						document?.body?.classList?.add( 'gutenberg-support-loaded' );
						setLoaded( container );
						emitLifecycle( 'error', { error, instance } );
					} }
					onInput={ ( newBlocks ) => {
						settings?.blocksEverywhere?.__experimentalOnInput?.( newBlocks );
						const serialized = contentBridge.save( newBlocks );
						emitContentHook( 'input', newBlocks, serialized );
						scheduleAutosave( serialized );
					} }
					onChange={ ( newBlocks ) => {
						settings?.blocksEverywhere?.__experimentalOnChange?.( newBlocks );
						const serialized = contentBridge.save( newBlocks );
						emitContentHook( 'change', newBlocks, serialized );
						scheduleAutosave( serialized );
					} }
					onSelection={ ( selection ) =>
						settings?.blocksEverywhere?.__experimentalOnSelection?.( selection )
					}
					className={ settings?.blocksEverywhere?.className }
				>
					{ ( { blocks, replaceBlocks } ) => (
						<>
							<EditorLoaded
								onLoaded={ () => {
									setLoaded( container );
									emitLifecycle( 'loaded', { instance } );
								} }
							/>
							<ThemeSupportsDispatcher themeSupports={ settings?.editor?.themeSupports } />
							<ContentBridge
								textarea={ textarea }
								blocks={ blocks }
								replaceBlocks={ replaceBlocks }
								contentBridge={ contentBridge }
							/>
							<RegisteredSlotFills textarea={ textarea } />

							{ /* Forward block changes to core/editor edits so <AutosaveMonitor> sees dirty state. */ }
							{ postEntity?.id > 0 && <EditorEditsBridge blocks={ blocks } /> }

							{ settings.editorType === 'buddypress' && <BuddyPress textarea={ textarea } /> }
							<RemoveBlockVariations />
							<RemoveBlockTypes settings={ settings } />
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
		const handler = ( event ) => {
			if ( event.submitter && event.submitter.closest( '.blocks-everywhere-editor' ) ) {
				return;
			}

			isSubmitting = true;
			if ( autosaveTimer ) {
				clearTimeout( autosaveTimer );
			}

			draftRequestControllers.forEach( ( controller ) => controller.abort() );
		};

		form.addEventListener( 'submit', handler );
		cleanupCallbacks.push( () => {
			form.removeEventListener( 'submit', handler );
			delete container.__blocksEverywhereDraftSubmitInstalled;
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
		cleanupCallbacks.push( () => {
			document.removeEventListener( 'blocksEverywhere:bbpressDraftContextChange', handler );
			delete container.__blocksEverywhereReplyDraftContextInstalled;
		} );
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
		try {
			emitLifecycle( 'before-load', { instance } );
			await restoreDraftIfNeeded();
			if ( isUnmounted ) {
				return;
			}

			renderEditor();
		} catch ( error ) {
			// eslint-disable-next-line no-console
			console.error( 'Blocks Everywhere: editor initialization failed', error );
			container?.classList?.add( 'blocks-everywhere--error' );
			document?.body?.classList?.add( 'gutenberg-support-loaded' );
			setLoaded( container );
			emitLifecycle( 'error', { error, instance } );
		}
	} )();

	return () => {
		emitLifecycle( 'before-unmount', { instance } );
		isUnmounted = true;

		if ( autosaveTimer ) {
			clearTimeout( autosaveTimer );
		}

		draftRequestControllers.forEach( ( controller ) => controller.abort() );
		container?.removeEventListener?.( 'focusin', onFocusIn );
		container?.removeEventListener?.( 'focusout', onFocusOut );
		cleanupCallbacks.forEach( ( cleanup ) => cleanup() );
		root.unmount();
		delete textarea.__blocksEverywhereContentApi;
		delete textarea.__blocksEverywhereEditor;
		delete container.__blocksEverywhereEditor;
		emitLifecycle( 'unmounted', { instance } );
	};
}

// If the container is inside a form then we need insulate button clicks inside the editor from propagating out into the form
// This is because a lot of Gutenberg buttons don't set a 'type', and so default to 'submit'
function insulateForm( container ) {
	const form = container.closest( 'form' );

	if ( form ) {
		const handler = ( ev ) => {
			if ( ev.submitter && ev.submitter.closest( '.blocks-everywhere-editor' ) ) {
				ev.stopPropagation();
				ev.preventDefault();
			}
		};

		form.addEventListener( 'submit', handler );

		return () => form.removeEventListener( 'submit', handler );
	}

	return () => {};
}

function resolveContainerOption( container ) {
	if ( typeof container === 'string' ) {
		return document.querySelector( container );
	}

	return container || null;
}

function isPlainObject( value ) {
	return Boolean( value ) && typeof value === 'object' && ! Array.isArray( value );
}

function cloneSettingsValue( value ) {
	if ( Array.isArray( value ) ) {
		return [ ...value ];
	}

	if ( isPlainObject( value ) ) {
		return Object.keys( value ).reduce( ( next, key ) => {
			next[ key ] = cloneSettingsValue( value[ key ] );
			return next;
		}, {} );
	}

	return value;
}

function mergeSettingsValue( base, override ) {
	if ( override === undefined ) {
		return cloneSettingsValue( base );
	}

	if ( Array.isArray( override ) ) {
		return [ ...override ];
	}

	if ( isPlainObject( base ) && isPlainObject( override ) ) {
		const merged = { ...cloneSettingsValue( base ) };
		Object.keys( override ).forEach( ( key ) => {
			merged[ key ] = mergeSettingsValue( merged[ key ], override[ key ] );
		} );

		return merged;
	}

	return cloneSettingsValue( override );
}

function mergeSettings( base, override ) {
	return mergeSettingsValue( base || {}, override || {} );
}

function normalizeModeNames( mode ) {
	const modes = Array.isArray( mode ) ? mode : [ mode ];
	return modes.map( ( name ) => String( name || '' ).trim() ).filter( Boolean );
}

function normalizeTransformPatch( patch ) {
	if ( ! isPlainObject( patch ) ) {
		return null;
	}

	const rootPatch = { ...patch };
	const blocksEverywherePatch = {};
	const editorPatch = {};

	[
		'allowEmbeds',
		'blocks',
		'chrome',
		'className',
		'contentBridge',
		'defaultPreferences',
		'features',
		'lifecycle',
		'mode',
		'modes',
		'preferenceKey',
		'services',
		'settingsTransforms',
		'sidebar',
		'toolbar',
	].forEach( ( key ) => {
		if ( Object.prototype.hasOwnProperty.call( rootPatch, key ) ) {
			blocksEverywherePatch[ key ] = rootPatch[ key ];
			delete rootPatch[ key ];
		}
	} );

	if ( Object.prototype.hasOwnProperty.call( rootPatch, 'allowedBlocks' ) ) {
		blocksEverywherePatch.blocks = {
			...( blocksEverywherePatch.blocks || {} ),
			allowBlocks: rootPatch.allowedBlocks,
		};
		delete rootPatch.allowedBlocks;
	}

	if ( Object.prototype.hasOwnProperty.call( rootPatch, 'disallowedBlocks' ) ) {
		blocksEverywherePatch.blocks = {
			...( blocksEverywherePatch.blocks || {} ),
			disallowBlocks: rootPatch.disallowedBlocks,
		};
		delete rootPatch.disallowedBlocks;
	}

	[ 'template', 'templateLock' ].forEach( ( key ) => {
		if ( Object.prototype.hasOwnProperty.call( rootPatch, key ) ) {
			editorPatch[ key ] = rootPatch[ key ];
			delete rootPatch[ key ];
		}
	} );

	if ( Object.keys( blocksEverywherePatch ).length > 0 ) {
		rootPatch.blocksEverywhere = mergeSettingsValue( rootPatch.blocksEverywhere || {}, blocksEverywherePatch );
	}

	if ( Object.keys( editorPatch ).length > 0 ) {
		rootPatch.editor = mergeSettingsValue( rootPatch.editor || {}, editorPatch );
	}

	return rootPatch;
}

function applySettingsTransform( settings, transform, context ) {
	const patch = typeof transform === 'function' ? transform( settings, context ) : transform;
	const normalizedPatch = normalizeTransformPatch( patch );

	if ( ! normalizedPatch ) {
		return settings;
	}

	return mergeSettings( settings, normalizedPatch );
}

function resolveModeTransforms( settings, modes ) {
	const configuredModes = settings?.blocksEverywhere?.modes;
	if ( ! isPlainObject( configuredModes ) ) {
		return [];
	}

	return modes.map( ( mode ) => configuredModes[ mode ] ).filter( Boolean );
}

function resolveAllowedBlocks( settings ) {
	const allowedBlocks = settings?.blocksEverywhere?.blocks?.allowBlocks;
	const disallowedBlocks = settings?.blocksEverywhere?.blocks?.disallowBlocks || [];

	if ( ! Array.isArray( allowedBlocks ) ) {
		return;
	}

	const nextAllowedBlocks = allowedBlocks.filter( ( blockName ) => disallowedBlocks.indexOf( blockName ) === -1 );
	settings.blocksEverywhere.blocks.allowBlocks = nextAllowedBlocks;
	settings.editor.allowedBlockTypes = nextAllowedBlocks;
}

function resolveMountSettings(
	settings,
	options: EditorMountOptions = {},
	textarea: HTMLTextAreaElement | null = null
) {
	let resolvedSettings = mergeSettings( {}, settings ) as EditorMountSettings;
	resolvedSettings.editor = resolvedSettings?.editor || {};
	resolvedSettings.blocksEverywhere = resolvedSettings?.blocksEverywhere || {};

	const modes = [
		...normalizeModeNames( resolvedSettings.blocksEverywhere?.mode ),
		...normalizeModeNames( options.mode ),
	].filter( ( mode, index, allModes ) => allModes.indexOf( mode ) === index );

	const transforms = [
		...( Array.isArray( resolvedSettings.blocksEverywhere?.settingsTransforms )
			? resolvedSettings.blocksEverywhere.settingsTransforms
			: [] ),
		...resolveModeTransforms( resolvedSettings, modes ),
		...( Array.isArray( options.settingsTransforms ) ? options.settingsTransforms : [] ),
	];

	transforms.forEach( ( transform ) => {
		resolvedSettings = applySettingsTransform( resolvedSettings, transform, {
			mode: modes[ 0 ],
			modes,
			options,
			settings: resolvedSettings,
			textarea,
		} ) as EditorMountSettings;
		resolvedSettings.editor = resolvedSettings?.editor || {};
		resolvedSettings.blocksEverywhere = resolvedSettings?.blocksEverywhere || {};
	} );

	if ( modes.length > 0 ) {
		resolvedSettings.blocksEverywhere.mode = modes.length === 1 ? modes[ 0 ] : modes;
	}

	resolveAllowedBlocks( resolvedSettings );

	return resolvedSettings;
}

export function mountEditor( node: HTMLTextAreaElement, options: EditorMountOptions = {} ): EditorMount | null {
	const globalSettings = typeof wpBlocksEverywhere !== 'undefined' ? wpBlocksEverywhere : null;
	const baseSettings =
		options.settings && globalSettings
			? mergeSettings( globalSettings, options.settings )
			: options.settings || globalSettings;
	if ( ! baseSettings?.container ) {
		// eslint-disable-next-line no-console
		console.error( 'Blocks Everywhere: settings object missing; cannot initialize editor.' );
		setLoaded( node?.parentNode || document.body );
		return null;
	}

	const existingMount = mountedEditors.get( node );
	if ( existingMount ) {
		return existingMount;
	}

	let containerSource = resolveContainerOption( options.container );
	const settings = resolveMountSettings( baseSettings, options, node );

	// Prefer enclosing containers, so check if one exists outside.
	const outerContainerNode = node.closest( settings.container );
	containerSource = containerSource || outerContainerNode || document.querySelector( settings.container );
	const { container, inserted } = createContainer( node, containerSource );
	const cleanupInsulatedForm = insulateForm( container );
	const cleanupEditorContainer = createEditorContainer( container, node, settings );

	const mount: EditorMount = {
		container,
		focus: () => node.__blocksEverywhereEditor?.focus?.(),
		textarea: node,
		unmount: () => {
			if ( ! mountedEditors.has( node ) ) {
				return;
			}

			cleanupEditorContainer?.();
			cleanupInsulatedForm?.();
			mountedEditors.delete( node );

			if ( inserted ) {
				container.remove();
			}
		},
	};

	mountedEditors.set( node, mount );

	return mount;
}

export function unmountEditor( target: EditorMount | HTMLTextAreaElement ): boolean {
	const mount = 'unmount' in target ? target : mountedEditors.get( target );
	if ( ! mount ) {
		return false;
	}

	mount.unmount();
	return true;
}

export default mountEditor;
