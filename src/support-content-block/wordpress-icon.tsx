import React from 'react';
import classnames from 'classnames';
import rasterizedIcon from './wordpress.png';

export const WordPressIcon = () => {
	return (
		<>
			<div className={ classnames( 'be-support-content-wordpress-icon' ) }>
				{ /* req param required to avoid adding it automatically thus breaking block parsing */ }
				<img alt="WP" src={ rasterizedIcon + '?m=1' } />
			</div>
		</>
	);
};
