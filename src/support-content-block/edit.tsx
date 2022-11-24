import './edit.scss';
import { BlockControls, useBlockProps } from '@wordpress/block-editor';
import { BlockEditProps } from '@wordpress/blocks';
import { MenuItem, ToolbarButton, ToolbarGroup, withNotices, Popover } from '@wordpress/components';
import { compose } from '@wordpress/compose';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { edit } from '@wordpress/icons';
import React from 'react';
import { fetchAttributes, getContentTypeFromUrl, SupportContentBlockAttributes } from './block';
import { EmbedPlaceHolder } from './embed-placeholder';
import { SupportContentEmbed } from './support-content-embed';
import { ContentBlockIcon } from './ContentBlockIcon';

import { __experimentalElevation as Elevation, NavigableMenu } from '@wordpress/components';

const ConfirmContent = ( { url } ) => {
	return (
		<>
			<a href={ url } target="_blank">
				{ url }
			</a>

			<span className="be-support-content-confirm-anchor">
				<Popover variant="unstyled" offset={ 16 } placement="right-start">
					<div className="be-support-content-confirm-content">
						<Elevation value={ 3 } />
						<NavigableMenu role="menu">
							<MenuItem variant="tertiary" className="be-support-content-confirm-content__item">
								Create embed
							</MenuItem>

							<MenuItem
								variant="tertiary"
								isDestructive
								className="be-support-content-confirm-content__item"
							>
								Dismiss
							</MenuItem>
						</NavigableMenu>
					</div>
				</Popover>
			</span>
		</>
	);
};

type EditProps = BlockEditProps< SupportContentBlockAttributes > & withNotices.Props & { noticeUI: JSX.Element };

/**
 * Renders block in the editor
 */
export const Edit = compose( withNotices )( ( props: EditProps ) => {
	const { attributes, className, setAttributes, noticeOperations, noticeUI } = props;

	const instructions = __( 'Embed a Support doc or a forum topic.', 'blocks-everywhere' );
	const mismatchErrorMessage = __( 'It does not look like a Support doc or a forum topic URL.', 'blocks-everywhere' );
	const placeholder = __( 'Enter URL to embed here…', 'blocks-everywhere' );

	const [ isConfirmed, setIsConfirmed ] = useState( false );
	const [ isEditing, setIsEditing ] = useState( false );
	const [ url, setUrl ] = useState( attributes.url );

	const onEditModeToggle = () => {
		setIsEditing( ! isEditing );
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
			setIsEditing( false );

			setAttributes( fetchedAttributes );
		} catch ( e: any ) {
			noticeOperations.removeAllNotices();
			noticeOperations.createErrorNotice(
				e.message || e || __( 'Unable to fetch the page, check the URL', 'blocks-everywhere' )
			);
		}
	};

	const blockProps = useBlockProps();

	if ( ! isConfirmed ) {
		return (
			<div { ...blockProps }>
				<ConfirmContent url={ url } />
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
					onSubmit={ onSubmit }
					updateUrl={ setUrl }
				/>
			) : (
				<SupportContentEmbed attributes={ attributes } showRelativeDate />
			) }
		</div>
	);
} ) as React.ComponentType< EditProps >;
