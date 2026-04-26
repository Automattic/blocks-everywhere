/**
 * Slot Fill API for Blocks Everywhere.
 *
 * Lets host pages render React content into IBE's footer / toolbar / heading
 * slots without being inside BE's React tree. Consumers register render
 * functions before any editor mounts; BE reads the registry while rendering
 * <IsolatedBlockEditor> and inserts the resulting React nodes as children.
 *
 * Because the fills end up inside IBE's own <SlotFillProvider>, they
 * render in the editor skeleton and stay visible in fullscreen mode.
 *
 * Public API (also exposed on `window.blocksEverywhere`):
 *
 *   registerSlotFill( slot, renderFn )
 *     - slot: 'footer' | 'toolbar' | 'heading'
 *     - renderFn: ( textarea ) => ReactNode
 *     - Returns an unregister function.
 *
 * Example:
 *
 *   window.blocksEverywhere.registerSlotFill( 'footer', ( textarea ) => {
 *       return wp.element.createElement( 'button', {
 *           onClick: () => textarea.form.submit(),
 *       }, 'Submit' );
 *   } );
 *
 * @package Automattic\BlocksEverywhere
 */

import { createElement, Fragment, useEffect, useState } from '@wordpress/element';
import type { ReactNode } from 'react';
import {
	FooterSlot,
	ToolbarSlot,
	EditorHeadingSlot,
} from '@chubes4/isolated-block-editor';

export type SlotName = 'footer' | 'toolbar' | 'heading';

export type SlotFillRenderFn = ( textarea: HTMLTextAreaElement ) => ReactNode;

type RegistryEntry = {
	id: number;
	render: SlotFillRenderFn;
};

type Registry = Record< SlotName, RegistryEntry[] >;

const SLOT_NAMES: SlotName[] = [ 'footer', 'toolbar', 'heading' ];

/**
 * Per-slot fill list. Mutated via `registerSlotFill` / unregister callback.
 * Subscribers are notified after every change so already-mounted editors
 * can pick up late-registered fills.
 */
const registry: Registry = {
	footer: [],
	toolbar: [],
	heading: [],
};

const subscribers = new Set< () => void >();

let nextId = 1;

const isValidSlot = ( slot: string ): slot is SlotName =>
	( SLOT_NAMES as readonly string[] ).includes( slot );

const notify = (): void => {
	subscribers.forEach( ( callback ) => {
		try {
			callback();
		} catch ( error ) {
			// eslint-disable-next-line no-console
			console.error( 'Blocks Everywhere: slot-fill subscriber threw', error );
		}
	} );
};

/**
 * Register a render function for one of IBE's slots.
 *
 * Registrations made before BE mounts an editor are picked up automatically.
 * Registrations made after mount are picked up via the subscription system —
 * already-mounted editors re-render with the new fill list.
 *
 * @param slot     Which slot to fill: 'footer', 'toolbar', or 'heading'.
 * @param renderFn Callback invoked once per editor mount with that editor's
 *                 textarea. Should return a ReactNode (use
 *                 `wp.element.createElement` from outside React trees).
 * @return         Function that, when called, unregisters this fill.
 */
export function registerSlotFill( slot: SlotName, renderFn: SlotFillRenderFn ): () => void {
	if ( ! isValidSlot( slot ) ) {
		// eslint-disable-next-line no-console
		console.error( `Blocks Everywhere: unknown slot '${ slot }'. Valid slots: ${ SLOT_NAMES.join( ', ' ) }` );
		return () => undefined;
	}

	if ( typeof renderFn !== 'function' ) {
		// eslint-disable-next-line no-console
		console.error( 'Blocks Everywhere: registerSlotFill requires a render function.' );
		return () => undefined;
	}

	const entry: RegistryEntry = { id: nextId++, render: renderFn };
	registry[ slot ].push( entry );
	notify();

	return () => {
		const index = registry[ slot ].findIndex( ( item ) => item.id === entry.id );
		if ( index !== -1 ) {
			registry[ slot ].splice( index, 1 );
			notify();
		}
	};
}

/**
 * Read the current entries for a slot. Internal — use the React component
 * `<RegisteredSlotFills>` to consume entries reactively.
 */
export function getSlotEntries( slot: SlotName ): RegistryEntry[] {
	return registry[ slot ].slice();
}

/**
 * Subscribe to registry changes. Returns an unsubscribe function.
 */
export function subscribe( callback: () => void ): () => void {
	subscribers.add( callback );
	return () => {
		subscribers.delete( callback );
	};
}

/**
 * Hook: returns a tick that increments whenever the registry changes.
 * Used to force a re-read of `getSlotEntries` inside React components.
 */
function useRegistryVersion(): number {
	const [ version, setVersion ] = useState( 0 );

	useEffect( () => {
		return subscribe( () => setVersion( ( v ) => v + 1 ) );
	}, [] );

	return version;
}

interface RegisteredSlotFillsProps {
	textarea: HTMLTextAreaElement;
}

/**
 * Reads the registered fills and renders them into the matching IBE slots.
 * Must be rendered as a child of <IsolatedBlockEditor> so it shares the
 * SlotFillProvider that owns the IBE slots.
 *
 * Each registered render function is invoked with the editor's textarea so
 * consumers can scope their fills to a specific editor instance (useful when
 * multiple BE editors live on the same page, e.g. inline reply forms).
 */
export function RegisteredSlotFills( { textarea }: RegisteredSlotFillsProps ): JSX.Element {
	// Force re-read whenever registrations change.
	useRegistryVersion();

	const renderEntries = ( slot: SlotName, SlotComponent: typeof FooterSlot ) => {
		const entries = getSlotEntries( slot );
		if ( entries.length === 0 ) {
			return null;
		}

		return entries.map( ( entry ) => {
			let node: ReactNode = null;
			try {
				node = entry.render( textarea );
			} catch ( error ) {
				// eslint-disable-next-line no-console
				console.error( `Blocks Everywhere: slot-fill render for '${ slot }' threw`, error );
			}

			if ( node === null || node === undefined || node === false ) {
				return null;
			}

			return createElement(
				SlotComponent,
				{ key: `${ slot }-${ entry.id }` },
				node
			);
		} );
	};

	return createElement(
		Fragment,
		null,
		renderEntries( 'footer', FooterSlot ),
		renderEntries( 'toolbar', ToolbarSlot ),
		renderEntries( 'heading', EditorHeadingSlot )
	) as unknown as JSX.Element;
}
