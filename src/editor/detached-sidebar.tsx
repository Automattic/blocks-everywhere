/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Popover } from '@wordpress/components';
import { createPortal, useEffect, useMemo, useState } from '@wordpress/element';
import type { ReactNode } from 'react';

/**
 * Name of the Popover slot mounted inside the detached sidebar portal.
 *
 * Popovers rendered inside the detached subtree (e.g. the inserter preview)
 * are scoped to this slot via Popover.__unstableSlotNameProvider so they
 * render in the same stacking context as their anchors, instead of falling
 * back to the default Popover.Slot inside `.blocks-everywhere-editor`
 * (which is isolated via `isolation: isolate` and therefore paints behind
 * the editor canvas when the anchor lives outside it).
 *
 * Comment ported verbatim from isolated-block-editor's DetachedSidebar.
 * The `isolation: isolate` constraint is load-bearing: the editor shell
 * uses `.blocks-everywhere-editor` as its stacking-context root, so the
 * same stacking-context trap applies in Blocks Everywhere.
 */
const DETACHED_POPOVER_SLOT_NAME = 'blocks-everywhere/detached-sidebar';

type DetachedTarget = string | Element | null | undefined;

interface DetachedSidebarProps {
	target: DetachedTarget;
	className?: string;
	children?: ReactNode;
}

function resolveTarget( target: DetachedTarget ): Element | null {
	if ( ! target ) {
		return null;
	}

	if ( typeof target === 'string' ) {
		return document.querySelector( target );
	}

	if ( target instanceof Element ) {
		return target;
	}

	return null;
}

export default function DetachedSidebar( { target, className, children }: DetachedSidebarProps ) {
	const [ resolvedTarget, setResolvedTarget ] = useState< Element | null >( () => resolveTarget( target ) );

	const sidebarClassName = useMemo(
		() => classnames( 'blocks-everywhere-editor__detached-sidebar', className ),
		[ className ]
	);

	useEffect( () => {
		const nextTarget = resolveTarget( target );
		setResolvedTarget( nextTarget );

		if ( nextTarget || ! target ) {
			return undefined;
		}

		// The consumer's target element may mount late in the React tree
		// (e.g. Studio's `.ec-studio-compose-sidebar__slot` is rendered by a
		// sibling component that may not exist on first render). Watch for
		// it via MutationObserver and re-resolve when it appears.
		const observer = new MutationObserver( () => {
			const observedTarget = resolveTarget( target );

			if ( observedTarget ) {
				setResolvedTarget( observedTarget );
				observer.disconnect();
			}
		} );

		observer.observe( document.body, {
			childList: true,
			subtree: true,
		} );

		return () => {
			observer.disconnect();
		};
	}, [ target ] );

	if ( ! resolvedTarget || ! children ) {
		return null;
	}

	return createPortal(
		// @ts-ignore Popover.__unstableSlotNameProvider is an experimental API
		<Popover.__unstableSlotNameProvider value={ DETACHED_POPOVER_SLOT_NAME }>
			<div className={ sidebarClassName }>
				{ children }
				{ /* @ts-ignore */ }
				<Popover.Slot name={ DETACHED_POPOVER_SLOT_NAME } />
			</div>
		</Popover.__unstableSlotNameProvider>,
		resolvedTarget
	);
}
