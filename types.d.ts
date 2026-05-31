declare module '*.png';

declare interface Blocks {
	allowBlocks: string[];
}

declare interface BlocksEverywherePatternCategory {
	name: string;
	label: string;
}

declare interface BlocksEverywherePattern {
	name: string;
	title: string;
	categories?: string[];
	content: string;
	blockTypes?: string[];
	postTypes?: string[];
}

declare interface BlocksEverywherePatterns {
	/** Additional native Gutenberg block patterns exposed to this editor instance. */
	items?: BlocksEverywherePattern[];
	/** Additional native Gutenberg pattern categories exposed to this editor instance. */
	categories?: BlocksEverywherePatternCategory[];
	/** Optional allow-list of pattern names/slugs/titles for this editor instance. */
	allowPatterns?: string[];
	/** Optional deny-list of pattern names/slugs/titles for this editor instance. */
	disallowPatterns?: string[];
}

declare interface Toolbar {
	/** Document-level block inserter button. Default: true. */
	inserter?: boolean;
	/** Undo button (delegates to core editor history). Default: true. */
	undo?: boolean;
	/** Redo button (delegates to core editor history). Default: true. */
	redo?: boolean;
	/** List view toggle + dropdown panel. Default: true. Uses Gutenberg's experimental list-view surface internally. */
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
	entity?: BlocksEverywhereEntityBridgeEntity;
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
	| 'content-change'
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
	entity?: BlocksEverywhereEntityBridgeEntity;
	focus: () => void;
	getEntityEdits?: () => Record< string, unknown >;
	services?: BlocksEverywhereEditorServices;
	registry?: unknown;
	resetEntity?: ( reason?: string ) => void;
	textarea: HTMLTextAreaElement;
	unmount: () => void;
}

declare interface BlocksEverywherePublicEditorInstance {
	container: HTMLElement;
	context?: Record< string, unknown >;
	entity?: BlocksEverywhereEntityBridgeEntity;
	focus: () => void;
	getEntityEdits?: () => Record< string, unknown >;
	resetEntity?: ( reason?: string ) => void;
	textarea: HTMLTextAreaElement;
	unmount: () => void;
}

declare interface BlocksEverywhereLifecycleEventDetail {
	blocks?: object[];
	container: HTMLElement;
	context?: Record< string, unknown >;
	entity?: BlocksEverywhereEntityBridgeEntity;
	error?: unknown;
	event?: Event;
	getContentApi: () => BlocksEverywhereContentApi | null;
	instance?: BlocksEverywherePublicEditorInstance;
	metadata?: Record< string, unknown >;
	serialized?: string;
	source?: string;
	textarea: HTMLTextAreaElement;
}

declare interface BlocksEverywhereLifecycleCallbackDetail extends BlocksEverywhereLifecycleEventDetail {
	instance?: BlocksEverywhereEditorInstance;
	settings: typeof wpBlocksEverywhere;
}

