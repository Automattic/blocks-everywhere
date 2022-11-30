import { Path, SVG } from '@wordpress/components';
import React from 'react';
import classnames from 'classnames';

type ContentBlockIcon = {
	marginRight?: boolean;
};

export const ContentBlockIcon = ( props: ContentBlockIcon ) => {
	return (
		<div className={ classnames( 'be-support-content-block-icon', { 'is-margin-right': props.marginRight } ) }>
			<SVG width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
				<Path
					d="M2 0.75H16C16.6904 0.75 17.25 1.30964 17.25 2V16C17.25 16.6904 16.6904 17.25 16 17.25H2C1.30964 17.25 0.75 16.6904 0.75 16V2C0.75 1.30964 1.30964 0.75 2 0.75Z"
					stroke="#1E1E1E"
					stroke-width="1.5"
				/>
				<Path d="M6 1L2 5.5L2 1L6 1Z" fill="#1E1E1E" stroke="#1E1E1E" />
				<Path d="M11 12.2857L14 9L11 6" stroke="#1E1E1E" strokeWidth="1.5" />
				<Path d="M7 12.2857L4 9L7 6" stroke="#1E1E1E" strokeWidth="1.5" />
			</SVG>
		</div>
	);
};
