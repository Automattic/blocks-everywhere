declare module '*.png';

declare interface Blocks {
	allowBlocks: string[];
}

declare interface Toolbar {
	/** Document-level block inserter button. Default: true. */
	inserter?: boolean;
	/** Undo button (delegates to core editor history). Default: true. */
	undo?: boolean;
	/** Redo button (delegates to core editor history). Default: true. */
	redo?: boolean;
	/** List view toggle + dropdown panel. Default: true. */
	listView?: boolean;
	/** Selected-block format toolbar (contextual paragraph/bold/link buttons). Default: true. */
	blockTools?: boolean;
}

declare interface ContentBridgeHelpers {
	parse: ( content: string ) => object[];
	rawHandler: ( options: unknown ) => object[];
	serialize: ( blocks: object[] ) => string;
	getTextareaContent: () => string;
	setTextareaContent: ( content: string ) => void;
	textarea: HTMLTextAreaElement | null;
	settings: typeof wpBlocksEverywhere;
}

declare interface ContentBridgeContext {
	blockContext?: Record< string, unknown >;
	context?: Record< string, unknown >;
	textarea: HTMLTextAreaElement | null;
	settings: typeof wpBlocksEverywhere;
	editorType?: string;
}

declare interface ContentBridge {
	/** Preserve the default textarea write-through behavior. Default: true. */
	syncTextarea?: boolean;
	/** Override or transform initial content loading. Return block objects or serialized markup. */
	load?: ( helpers: ContentBridgeHelpers, context: ContentBridgeContext ) => object[] | string | void;
	/** Override serialized block markup before any save forwarding runs. */
	serialize?: ( blocks: object[], context: ContentBridgeContext, helpers: ContentBridgeHelpers ) => string | void;
	/** Receive parsed blocks and serialized markup whenever editor content changes. */
	save?: (
		blocks: object[],
		serialized: string,
		context: ContentBridgeContext,
		helpers: ContentBridgeHelpers
	) => void;
	/** Transform hot replacement content before it is parsed into the mounted editor. */
	replaceContent?: (
		content: string,
		context: ContentBridgeContext,
		helpers: ContentBridgeHelpers
	) => object[] | string | void;
}

declare type BlocksEverywhereLifecycleEventName =
	| 'before-mount'
	| 'mounted'
	| 'before-load'
	| 'loaded'
	| 'input'
	| 'change'
	| 'save'
	| 'submit'
	| 'focus-requested'
	| 'focused'
	| 'blurred'
	| 'error'
	| 'before-unmount'
	| 'unmounted';

declare interface BlocksEverywhereEditorInstance {
	container: HTMLElement;
	context?: Record< string, unknown >;
	focus: () => void;
	services?: BlocksEverywhereEditorServices;
	registry?: unknown;
	textarea: HTMLTextAreaElement;
	unmount: () => void;
}

declare interface BlocksEverywhereLifecycleEventDetail {
	blocks?: object[];
	container: HTMLElement;
	context?: Record< string, unknown >;
	error?: unknown;
	event?: Event;
	getContentApi: () => BlocksEverywhereContentApi | null;
	instance?: BlocksEverywhereEditorInstance;
	metadata?: Record< string, unknown >;
	serialized?: string;
	settings: typeof wpBlocksEverywhere;
	source?: string;
	textarea: HTMLTextAreaElement;
}

declare interface BlocksEverywhereLifecycleCallbacks {
	onBeforeMount?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onMounted?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onBeforeLoad?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onLoaded?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onInput?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onChange?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onSave?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onSubmit?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onFocusRequested?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onFocused?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onBlurred?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onError?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onBeforeUnmount?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onUnmounted?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onEvent?: ( name: BlocksEverywhereLifecycleEventName, detail: BlocksEverywhereLifecycleEventDetail ) => void;
}

declare interface BlocksEverywhereHostAdapterContext {
	container: HTMLElement;
	getContentApi: () => BlocksEverywhereContentApi | null;
	instance: BlocksEverywhereEditorInstance;
	metadata?: Record< string, unknown >;
	settings: typeof wpBlocksEverywhere;
	textarea: HTMLTextAreaElement;
}

