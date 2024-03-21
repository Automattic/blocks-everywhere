/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { __, _x, isRTL } from '@wordpress/i18n';
import { ToolbarButton, ToggleControl, __experimentalToolsPanelItem as ToolsPanelItem } from '@wordpress/components';
import {
	AlignmentControl,
	BlockControls,
	InspectorControls,
	RichText,
	useBlockProps,
	useSetting,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { formatLtr } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { useOnEnter } from './use-enter';

const name = 'core/paragraph';

function ParagraphRTLControl( { direction, setDirection } ) {
	return (
		isRTL() && (
			<ToolbarButton
				icon={ formatLtr }
				title={ _x( 'Left to right', 'editor button' ) }
				isActive={ direction === 'ltr' }
				onClick={ () => {
					setDirection( direction === 'ltr' ? undefined : 'ltr' );
				} }
			/>
		)
	);
}

function hasDropCapDisabled( align ) {
	return align === ( isRTL() ? 'left' : 'right' ) || align === 'center';
}

function isPossiblyCode( blocks ) {
	const paragraphs = blocks.filter( ( block ) => block.name === 'core/paragraph' );

	// If we have blocks other than paragraphs then it's rich text - dont convert
	if ( paragraphs.length !== blocks.length ) {
		return false;
	}

	// A lot of paragraph blocks? Probably code
	if ( paragraphs.length > 10 ) {
		return true;
	}

	// First block starts with < - code
	if ( blocks.length > 0 && blocks[ 0 ].attributes?.content.startsWith( '&lt;' ) ) {
		return true;
	}

	// Count the number of lines within the blocks
	const lineLength = paragraphs.reduce( ( total, block ) =>( block.attributes?.content.split( '<br>' ).length ?? 1 ) + total, 0 );
	if ( lineLength > 20 ) {
		return true;
	}

	// Not code
	return false;
}

function ParagraphBlock( { attributes, mergeBlocks, onReplace, onRemove, setAttributes, clientId } ) {
	const { align, content, direction, dropCap, placeholder } = attributes;
	const isDropCapFeatureEnabled = useSetting( 'typography.dropCap' );
	const blockProps = useBlockProps( {
		ref: useOnEnter( { clientId, content } ),
		className: classnames( {
			'has-drop-cap': hasDropCapDisabled( align ) ? false : dropCap,
			[ `has-text-align-${ align }` ]: align,
		} ),
		style: { direction },
	} );

	let helpText;
	if ( hasDropCapDisabled( align ) ) {
		helpText = __( 'Not available for aligned text.' );
	} else if ( dropCap ) {
		helpText = __( 'Showing large initial letter.' );
	} else {
		helpText = __( 'Toggle to show a large initial letter.' );
	}

	function hijackedReplace( values ) {
		if ( isPossiblyCode( values ) ) {
			const content = values.map( ( block ) => block.attributes.content ).join( '\n\n' );
			const block = createBlock( 'core/code', { content } );

			onReplace( [ block ] );
			return;
		}

		return onReplace( values );
	}

	return (
		<>
			<BlockControls group="block">
				<AlignmentControl
					value={ align }
					onChange={ ( newAlign ) =>
						setAttributes( {
							align: newAlign,
							dropCap: hasDropCapDisabled( newAlign ) ? false : dropCap,
						} )
					}
				/>
				<ParagraphRTLControl
					direction={ direction }
					setDirection={ ( newDirection ) => setAttributes( { direction: newDirection } ) }
				/>
			</BlockControls>
			{ isDropCapFeatureEnabled && (
				<InspectorControls group="typography">
					<ToolsPanelItem
						hasValue={ () => !! dropCap }
						label={ __( 'Drop cap' ) }
						onDeselect={ () => setAttributes( { dropCap: undefined } ) }
						resetAllFilter={ () => ( { dropCap: undefined } ) }
						panelId={ clientId }
					>
						<ToggleControl
							label={ __( 'Drop cap' ) }
							checked={ !! dropCap }
							onChange={ () => setAttributes( { dropCap: ! dropCap } ) }
							help={ helpText }
							disabled={ hasDropCapDisabled( align ) ? true : false }
						/>
					</ToolsPanelItem>
				</InspectorControls>
			) }

			<RichText
				identifier="content"
				tagName="p"
				{ ...blockProps }
				value={ content }
				onChange={ ( newContent ) => setAttributes( { content: newContent } ) }
				onSplit={ ( value, isOriginal ) => {
					let newAttributes;

					if ( isOriginal || value ) {
						newAttributes = {
							...attributes,
							content: value,
						};
					}

					const block = createBlock( name, newAttributes );

					if ( isOriginal ) {
						block.clientId = clientId;
					}

					return block;
				} }
				onMerge={ mergeBlocks }
				onReplace={ hijackedReplace }
				onRemove={ onRemove }
				aria-label={
					content
						? __( 'Paragraph block' )
						: __( 'Empty block; start writing or type forward slash to choose a block' )
				}
				data-empty={ content ? false : true }
				placeholder={ placeholder || __( 'Type / to choose a block' ) }
				data-custom-placeholder={ placeholder ? true : undefined }
				__unstableEmbedURLOnPaste
				__unstableAllowPrefixTransformations
				__unstablePastePlainText={ wpBlocksEverywhere?.pastePlainText ?? false }
			/>
		</>
	);
}

export default ParagraphBlock;
