import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import React from 'react';
import { __experimentalElevation as Elevation, MenuItem, NavigableMenu, Popover } from '@wordpress/components';

type SearchResultsProps = {
	search: string;
};

type SearchResult = {
	title: string;
	url: string;
};

/**
 * Search for matching content and display search results
 * props.search is the search string, should be debounced.
 */
export const SearchResults = ( props: SearchResultsProps ) => {
	const [ results, setResults ] = useState< SearchResult[] >( [
		{ title: 'Domains » Change a Domain Name', url: 'https://wordpress.com/support/domains/change-a-domain/' },
		{ title: 'How do I change a Domain Name', url: 'https://wordpress.com/forums/topic/change-domain-name-266/' },
	] );

	useEffect( () => {
		// start fetching
	}, [ props.search ] );

	if ( ! props.search || props.search.length < 3 ) {
		return null;
	}

	if ( props.search.startsWith( 'https://' ) || props.search.startsWith( 'http://' ) ) {
		return null;
	}

	if ( results.length === 0 ) {
		return null;
	}

	return (
		<div className="be-support-content-search-results">
			<div className="be-support-content-search-results__list">
				{ results.map( ( result ) => (
					<div className="be-support-content-search-results__item">
						<div className="be-support-content-search-results__title">{ result.title }</div>
						<a className="be-support-content-search-results__link" href={ result.url } target="_blank">
							{ result.url }
						</a>
					</div>
				) ) }
			</div>
		</div>
	);
};
