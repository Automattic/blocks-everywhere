import React from 'react';
import classnames from 'classnames';
import icon from './wordpress.png';

export const WordPressIcon = () => {
	// req param required to avoid adding it automatically thus breaking block parsing
	const imgUrl = wpBlocksEverywhere.pluginsUrl + icon + '?m=1';

	return (
		<div className={ classnames( 'be-support-content-wordpress-icon' ) }>
			<img alt="WP" src={ imgUrl } />
		</div>
	);
};
