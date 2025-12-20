declare module '*.png';

declare interface Blocks {
	allowBlocks: string[];
}

declare interface Iso {
	allowEmbeds: string[];
	blocks: Blocks;
	__experimentalOnInput?: ( block: unknown ) => unknown;
	__experimentalOnChange?: ( block: unknown ) => unknown;
	__experimentalOnSelection?: ( selection: unknown ) => unknown;
	className?: string;
}

declare const wpBlocksEverywhere: {
	saveTextarea: HTMLTextAreaElement | null;
	pluginsUrl: string;
	allowUrlEmbed: boolean;
	editorType: string;
	iso: Iso;
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
	};
};

declare const wp: {
	hooks: {
		addFilter: ( hookName: string, namespace: string, callback: ( ...args: unknown[] ) => unknown, priority?: number ) => void;
	};
	element: {
		createElement: ( type: string | ( ( props: unknown ) => JSX.Element ), props?: Record< string, unknown > | null, ...children: unknown[] ) => JSX.Element;
	};
};

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
