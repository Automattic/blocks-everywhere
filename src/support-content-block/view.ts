import { getRelativeDate } from './utils';
import './view.scss';

export function updateRelativeDateCreated( blockRoot: HTMLElement ) {
	const dateElement = blockRoot.querySelector( '.be-support-content__created' );
	const relativeDateElement = blockRoot.querySelector( '.be-support-content__relative-created' );

	if ( dateElement?.textContent && relativeDateElement ) {
		relativeDateElement.textContent = getRelativeDate( dateElement.textContent );
	}
}

document.addEventListener( 'DOMContentLoaded', () => {
	document.querySelectorAll( '.wp-block-blocks-everywhere-support-content' ).forEach( updateRelativeDateCreated );
} );
