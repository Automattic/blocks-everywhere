import { getRelativeDate } from './utils';
import './view.scss';

export function updateForumTopicDate( blockRoot: HTMLElement ) {
	const dateElement = blockRoot.querySelector( '.hb-support-page-embed__created' );
	const relativeDateElement = blockRoot.querySelector( '.hb-support-page-embed__relative-created' );

	if ( dateElement?.textContent && relativeDateElement ) {
		relativeDateElement.textContent = getRelativeDate( dateElement.textContent );
	}
}

document.addEventListener( 'DOMContentLoaded', () => {
	document.querySelectorAll( '.wp-block-happy-blocks-forum-topic' ).forEach( updateForumTopicDate );
} );
