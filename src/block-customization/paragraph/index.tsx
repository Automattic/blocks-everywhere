/**
 * WordPress dependencies
 */

import { createBlock } from '@wordpress/blocks';

/**
 * Internal dependencies
 */

import edit from './edit';

export default function customizeParagraph( settings ) {
	const hasHeading = wpBlocksEverywhere.iso.blocks.allowBlocks.indexOf( 'core/heading' ) !== -1;
	const boldNodes = [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7' ];
	const plainNodes = [ 'table' ];

	if ( hasHeading ) {
		return settings;
	}

	return {
		...settings,
		edit,
		transforms: {
			...settings.transforms,
			from: [
				...settings.transforms.from,

				// Ensure that shortcodes on a single line dont break
				{
					type: 'shortcode',
					tag: '[a-z][a-z0-9_-]*',
					transform: ( node, match ) => {
						return createBlock( 'core/paragraph', {
							content: match.content,
						} );
					},
					priority: 20,
				},

				// This removes backticks when pasted on their own. This is typically when copy/pasting site health
				{
					type: 'raw',
					isMatch: ( node ) => node.innerText === '`',
					transform: () => null,
				},

				// Converts headings to paragraphs
				{
					type: 'raw',
					isMatch: ( node ) => boldNodes.indexOf( node.nodeName.toLowerCase() ) !== -1,
					transform: ( node ) =>
						createBlock( 'core/paragraph', {
							content: '<strong>' + node.innerText + '</strong>',
						} ),
				},

				// Converts tables to plain text
				{
					type: 'raw',
					isMatch: ( node ) => plainNodes.indexOf( node.nodeName.toLowerCase() ) !== -1,
					transform: ( node ) =>
						createBlock( 'core/paragraph', {
							content: node.innerText,
						} ),
				},
			],
		},
	};
}
