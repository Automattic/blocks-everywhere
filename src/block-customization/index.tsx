/**
 * WordPress dependencies
 */

import customizeEmbed from "./embed";
import customizeParagraph from "./paragraph";

function disableSupports( settings ) {
	return {
		...settings,
		supports: {
			...settings.supports,
			customClassName: false,
			anchor: false,
			html: false,
			color: false,
			typography: false,
			renaming: false,
		}
	}
}

export default function modifyBlocks( settings, name ) {
	if ( name === 'core/paragraph' ) {
		return customizeParagraph( disableSupports( settings ) );
	}

	if ( name === 'core/embed' ) {
		return customizeEmbed( disableSupports( settings ) );
	}

	return {
		...settings,
		...disableSupports( settings ),
	};
}
