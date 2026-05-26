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

declare interface BlocksEverywhere {
	allowEmbeds: string[];
	blocks: Blocks;
	mediaUploadEndpoint?: string;
	__experimentalOnInput?: ( block: unknown ) => unknown;
	__experimentalOnChange?: ( block: unknown ) => unknown;
	__experimentalOnSelection?: ( selection: unknown ) => unknown;
	className?: string;
	toolbar?: Toolbar;
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
		registerSlotFill: (
			slot: 'footer' | 'toolbar' | 'heading',
			renderFn: ( textarea: HTMLTextAreaElement ) => unknown
		) => () => void;
	};
}

declare interface HTMLElement {
	__extrachillDraftMoveInstalled?: boolean;
	__extrachillDraftTitleInstalled?: boolean;
	__extrachillDraftSubmitInstalled?: boolean;
	__extrachillReplyDraftContextInstalled?: boolean;
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
