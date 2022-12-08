/**
 * WordPress dependencies
 */

import { useDispatch } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

export default function BuddyPress( props ) {
	const { textarea } = props;
	const { resetBlocks } = useDispatch( 'core/block-editor' );

	function onClear( mutationsList, observer ) {
		jQuery( '#whats-new' ).focusin();
		resetBlocks( [] );
	}

	useEffect( () => {
		// Show the buddypress buttons
		jQuery( '#whats-new' ).focusin();
		const observer = new MutationObserver( onClear );

		observer.observe( textarea, { attributes: true } );

		return () => {
			observer.disconnect();
		};
	}, [] );

	return null;
}
