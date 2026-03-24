/**
 * Content Bridge — exposes IBE's content API to external code.
 *
 * This component renders inside the IsolatedBlockEditor React tree so it has
 * access to the sub-registry's `isolated/editor` store. It bridges the
 * sub-registry gap by attaching a content API object to the textarea element,
 * allowing external code to read and replace editor content.
 *
 * Usage from external code:
 *   const api = textarea.__blocksEverywhereContentApi;
 *   api.replaceContent( '<p>New content</p>' );
 *   const html = api.getContent();
 */

import { useEffect } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { parse, serialize } from '@wordpress/blocks';

interface ContentBridgeProps {
	textarea: HTMLTextAreaElement;
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

export default function ContentBridge( { textarea }: ContentBridgeProps ) {
	const { replaceContent } = useDispatch( 'isolated/editor' );

	const blocks = useSelect(
		( select ) => ( select( 'isolated/editor' ) as any )?.getBlocks?.() ?? [],
		[]
	);

	useEffect( () => {
		if ( ! textarea ) {
			return;
		}

		const api: BlocksEverywhereContentApi = {
			replaceContent( html: string ) {
				const parsed = parse( html || '' );
				replaceContent( parsed );
			},
			getContent() {
				return serialize( blocks );
			},
			getBlocks() {
				return blocks;
			},
		};

		textarea.__blocksEverywhereContentApi = api;

		return () => {
			delete textarea.__blocksEverywhereContentApi;
		};
	}, [ textarea, replaceContent, blocks ] );

	return null;
}
