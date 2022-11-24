import './edit.scss';
import { BlockControls, useBlockProps } from '@wordpress/block-editor';
import { BlockEditProps } from '@wordpress/blocks';
import { ToolbarButton, ToolbarGroup, withNotices } from '@wordpress/components';
import { compose } from '@wordpress/compose';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { edit } from '@wordpress/icons';
import React from 'react';
import { fetchAttributes, getContentTypeFromUrl, SupportContentBlockAttributes } from './block';
import { EmbedPlaceHolder } from './embed-placeholder';
import { SupportContentEmbed } from './support-content-embed';
import { ContentBlockIcon } from './ContentBlockIcon';

type EditProps = BlockEditProps< SupportContentBlockAttributes > & withNotices.Props & { noticeUI: JSX.Element };

/**
 * Renders block in the editor
 */
export const Edit = compose( withNotices )( ( props: EditProps ) => {
	const { attributes, className, setAttributes, noticeOperations, noticeUI } = props;

	const instructions = __( 'Embed a Support doc or a forum topic.', 'blocks-everywhere' );
	const mismatchErrorMessage = __( 'It does not look like a Support doc or a forum topic URL.', 'blocks-everywhere' );
	const placeholder = __( 'Enter URL to embed here…', 'blocks-everywhere' );

	const [ editing, setEditing ] = useState( false );
	const [ url, setUrl ] = useState( attributes.url );

	const onEditModeToggle = () => {
		setEditing( ! editing );
	};

	const onSubmit = async () => {
		const type = getContentTypeFromUrl( url );

		if ( ! type ) {
			noticeOperations.removeAllNotices();
			noticeOperations.createErrorNotice( mismatchErrorMessage );
			return;
		}

		try {
			setAttributes( { url } );

			const fetchedAttributes = await fetchAttributes( url );

			noticeOperations.removeAllNotices();
			setEditing( false );

			setAttributes( fetchedAttributes );
		} catch ( e: any ) {
			noticeOperations.removeAllNotices();
			noticeOperations.createErrorNotice(
				e.message || e || __( 'Unable to fetch the page, check the URL', 'blocks-everywhere' )
			);
		}
	};

	const blockProps = useBlockProps();

	return (
		<div { ...blockProps }>
			<BlockControls>
				<ToolbarGroup>
					{ ! editing && (
						<ToolbarButton
							icon={ edit }
							label={ __( 'Edit URL', 'blocks-everywhere' ) }
							isActive={ editing }
							onClick={ onEditModeToggle }
						/>
					) }
				</ToolbarGroup>
			</BlockControls>
			{ editing || ! attributes.url ? (
				<EmbedPlaceHolder
					className={ className }
					icon={ <ContentBlockIcon marginRight /> }
					instructions={ instructions }
					label={ 'Content Embed' }
					url={ url }
					notices={ noticeUI }
					placeholder={ placeholder }
					onSubmit={ onSubmit }
					updateUrl={ setUrl }
				/>
			) : (
				<SupportContentEmbed attributes={ attributes } showRelativeDate />
			) }
		</div>
	);
} ) as React.ComponentType< EditProps >;
