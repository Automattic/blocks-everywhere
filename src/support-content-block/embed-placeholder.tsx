import React, { useCallback } from 'react';
import { Button, Placeholder } from '@wordpress/components';
import { _x } from '@wordpress/i18n';
import classnames from 'classnames';
import './edit.scss';
import { useState } from '@wordpress/element';
import { debounce } from '@wordpress/compose';
import { SearchResults } from './search-results';

type EmbedPlaceHolderProps = {
	icon: JSX.Element;
	label: string;
	className: string;
	instructions: string;
	notices?: JSX.Element | undefined;
	onSubmit(): void;
	placeholder: string;
	url: string;
	updateUrl( s: string ): void;
};

/**
 * UI for configuring the embed
 */
export const EmbedPlaceHolder = ( props: EmbedPlaceHolderProps ) => {
	const [ search, setSearch ] = useState( null );

	const updateSearch = useCallback(
		debounce( ( search ) => setSearch( search ), 1000 ),
		[]
	);

	return (
		<div className={ classnames( 'be-support-content-placeholder', props.className ) }>
			<Placeholder
				icon={ props.icon }
				label={ props.label }
				instructions={ props.instructions }
				notices={ props.notices }
			>
				<form
					onSubmit={ ( event ) => {
						event.preventDefault();
						props.onSubmit();
					} }
				>
					<input
						type="url"
						value={ props.url }
						className="components-placeholder__input"
						placeholder={ props.placeholder }
						onChange={ ( event ) => {
							props.updateUrl( event.target.value );
							updateSearch( event.target.value );
						} }
					/>
					<Button isPrimary type="submit">
						{ _x( 'Embed', 'button label', 'blocks-everywhere' ) }
					</Button>
				</form>
				<div className="be-support-content-placeholder__search-slot">
					<SearchResults
						search={ search }
						setUrl={ ( url ) => {
							props.updateUrl( url );
							setSearch( url );
						} }
					/>
				</div>
			</Placeholder>
		</div>
	);
};