declare interface BlocksEverywhereLifecycleCallbacks {
	onBeforeMount?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onMounted?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onBeforeLoad?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onLoaded?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onInput?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onChange?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onContentChange?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onSave?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onSubmit?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onFocusRequested?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onFocused?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onBlurred?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onError?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onBeforeUnmount?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onUnmounted?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onEvent?: ( name: BlocksEverywhereLifecycleEventName, detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
}

declare interface BlocksEverywhereHostAdapterContext {
	container: HTMLElement;
	getContentApi: () => BlocksEverywhereContentApi | null;
	instance: BlocksEverywhereEditorInstance;
	entity?: BlocksEverywhereEntityBridgeEntity;
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
	onBeforeMount?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onMounted?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onBeforeLoad?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onLoaded?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onFocusRequested?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onFocused?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onBlurred?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onSubmit?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onError?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onBeforeUnmount?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onUnmounted?: ( detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onEvent?: ( name: BlocksEverywhereLifecycleEventName, detail: BlocksEverywhereLifecycleCallbackDetail ) => void;
	onContent?: (
		name: 'input' | 'change',
		blocks: object[],
		serialized: string,
		context: BlocksEverywhereHostAdapterContext
	) => void;
	onInput?: ( blocks: object[], serialized: string, context: BlocksEverywhereHostAdapterContext ) => void;
	onChange?: ( blocks: object[], serialized: string, context: BlocksEverywhereHostAdapterContext ) => void;
	onContentChange?: (
		blocks: object[],
		serialized: string,
		context: BlocksEverywhereHostAdapterContext,
		meta: { source: 'input' | 'change' }
	) => void;
	/** Legacy alias for content-change forwarding; persistence saves should use explicit host callbacks. */
	onSave?: (
		blocks: object[],
		serialized: string,
		context: BlocksEverywhereHostAdapterContext,
		meta: { source: 'input' | 'change' }
	) => void;
}

declare interface Chrome {
	/** Layout mode class applied to the editor shell. Default: inline. */
	mode?: string;
	/** Host-owned bar above the primary toolbar. Default: false. */
	topBar?: boolean;
	/** Primary toolbar row. Default: true. */
	toolbar?: boolean;
	/** Host-owned row below the primary toolbar. Default: false. */
	secondaryToolbar?: boolean;
	/** Footer action area. Default: true. */
	footer?: boolean;
	/** Host-owned sidebar before the editor canvas. Default: false. BE provides the slot only; host content remains adapter-owned. */
	documentSidebar?: boolean;
	/** Host-owned sidebar after the editor canvas. Default: false. BE provides the slot only; host content remains adapter-owned. */
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

declare interface BlocksEverywhereEntityBridgeEntity {
	id?: string | number;
	type?: string;
	parentId?: string | number;
	revision?: string | number;
	authorId?: string | number;
	capabilities?: Record< string, unknown >;
	urls?: Record< string, string >;
	metadata?: Record< string, unknown >;
	[ key: string ]: unknown;
}

declare interface BlocksEverywhereEntityBridgeContext {
	blockContext: Record< string, unknown >;
	container: HTMLElement;
	context: Record< string, unknown >;
	editorType?: string;
	entity: BlocksEverywhereEntityBridgeEntity;
	getContentApi: () => BlocksEverywhereContentApi | null;
	instance: BlocksEverywhereEditorInstance;
	settings: typeof wpBlocksEverywhere;
	source?: string;
	textarea: HTMLTextAreaElement;
}

declare interface BlocksEverywhereEntityBridgeEdits {
	blocks?: object[];
	content?: string;
	entity?: BlocksEverywhereEntityBridgeEntity;
	serialized?: string;
	source?: 'input' | 'change' | string;
	[ key: string ]: unknown;
}

declare interface BlocksEverywhereEntityBridge {
	entity?: BlocksEverywhereEntityBridgeEntity;
	/** Legacy shorthand fields are copied into entity after entity metadata. */
	id?: string | number;
	type?: string;
	parentId?: string | number;
	revision?: string | number;
	authorId?: string | number;
	capabilities?: Record< string, unknown >;
	urls?: Record< string, string >;
	metadata?: Record< string, unknown >;
	load?: ( context: BlocksEverywhereEntityBridgeContext ) => object[] | string | void;
	getEdits?: ( context: BlocksEverywhereEntityBridgeContext ) => BlocksEverywhereEntityBridgeEdits | void;
	saveEdits?: (
		edits: BlocksEverywhereEntityBridgeEdits,
		context: BlocksEverywhereEntityBridgeContext
	) => void;
	reset?: ( context: BlocksEverywhereEntityBridgeContext ) => void;
	[ key: string ]: unknown;
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
	entityBridge?: BlocksEverywhereEntityBridge;
	features?: Record< string, unknown >;
	initialContent?: BlocksEverywhereInitialContent;
	patterns?: BlocksEverywherePatterns;
	blockPatterns?: BlocksEverywherePattern[];
	patternCategories?: BlocksEverywherePatternCategory[];
	allowedPatterns?: string[];
	disallowedPatterns?: string[];
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
	context?: string;
	contextId?: string;
	settingsKey?: string;
	data?: BlocksEverywhereData;
	entityBridge?: BlocksEverywhereEntityBridge;
	lifecycle?: BlocksEverywhereLifecycleCallbacks;
	hostAdapter?: BlocksEverywhereHostAdapter;
	hostContext?: Record< string, unknown >;
	initialContent?: BlocksEverywhereInitialContent;
	patterns?: BlocksEverywherePatterns;
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
	/** Detached chrome uses unstable Gutenberg inserter/popover internals and should be treated as opt-in adapter chrome. */
	sidebar?: {
		detached?: {
			target?: string | Element | null;
			className?: string;
			persistent?: boolean;
			/** Reserved for future stable list-view support; current detached chrome renders the inserter panel. */
			defaultView?: 'inserter' | 'list-view';
		};
	};
}

declare interface BlocksEverywhereInitialContentHelpers {
	parse: ( content: string ) => object[];
	rawHandler: ( options: unknown ) => object[];
	serialize: ( blocks: object[] ) => string;
	getTextareaContent: () => string;
	setTextareaContent: ( content: string ) => void;
	textarea: HTMLTextAreaElement;
	settings: typeof wpBlocksEverywhere;
}

declare interface BlocksEverywhereInitialContentContext {
	blockContext: Record< string, unknown >;
	blocks: object[];
	context: Record< string, unknown >;
	entity?: BlocksEverywhereEntityBridgeEntity;
	editorType?: string;
	hasContent: boolean;
	serialized: string;
	source: 'initial';
	textarea: HTMLTextAreaElement;
	settings: typeof wpBlocksEverywhere;
}

declare type BlocksEverywhereInitialContentValue =
	| string
	| object[]
	| null
	| undefined
	| ( (
		context: BlocksEverywhereInitialContentContext,
		helpers: BlocksEverywhereInitialContentHelpers
	) => string | object[] | null | undefined );

declare type BlocksEverywhereInitialContentTransform = (
	serialized: string,
	context: BlocksEverywhereInitialContentContext,
	helpers: BlocksEverywhereInitialContentHelpers
) => string | object[] | null | undefined;

declare interface BlocksEverywhereInitialContent {
	/** Optional adapter-provided source loaded before transforms run. */
	load?: BlocksEverywhereInitialContentValue;
	/** Single transform or pipeline that orchestrates adapter-owned conversion before mount. */
	transform?: BlocksEverywhereInitialContentTransform | BlocksEverywhereInitialContentTransform[];
	transforms?: BlocksEverywhereInitialContentTransform[];
	/** Empty-state starter content. Heavy conversion should live in adapter-provided transforms, not BE. */
	pattern?: BlocksEverywhereInitialContentValue;
	template?: BlocksEverywhereInitialContentValue;
	starter?: BlocksEverywhereInitialContentValue;
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
	entity?: BlocksEverywhereEntityBridgeEntity;
	focus: () => void;
	getEntityEdits?: () => Record< string, unknown >;
	registry?: unknown;
	resetEntity?: ( reason?: string ) => void;
	textarea: HTMLTextAreaElement;
	unmount: () => void;
}

declare const wpBlocksEverywhere: {
	saveTextarea: string;
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

declare const wpBlocksEverywhereSettings: Record< string, typeof wpBlocksEverywhere >;

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
	wpBlocksEverywhereSettings?: Record< string, typeof wpBlocksEverywhere >;
	blocksEverywhere?: {
		mountEditor: (
			textarea: HTMLTextAreaElement,
			options?: BlocksEverywhereMountOptions
		) => BlocksEverywhereMount | null;
		unmount: ( target: BlocksEverywhereMount | HTMLTextAreaElement ) => boolean;
		getContentApi: ( textarea: HTMLTextAreaElement ) => BlocksEverywhereContentApi | null;
		getEditor: ( textarea: HTMLTextAreaElement ) => BlocksEverywhereEditorInstance | null;
		getSettings: ( key?: string ) => typeof wpBlocksEverywhere | null;
		registerSettings: ( key: string, settings: typeof wpBlocksEverywhere ) => typeof wpBlocksEverywhere | null;
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
