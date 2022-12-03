import React from 'react';
import { BlockInstance, createBlock, registerBlockType } from '@wordpress/blocks';
import { renderToString } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { getContentTypeFromUrl, SupportContentBlockAttributes } from './block';
import { Edit } from './edit';
import { Save } from './save';
import { ContentBlockIcon } from './content-block-icon';

/**
 * Block variation for support pages
 */
registerBlockType( 'blocks-everywhere/support-content', {
	title: __( 'Content Embed', 'blocks-everywhere' ),
	icon: <ContentBlockIcon />,
	category: 'embed',
	description: __( 'Embed a page from the WordPress Guide or a forum topic', 'blocks-everywhere' ),
	keywords: [ __( 'guide' ), __( 'support' ), __( 'how to' ), __( 'howto' ), __( 'forum' ), __( 'topic' ) ],
	attributes: {
		url: {
			type: 'string',
		},
		isConfirmed: {
			type: 'boolean',
			default: true,
		},
		title: {
			type: 'string',
			source: 'text',
			selector: '.be-support-content__title',
		},
		content: {
			type: 'string',
			source: 'text',
			selector: '.be-support-content__content',
		},
		source: {
			type: 'string',
			source: 'text',
			selector: '.be-support-content__link',
		},
		sourceURL: {
			type: 'string',
			source: 'attribute',
			selector: '.be-support-content__link',
			attribute: 'href',
		},
		minutesToRead: {
			type: 'number',
		},
		likes: {
			type: 'number',
		},
		status: {
			type: 'string',
		},
		author: {
			type: 'string',
		},
		created: {
			type: 'string',
			source: 'text',
			selector: '.be-support-content__created',
		},
	},
	supports: {
		align: true,
		anchor: true,
	},
	edit: Edit,
	save: Save,
	transforms: {
		from: [
			{
				type: 'raw',
				isMatch: ( node: Element ): boolean => {
					if ( node.nodeName !== 'P' ) {
						return false;
					}

					const nodeText = node.textContent?.trim() ?? '';

					return !! getContentTypeFromUrl( nodeText );
				},
				transform: ( node: Element ): BlockInstance => {
					const nodeText = node.textContent?.trim() ?? '';

					const block = createBlock( 'blocks-everywhere/support-content', {
						url: nodeText,
						isConfirmed: false,
					} );

					return block;
				},
			},
		],
		to: [
			{
				type: 'block',
				blocks: [ 'core/paragraph' ],
				transform: ( { url }: SupportContentBlockAttributes ) => {
					const link = <a href={ url }>{ url }</a>;
					return createBlock( 'core/paragraph', {
						content: renderToString( link ),
					} );
				},
			},
		],
	},
} );