declare interface BlocksEverywhereHostAdapter {
	/** Optional host metadata copied into lifecycle event details and adapter context. */
	metadata?: Record< string, unknown >;
	/** Called once after the editor container and instance API exist. Return cleanup for unmount. */
	setup?: ( context: BlocksEverywhereHostAdapterContext ) => void | ( () => void );
	beforeMount?: ( context: BlocksEverywhereHostAdapterContext ) => void;
	onBeforeMount?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onMounted?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onBeforeLoad?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onLoaded?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onFocusRequested?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onFocused?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onBlurred?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onSubmit?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onError?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onBeforeUnmount?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onUnmounted?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onEvent?: ( name: BlocksEverywhereLifecycleEventName, detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onContent?: (
		name: 'input' | 'change',
		blocks: object[],
		serialized: string,
		context: BlocksEverywhereHostAdapterContext
	) => void;
	onInput?: ( blocks: object[], serialized: string, context: BlocksEverywhereHostAdapterContext ) => void;
	onChange?: ( blocks: object[], serialized: string, context: BlocksEverywhereHostAdapterContext ) => void;
	onSave?: (
		blocks: object[],
		serialized: string,
		context: BlocksEverywhereHostAdapterContext,
		meta: { source: 'input' | 'change' }
	) => void;
}

declare interface Chrome {
	/** Layout mode class applied to the editor shell. Default: inline. */
	mode?: 'inline' | 'full-height' | 'modal' | 'compact';
	/** Host-owned bar above the primary toolbar. Default: false. */
	topBar?: boolean;
	/** Primary toolbar row. Default: true. */
	toolbar?: boolean;
	/** Host-owned row below the primary toolbar. Default: false. */
	secondaryToolbar?: boolean;
	/** Footer action area. Default: true. */
	footer?: boolean;
	/** Host-owned sidebar before the editor canvas. Default: false. */
	documentSidebar?: boolean;
	/** Host-owned sidebar after the editor canvas. Default: false. */
	inserterSidebar?: boolean;
}

declare interface BlocksEverywhereEditorServiceContext {
	container?: HTMLElement;
	editorType?: string;
	mode?: 'inline' | 'full-height' | 'modal' | 'compact';
	settings: typeof wpBlocksEverywhere;
	textarea?: HTMLTextAreaElement;
}

declare interface BlocksEverywherePermissionsService {
	can?: ( capability: string, context: BlocksEverywhereEditorServiceContext ) => boolean | undefined;
	canUploadMedia?: boolean | ( ( context: BlocksEverywhereEditorServiceContext ) => boolean | undefined );
}

declare type BlocksEverywhereAutosaveService =
	| ( ( payload: Record< string, unknown >, context: BlocksEverywhereEditorServiceContext ) => unknown )
	| {
			delay?: number;
			save?: ( payload: Record< string, unknown >, context: BlocksEverywhereEditorServiceContext ) => unknown;
			cancel?: ( context: BlocksEverywhereEditorServiceContext ) => void;
	  }
	| null;

declare type BlocksEverywhereNoticesService =
	| ( ( type: string, message: string, context: BlocksEverywhereEditorServiceContext, details?: unknown ) => void )
	| {
			error?: ( message: string, context: BlocksEverywhereEditorServiceContext, details?: unknown ) => void;
			success?: ( message: string, context: BlocksEverywhereEditorServiceContext, details?: unknown ) => void;
			warning?: ( message: string, context: BlocksEverywhereEditorServiceContext, details?: unknown ) => void;
			info?: ( message: string, context: BlocksEverywhereEditorServiceContext, details?: unknown ) => void;
	  }
	| null;

declare interface BlocksEverywhereEditorServices {
	apiFetch?: ( options: Record< string, unknown > ) => Promise< unknown >;
	apiFetchMiddleware?: ( options: Record< string, unknown >, next: Function ) => unknown;
	apiFetchMiddlewares?: Array< ( options: Record< string, unknown >, next: Function ) => unknown >;
	autosave?: BlocksEverywhereAutosaveService;
	fetchLinkSuggestions?: ( search: string, searchOptions?: Record< string, unknown > ) => Promise< unknown >;
	mediaUpload?: Function | null;
	notices?: BlocksEverywhereNoticesService;
	permissions?: BlocksEverywherePermissionsService | null;
}

declare interface BlocksEverywhereSettingsTransformContext {
	mode?: string;
	modes: string[];
	options: BlocksEverywhereMountOptions;
	settings: typeof wpBlocksEverywhere;
	textarea: HTMLTextAreaElement | null;
}

declare type BlocksEverywhereSettingsTransform =
	| Record< string, unknown >
	| ( (
		settings: typeof wpBlocksEverywhere,
		context: BlocksEverywhereSettingsTransformContext
	) => Record< string, unknown > | void );

declare interface BlocksEverywhereModeSettings {
	allowedBlocks?: string[];
	disallowedBlocks?: string[];
	blocks?: Partial< Blocks > & { disallowBlocks?: string[] };
	chrome?: Chrome;
	className?: string;
	defaultPreferences?: Record< string, unknown >;
	editor?: Record< string, unknown >;
	features?: Record< string, unknown >;
	preferenceKey?: string;
	services?: BlocksEverywhereEditorServices;
	servicesByMode?: Record< string, BlocksEverywhereEditorServices >;
	settingsTransforms?: BlocksEverywhereSettingsTransform[];
	sidebar?: Record< string, unknown >;
	template?: unknown[];
	templateLock?: false | 'all' | 'insert';
	toolbar?: Toolbar;
	blocksEverywhere?: Partial< BlocksEverywhere >;
}

declare type BlocksEverywhereSlotName =
	| 'footer'
	| 'toolbar'
	| 'heading'
	| 'topBar'
	| 'actions'
	| 'secondaryToolbar'
	| 'documentSidebar'
	| 'inserterSidebar'
	| 'windowControls';

declare interface BlocksEverywhere {
	allowEmbeds: string[];
	blocks: Blocks;
	data?: BlocksEverywhereData;
	lifecycle?: BlocksEverywhereLifecycleCallbacks;
	hostAdapter?: BlocksEverywhereHostAdapter;
	hostContext?: Record< string, unknown >;
	mediaUploadEndpoint?: string;
	__experimentalOnInput?: ( block: unknown ) => unknown;
	__experimentalOnChange?: ( block: unknown ) => unknown;
	__experimentalOnSelection?: ( selection: unknown ) => unknown;
	className?: string;
	toolbar?: Toolbar;
	contentBridge?: ContentBridge;
	chrome?: Chrome;
	mode?: string | string[];
	modes?: Record< string, BlocksEverywhereModeSettings | BlocksEverywhereSettingsTransform >;
	preferenceKey?: string;
	services?: BlocksEverywhereEditorServices;
	servicesByMode?: Record< string, BlocksEverywhereEditorServices >;
	settingsTransforms?: BlocksEverywhereSettingsTransform[];
}

declare interface BlocksEverywhereDataRegistrationHelpers {
	blockContext: Record< string, unknown >;
	context: Record< string, unknown >;
	instance: BlocksEverywhereEditorInstance;
	registry: unknown;
	settings: typeof wpBlocksEverywhere;
	textarea: HTMLTextAreaElement;
}

declare type BlocksEverywhereDataStoreRegistration =
	| unknown
	| ( ( helpers: BlocksEverywhereDataRegistrationHelpers ) => void | ( () => void ) )
	| { descriptor: unknown }
	| { name: string; config: unknown }
	| { register: ( helpers: BlocksEverywhereDataRegistrationHelpers ) => void | ( () => void ) };

declare interface BlocksEverywhereData {
	/** Read-only per-instance context for lifecycle callbacks, content bridges, slot fills, and host adapters. */
	context?: Record< string, unknown >;
	/** Explicit block context values exposed through Gutenberg's BlockContextProvider. */
	blockContext?: Record< string, unknown >;
	/** Per-instance store descriptors or registration callbacks. */
	stores?: BlocksEverywhereDataStoreRegistration[];
	/** Low-level registration escape hatch for custom registry setup. */
	register?: ( helpers: BlocksEverywhereDataRegistrationHelpers ) => void | ( () => void );
}

declare interface BlocksEverywhereMountOptions {
	container?: HTMLElement | string | null;
	mode?: string | string[];
	services?: BlocksEverywhereEditorServices;
	settings?: Partial< typeof wpBlocksEverywhere >;
	settingsTransforms?: BlocksEverywhereSettingsTransform[];
}

declare interface BlocksEverywhereMount {
	container: HTMLElement;
	context?: Record< string, unknown >;
	focus: () => void;
	registry?: unknown;
	textarea: HTMLTextAreaElement;
	unmount: () => void;
}

declare const wpBlocksEverywhere: {
	saveTextarea: HTMLTextAreaElement | null;
	pluginsUrl: string;
	allowUrlEmbed: boolean;
	editorType: string;
	blocksEverywhere: BlocksEverywhere;
	container: string;
	pastePlainText: boolean;
	replaceParagraphCode: boolean;
	autocompleter: boolean;
	patchEmoji?: boolean;
	version?: string;
	editor?: Record< string, unknown >;
	restUrl?: string;
	restNonce?: string;
	bbpress?: {
		topicId: number;
		forumId?: number;
		isTopicEdit?: boolean;
		isReplyEdit?: boolean;
		draftEndpoint?: string;
		mediaEndpoint?: string;
	};
};

declare const wp: {
	hooks: {
		addFilter: (
			hookName: string,
			namespace: string,
			callback: ( ...args: unknown[] ) => unknown,
			priority?: number
		) => void;
	};
	element: {
		createElement: (
			type: string | ( ( props: unknown ) => JSX.Element ),
			props?: Record< string, unknown > | null,
			...children: unknown[]
		) => JSX.Element;
	};
	blocks?: {
		unregisterBlockVariation?: ( blockName: string, variationName: string ) => void;
	};
};

declare interface Window {
	wp?: typeof wp;
	wpApiSettings?: {
		root?: string;
		nonce?: string;
	};
	blocksEverywhere?: {
		mountEditor: (
			textarea: HTMLTextAreaElement,
			options?: BlocksEverywhereMountOptions
		) => BlocksEverywhereMount | null;
		unmount: ( target: BlocksEverywhereMount | HTMLTextAreaElement ) => boolean;
		getContentApi: ( textarea: HTMLTextAreaElement ) => BlocksEverywhereContentApi | null;
		getEditor: ( textarea: HTMLTextAreaElement ) => BlocksEverywhereEditorInstance | null;
		registerSlotFill: (
			slot: BlocksEverywhereSlotName,
			renderFn: ( textarea: HTMLTextAreaElement ) => unknown
		) => () => void;
	};
}

declare interface BlocksEverywhereContentApi {
	replaceContent: ( html: string ) => void;
	getContent: () => string;
	getBlocks: () => object[];
}

declare interface HTMLElement {
	__blocksEverywhereEditor?: BlocksEverywhereEditorInstance;
	__blocksEverywhereDraftMoveInstalled?: boolean;
	__blocksEverywhereDraftTitleInstalled?: boolean;
	__blocksEverywhereDraftSubmitInstalled?: boolean;
	__blocksEverywhereReplyDraftContextInstalled?: boolean;
}

declare const jQuery: ( selector: string | Element ) => {
	val: ( value?: string ) => string | undefined;
	find: ( selector: string ) => { length: number };
	trigger: ( event: string ) => void;
};

declare enum ContentType {
	SUPPORT_PAGE = 'support_page',
	FORUM_TOPIC = 'forum_topic',
}

declare interface SupportContentBlockAttributes {
	url: string;
	isConfirmed: boolean;
	title: string;
	content: string;
	source: string;
	sourceURL: string;
	minutesToRead: number;
	likes: number;
	status: string;
	author: {
		name: string;
		avatar: string;
	};
	created: string;
}

declare interface SearchResult {
	id: number;
	title: {
		rendered: string;
	};
	link: string;
	content?: {
		rendered: string;
	};
}

declare interface EditProps {
	attributes: SupportContentBlockAttributes;
	setAttributes: ( attributes: Partial< SupportContentBlockAttributes > ) => void;
	isSelected?: boolean;
	className?: string;
}
