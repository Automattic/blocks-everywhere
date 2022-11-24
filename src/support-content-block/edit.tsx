import './edit.scss';
import { BlockControls, useBlockProps } from '@wordpress/block-editor';
import { BlockEditProps, createBlock } from '@wordpress/blocks';
import { ToolbarButton, ToolbarGroup, withNotices } from '@wordpress/components';
import { compose } from '@wordpress/compose';
import { renderToString, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { edit } from '@wordpress/icons';
import React from 'react';
import { fetchAttributes, getContentTypeFromUrl, SupportContentBlockAttributes } from './block';
import { EmbedPlaceHolder } from './embed-placeholder';
import { SupportContentEmbed } from './support-content-embed';
import { ContentBlockIcon } from './content-block-icon';
import { useDispatch } from '@wordpress/data';
import { ConfirmContent } from './confirm-content';

type EditProps = BlockEditProps< SupportContentBlockAttributes > & withNotices.Props & { noticeUI: JSX.Element };

/**
 * Renders block in the editor
 */
export const Edit = compose( withNotices )( ( props: EditProps ) => {
	const { attributes, className, setAttributes, noticeOperations, noticeUI } = props;

	const { replaceBlock } = useDispatch( 'core/editor' );

	const instructions = __( 'Embed a Support doc or a forum topic.', 'blocks-everywhere' );
	const mismatchErrorMessage = __( 'It does not look like a Support doc or a forum topic URL.', 'blocks-everywhere' );
	const placeholder = __( 'Enter URL to embed here…', 'blocks-everywhere' );

	const [ isConfirmed, setIsConfirmed ] = useState( props.attributes.isConfirmed );
	const [ isEditing, setIsEditing ] = useState( false );
	const [ url, setUrl ] = useState( attributes.url );

	const onEditModeToggle = () => {
		setIsEditing( ! isEditing );
	};

	const fetchBlockAttributes = async () => {
		const type = getContentTypeFromUrl( url );

		if ( ! type ) {
			noticeOperations.removeAllNotices();
			noticeOperations.createErrorNotice( mismatchErrorMessage );
			return;
		}

		try {
			noticeOperations.removeAllNotices();
			setIsEditing( false );

			setAttributes( { url, content: null } );

			const fetchedAttributes = await fetchAttributes( url );

			setAttributes( fetchedAttributes );
		} catch ( e: any ) {
			setIsEditing( true );
			noticeOperations.createErrorNotice(
				e.message || e || __( 'Unable to fetch the page, check the URL', 'blocks-everywhere' )
			);
		}
	};

	const blockProps = useBlockProps();

	if ( ! isConfirmed ) {
		return (
			<div { ...blockProps }>
				<ConfirmContent
					url={ url }
					confirm={ async () => {
						setIsConfirmed( true );
						await fetchBlockAttributes();
					} }
					cancel={ () => {
						const link = <a href={ url }>{ url }</a>;
						const newBlock = createBlock( 'core/paragraph', {
							content: renderToString( link ),
						} );
						replaceBlock( blockProps[ 'data-block' ], newBlock );
					} }
				/>
			</div>
		);
	}

	return (
		<div { ...blockProps }>
			<BlockControls>
				<ToolbarGroup>
					{ ! isEditing && (
						<ToolbarButton
							icon={ edit }
							label={ __( 'Edit URL', 'blocks-everywhere' ) }
							isActive={ isEditing }
							onClick={ onEditModeToggle }
						/>
					) }
				</ToolbarGroup>
			</BlockControls>
			{ isEditing || ! attributes.url ? (
				<EmbedPlaceHolder
					className={ className }
					icon={ <ContentBlockIcon marginRight /> }
					instructions={ instructions }
					label={ 'Content Embed' }
					url={ url }
					notices={ noticeUI }
					placeholder={ placeholder }
					onSubmit={ fetchBlockAttributes }
					updateUrl={ setUrl }
				/>
			) : (
				<SupportContentEmbed attributes={ attributes } showRelativeDate />
			) }
		</div>
	);
} ) as React.ComponentType< EditProps >;
