declare module '*.png';

declare interface Blocks {
	allowBlocks: string[];
}

declare interface Iso {
	allowEmbeds: string[];
	blocks: Blocks;
	__experimentalOnInput?: () => void;
	__experimentalOnChange?: () => void;
}

declare var wpBlocksEverywhere: {
	saveTextarea: any;
	pluginsUrl: string;
	allowUrlEmbed: boolean;
	editorType: string;
	iso: Iso;
	container: string;
	pastePlainText: boolean;
	replaceParagraphCode: boolean;
	autocompleter: boolean;
};
