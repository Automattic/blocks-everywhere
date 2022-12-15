import {useEffect, useState} from '@wordpress/element';
import React from 'react';

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
	const [ results, setResults ] = useState< SearchResult[] >( [] );

	useEffect( () => {
		let cancelled = false;

		if (!props.search || props.search.length <= 3 || props.search.startsWith('https://') || props.search.startsWith('http://')) {
			setResults([]);
		} else {
			getSearchResults(props.search).then((newResults) => {
				if (!cancelled) {
					setResults(newResults);
				}
			});
		}
		return () => {
			cancelled = true;
		}
	}, [ props.search ] );

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

async function getSearchResults( search: string ): Promise< SearchResult[] > {
	// https://public-api.wordpress.com/wp/v2/sites/9619154/pages?search=change%20domain
	return [
		{ title: 'Domains » Change a Domain Name', url: 'https://wordpress.com/support/domains/change-a-domain/' },
		{ title: 'How do I change a Domain Name', url: 'https://wordpress.com/forums/topic/change-domain-name-266/' },
	];
}