import { useEffect, useState } from '@wordpress/element';
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useDebounce } from 'use-debounce';

type SearchResultsProps = {
	search: string;
	setUrl( url: string ): void;
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

	const [ debouncedSearch ] = useDebounce( props.search, 1000 );

	useEffect( () => {
		setResults( [] );
		setLoading( true );
	}, [ props.search ] );

	useEffect( () => {
		getSearchResults( debouncedSearch ).then( ( newResults ) => {
			setResults( newResults );
			setLoading( false );
		} );
	}, [ debouncedSearch ] );

	if ( ! loading && results.length === 0 ) {
		return null;
	}

	return (
		<div className="be-support-content-search-results">
			<div className="be-support-content-search-results__list">
				{ loading && (
					<div className="be-support-content-search-results__loading">
						<Spinner />
						<span>{ __( 'Loading content suggestions...', 'blocks-everywhere' ) }</span>
					</div>
				) }

				{ results.map( ( result ) => (
					<div
						className="be-support-content-search-results__item"
						onClick={ () => props.setUrl( result.url ) }
					>
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
		url: page.link.replace( 'en.support.wordpress.com', 'wordpress.com/support' ),
	} ) );

	if ( results.length > MAX_RESULTS ) {
		return results.slice( 0, MAX_RESULTS );
	}

	return results;
}
