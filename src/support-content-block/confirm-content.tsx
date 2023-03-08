import React from 'react';
import './edit.scss';
import { __experimentalElevation as Elevation, MenuItem, NavigableMenu, Popover } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export const ConfirmContent = ( { url, confirm, cancel } ) => {
	return (
		<>
			<a href={ url } target="_blank">
				{ url }
			</a>

			<span className="be-support-content-confirm-anchor">
				<Popover onFocusOutside={ cancel } variant="unstyled" offset={ 16 } placement="right-start">
					<div className="be-support-content-confirm-content">
						<Elevation value={ 3 } />
						<NavigableMenu role="menu">
							<MenuItem
								variant="tertiary"
								className="be-support-content-confirm-content__item"
								onClick={ ( e ) => {
									e.preventDefault();
									confirm();
								} }
							>
								{ __( 'Create embed', 'blocks-everywhere' ) }
							</MenuItem>

							<MenuItem
								variant="tertiary"
								isDestructive
								className="be-support-content-confirm-content__item"
								onClick={ ( e ) => {
									e.preventDefault();
									cancel();
								} }
							>
								{ __( 'Dismiss', 'blocks-everywhere' ) }
							</MenuItem>
						</NavigableMenu>
					</div>
				</Popover>
			</span>
		</>
	);
};
