import { useEffect, useState } from '@wordpress/element';
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

	const [ loading, setLoading ] = useState( false );

	useEffect( () => {
		let cancelled = false;

		if (
			! props.search ||
			props.search.length <= 3 ||
			props.search.startsWith( 'https://' ) ||
			props.search.startsWith( 'http://' )
		) {
			setResults( [] );
		} else {
			setResults( [] );

			getSearchResults( props.search ).then( ( newResults ) => {
				if ( ! cancelled ) {
					setResults( newResults );
				}
			} );
		}
		return () => {
			cancelled = true;
		};
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

const MAX_RESULTS = 5;

async function getSearchResults( search: string ): Promise< SearchResult[] > {
	const apiUrl = `https://public-api.wordpress.com/wp/v2/sites/en.support.wordpress.com/pages?search=${ encodeURIComponent(
		search
	) }`;

	const response = await fetch( apiUrl );

	if ( ! response.ok ) {
		return [];
	}

	const pages = await response.json();

	const results = pages.map( ( page ) => ( {
		title: page.title.rendered.replace( '&nbsp;', ' ' ),
		url: page.link,
	} ) );

	if ( results.length > MAX_RESULTS ) {
		return results.slice( 0, MAX_RESULTS );
	}

	return results;
}
