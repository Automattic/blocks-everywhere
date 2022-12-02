import { __ } from '@wordpress/i18n';

export const SUPPORT_PAGE_PATTERN = /^https?:\/\/wordpress\.com\/((?<lang>[a-z]{2})\/)?support\/(?<slug>\S+)$/i;
/*
Forum Pattern cases

https://wordpress.com/forums/topic/ecommerce-for-1-month/?view=all
https://wordpress.com/es/forums/topic/planes-47/?view=all
https://test.forums.wordpress.com/topic/topic-7/edit/?view=all

https://wordpress.org/support/topic/before-posting-in-everything-wordpress/
https://bbpress.org/forums/topic/bbpress-redundant-h1-tag/
 */
export const FORUM_TOPIC_PATTERN =
	/^https?:\/\/(?<domain>[-a-zA-Z0-9@:%._+~#=]*)\/((?<lang>[a-z]{2})\/)?(?<prefix>[-a-zA-Z0-9@:%._+~#=\/]*)topic\/(?<slug>\S+)$/i;
const EMBED_CONTENT_MAXLENGTH = 400;
const AVERAGE_READING_SPEED = 250; // words per minute

enum ContentType {
	SUPPORT_PAGE = 'support_page',
	FORUM_TOPIC = 'forum_topic',
}

/** Attributes of the Block */
export type SupportContentBlockAttributes = {
	url: string;
	isConfirmed: boolean;
	title: string;
	content: string;
	source: string;
	minutesToRead?: number | null;
	likes?: number;
	status?: string;
	author?: string;
	created?: string;
};

export function getContentTypeFromUrl( url: string ): ContentType | null {
	if ( SUPPORT_PAGE_PATTERN.test( url ) ) {
		return ContentType.SUPPORT_PAGE;
	} else if ( FORUM_TOPIC_PATTERN.test( url ) ) {
		return ContentType.FORUM_TOPIC;
	}
	return null;
}

export async function fetchAttributes( url: string ): Promise< SupportContentBlockAttributes > {
	const type = await getContentTypeFromUrl( url );

	if ( type == ContentType.SUPPORT_PAGE ) {
		return fetchSupportPageAttributes( url );
	} else if ( type == ContentType.FORUM_TOPIC ) {
		return fetchForumTopicAttributes( url );
	} else {
		throw new Error( __( 'Failed to load the page. Check URL', 'blocks-everywhere' ) );
	}
}

/**
 * Fetch the support page via API and parse its data into block attributes
 */
export async function fetchSupportPageAttributes( url: string ): Promise< SupportContentBlockAttributes > {
	const { blog, slug } = getSupportPageSlugFromUrl( url );

	const apiUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${ blog }/posts/slug:${ encodeURIComponent(
		slug
	) }`;
	const response = await fetch( apiUrl );

	if ( ! response.ok ) {
		throw new Error( __( 'Failed to load the page. Check URL', 'blocks-everywhere' ) );
	}

	const page = await response.json();

	const title = page.parent?.title ? `${ page.parent.title } » ${ page.title }` : page.title;

	let content = stripHtml( page.content );

	const words = content.trim().split( /\s+/ );
	const minutesToRead = words.length ? Math.ceil( words.length / AVERAGE_READING_SPEED ) : null;

	if ( content.length > EMBED_CONTENT_MAXLENGTH ) {
		content = content.substring( 0, EMBED_CONTENT_MAXLENGTH );
	}

	return { url, isConfirmed: true, content, title, source: 'WordPress.com Support', minutesToRead };
}

/**
 * Fetch forum topic via API and parse its data into block attributes
 */
export async function fetchForumTopicAttributes( url: string ): Promise< SupportContentBlockAttributes > {
	const { blog, slug } = getForumTopicSlugFromUrl( url );

	let isWpComApi = blog.endsWith( 'wordpress.com' );

	const apiUrl = isWpComApi
		? `https://public-api.wordpress.com/wp/v2/sites/${ blog }/topic?slug=${ encodeURIComponent( slug ) }`
		: `https://${ blog }/wp-json/wp/v2/topic?slug=${ encodeURIComponent( slug ) }`;
	const response = await fetch( apiUrl );

	if ( ! response.ok ) {
		throw new Error( __( 'Failed to load the page. Check URL', 'blocks-everywhere' ) );
	}

	const topic = ( await response.json() )[ 0 ];

	const title = stripHtml( topic.title.rendered );

	let content = stripHtml( topic.content.rendered );

	if ( content.length > EMBED_CONTENT_MAXLENGTH ) {
		content = content.substring( 0, EMBED_CONTENT_MAXLENGTH );
	}

	return {
		url,
		isConfirmed: true,
		content,
		title,
		author: topic.author ? await fetchForumTopicAuthor( topic.author, blog, isWpComApi ) : undefined,
		source: 'WordPress.com Forums',
		status: topic.status,
		created: topic.date,
	};
}

async function fetchForumTopicAuthor( userId: number, blog: string, isWpComApi: boolean ): Promise< string > {
	const apiUrl = isWpComApi
		? `https://public-api.wordpress.com/rest/v1.1/users/${ userId }`
		: `https://${ blog }/wp-json/wp/v2/users/${ userId }`;

	const response = await fetch( apiUrl );

	if ( ! response.ok ) {
		return null;
	}

	const user = await response.json();

	return user.display_name || user.name;
}

/**
 * Get WP blog & slug from the support page URL
 */
function getSupportPageSlugFromUrl( url: string ): { blog: string; slug: string } {
	const urlMatches = url.match( SUPPORT_PAGE_PATTERN );
	const lang = urlMatches?.groups?.lang ?? 'en';
	let slug = urlMatches?.groups?.slug ?? '';

	if ( slug.endsWith( '/' ) ) {
		slug = slug.slice( 0, -1 );
	}

	return {
		blog: `${ lang }.support.wordpress.com`,
		slug,
	};
}

/**
 * Get WP blog & slug from the forum topic URL
 */
function getForumTopicSlugFromUrl( url: string ): { blog: string; slug: string } {
	const urlMatches = url.match( FORUM_TOPIC_PATTERN );
	const lang = urlMatches?.groups?.lang ?? 'en';
	let slug = urlMatches?.groups?.slug ?? '';

	if ( slug.indexOf( '/' ) >= 0 ) {
		slug = slug.slice( 0, slug.indexOf( '/' ) );
	}

	const blog =
		urlMatches.groups.domain == 'wordpress.com' ? `${ lang }.forums.wordpress.com` : urlMatches.groups.domain;

	return { blog, slug };
}

function stripHtml( html: string ): string {
	const doc = new DOMParser().parseFromString( html, 'text/html' );
	return doc.body.textContent || '';
}
