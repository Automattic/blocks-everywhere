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
	save?: ( blocks: object[], serialized: string, context: ContentBridgeContext, helpers: ContentBridgeHelpers ) => void;
	/** Transform hot replacement content before it is parsed into the mounted editor. */
	replaceContent?: ( content: string, context: ContentBridgeContext, helpers: ContentBridgeHelpers ) => object[] | string | void;
}

declare type BlocksEverywhereLifecycleEventName =
	| 'before-load'
	| 'loaded'
	| 'focus-requested'
	| 'focused'
	| 'blurred'
	| 'error'
	| 'before-unmount'
	| 'unmounted';

declare interface BlocksEverywhereEditorInstance {
	container: HTMLElement;
	focus: () => void;
	textarea: HTMLTextAreaElement;
	unmount: () => void;
}

declare interface BlocksEverywhereLifecycleEventDetail {
	container: HTMLElement;
	error?: unknown;
	instance?: BlocksEverywhereEditorInstance;
	settings: typeof wpBlocksEverywhere;
	textarea: HTMLTextAreaElement;
}

declare interface BlocksEverywhereLifecycleCallbacks {
	onBeforeLoad?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onLoaded?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onFocusRequested?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onFocused?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onBlurred?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onError?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onBeforeUnmount?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onUnmounted?: ( detail: BlocksEverywhereLifecycleEventDetail ) => void;
	onEvent?: ( name: BlocksEverywhereLifecycleEventName, detail: BlocksEverywhereLifecycleEventDetail ) => void;
}

declare interface BlocksEverywhere {
	allowEmbeds: string[];
	blocks: Blocks;
	lifecycle?: BlocksEverywhereLifecycleCallbacks;
	mediaUploadEndpoint?: string;
	__experimentalOnInput?: ( block: unknown ) => unknown;
	__experimentalOnChange?: ( block: unknown ) => unknown;
	__experimentalOnSelection?: ( selection: unknown ) => unknown;
	className?: string;
	toolbar?: Toolbar;
	contentBridge?: ContentBridge;
}

declare interface BlocksEverywhereMountOptions {
	container?: HTMLElement | string | null;
	settings?: typeof wpBlocksEverywhere;
}

declare interface BlocksEverywhereMount {
	container: HTMLElement;
	focus: () => void;
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
		addFilter: ( hookName: string, namespace: string, callback: ( ...args: unknown[] ) => unknown, priority?: number ) => void;
	};
	element: {
		createElement: ( type: string | ( ( props: unknown ) => JSX.Element ), props?: Record< string, unknown > | null, ...children: unknown[] ) => JSX.Element;
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
			slot: 'footer' | 'toolbar' | 'heading',
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
