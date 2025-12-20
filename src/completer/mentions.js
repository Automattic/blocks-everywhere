/**
 * WordPress dependencies
 */

import apiFetch from '@wordpress/api-fetch';

const mentionsPath = ( term = '' ) => {
	const base = '/extrachill/v1/users/search';
	const query = new URLSearchParams( {
		context: 'mentions',
		term,
	} );

	return `${ base }?${ query.toString() }`;
};

const normalizeUsers = ( users ) => {
	if ( ! Array.isArray( users ) ) {
		return [];
	}

	return users
		.filter( ( user ) => user && user.slug )
		.map( ( user ) => ( {
			id: user.id,
			slug: user.slug,
			username: user.username,
			avatarUrl: user.avatar_url,
			profileUrl: user.profile_url,
		} ) );
};

const getUserLabel = ( user ) => {
	const avatar = user.avatarUrl
		? wp.element.createElement( 'img', {
				className: 'editor-autocompleters__user-avatar',
				alt: '',
				src: user.avatarUrl,
		  } )
		: wp.element.createElement( 'span', {
				className: 'editor-autocompleters__no-avatar',
		  } );

	return wp.element.concatChildren( [
		avatar,
		wp.element.createElement( 'span', { className: 'editor-autocompleters__user-name' }, `@${ user.slug }` ),
		wp.element.createElement( 'span', { className: 'editor-autocompleters__user-slug' }, user.username ),
	] );
};

const getMentionLink = ( user ) => {
	const href = user.profileUrl || `/u/${ user.slug }`;
	return wp.element.createElement( 'a', { href, className: 'ec-mention' }, `@${ user.slug }` );
};

export default {
	name: 'ecMentions',
	className: 'editor-autocompleters__user',
	triggerPrefix: '@',
	isDebounced: true,
	async options( filterValue ) {
		if ( ! filterValue || filterValue.length < 2 ) {
			return [];
		}

		try {
			const users = await apiFetch( { path: mentionsPath( filterValue ) } );
			return normalizeUsers( users );
		} catch ( error ) {
			return [];
		}
	},
	getOptionKeywords( user ) {
		const values = [ user.slug, user.username ].filter( Boolean );
		return values.flatMap( ( value ) => String( value ).split( /\s+/ ) );
	},
	getOptionLabel( user ) {
		return getUserLabel( user );
	},
	getOptionCompletion( user ) {
		return {
			action: 'insert-at-caret',
			value: wp.element.concatChildren( [ getMentionLink( user ), ' ' ] ),
		};
	},
};
