declare module '*.png';

declare interface Blocks {
	allowBlocks: string[];
}

declare interface Iso {
	allowEmbeds: string[];
	blocks: Blocks;
}

declare var wpBlocksEverywhere: {
	saveTextarea: any;
	pluginsUrl: string;
	allowUrlEmbed: boolean;
	editorType: string;
	iso: Iso;
	container: string;
	pastePlainText: boolean;
};
