/**
 * Content Bridge — exposes the embedded editor content API to external code.
 *
 * This component renders inside the embedded editor React tree and attaches a
 * content API object to the textarea element, allowing external code to read
 * and replace editor content.
 *
 * Usage from external code:
 *   const api = textarea.__blocksEverywhereContentApi;
 *   api.replaceContent( '<p>New content</p>' );
 *   const html = api.getContent();
 */

/**
 * WordPress dependencies
 */
import { useEffect } from '@wordpress/element';
import { parse, serialize } from '@wordpress/blocks';

interface ContentBridgeProps {
	textarea: HTMLTextAreaElement;
	blocks: object[];
	replaceBlocks: ( blocks: object[] ) => void;
	contentBridge?: {
		serializeBlocks: ( blocks: object[] ) => string;
		replaceContent: ( html: string ) => object[];
	};
}

export interface BlocksEverywhereContentApi {
	/**
	 * Replace all editor content with new HTML and reset undo history.
	 * Use when loading a different document (draft switch, template load, etc.).
	 */
	replaceContent: ( html: string ) => void;

	/**
	 * Get the current editor content as serialized block markup (HTML).
	 */
	getContent: () => string;

	/**
	 * Get the current editor blocks as parsed block objects.
	 */
	getBlocks: () => object[];
}

declare global {
	interface HTMLTextAreaElement {
		__blocksEverywhereContentApi?: BlocksEverywhereContentApi;
	}
}

export default function ContentBridge( { textarea, blocks, replaceBlocks, contentBridge }: ContentBridgeProps ) {
	useEffect( () => {
		if ( ! textarea ) {
			return;
		}

		const api: BlocksEverywhereContentApi = {
			replaceContent( html: string ) {
				const parsed = contentBridge?.replaceContent
					? contentBridge.replaceContent( html || '' )
					: parse( html || '' );
				replaceBlocks( parsed );
			},
			getContent() {
				return contentBridge?.serializeBlocks ? contentBridge.serializeBlocks( blocks ) : serialize( blocks );
			},
			getBlocks() {
				return blocks;
			},
		};

		textarea.__blocksEverywhereContentApi = api;

		return () => {
			delete textarea.__blocksEverywhereContentApi;
		};
	}, [ textarea, replaceBlocks, blocks, contentBridge ] );

	return null;
}
