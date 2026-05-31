/**
 * WordPress dependencies
 */

import domReady from '@wordpress/dom-ready';
import { addFilter } from '@wordpress/hooks';
import { unregisterFormatType } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */

import mountEditor, { unmountEditor } from './editor';
import { registerSlotFill } from './editor/slot-fills';
import customBlocks from './block-customization';
import './styles/style.scss';

const getBootstrapSettings = () => ( typeof wpBlocksEverywhere !== 'undefined' ? wpBlocksEverywhere : null );

const bootstrapSettingsRegistry = new Map< string, typeof wpBlocksEverywhere >();

const getBootstrapSettingKeys = ( settings: typeof wpBlocksEverywhere, explicitKey?: string ) => {
	return [
		explicitKey,
		'default',
		settings?.blocksEverywhere?.contextId,
		settings?.blocksEverywhere?.context,
		settings?.saveTextarea,
	]
		.map( ( key ) => ( typeof key === 'string' ? key.trim() : '' ) )
		.filter( ( key, index, keys ) => key && keys.indexOf( key ) === index );
};

const registerBootstrapSettings = ( key: string, settings: typeof wpBlocksEverywhere ) => {
	if ( ! settings ) {
		return null;
	}

	getBootstrapSettingKeys( settings, key ).forEach( ( settingKey ) => {
		bootstrapSettingsRegistry.set( settingKey, settings );
	} );

	return settings;
};

registerBootstrapSettings( 'default', getBootstrapSettings() );

// Back-compat alias for dynamic editor initialization.
( window as any ).blocksEverywhereCreateEditor = mountEditor;

/**
 * Get the content API for an editor instance by its textarea element.
 *
 * The ContentBridge component (rendered inside each editor instance) attaches
 * a content API object to the textarea. This function provides a clean
 * lookup without consumers needing to know the internal property name.
 *
 * @param {HTMLTextAreaElement} textarea The textarea element the editor was created from.
 * @return {BlocksEverywhereContentApi|null} Content API for the editor instance.
 *
 * @example
 *   const api = window.blocksEverywhereGetContentApi( myTextarea );
 *   if ( api ) {
 *       api.replaceContent( '<p>Hello world</p>' );
 *       const html = api.getContent();
 *   }
 */
const getContentApi = ( textarea: HTMLTextAreaElement ) => {
	return textarea?.__blocksEverywhereContentApi ?? null;
};

( window as any ).blocksEverywhereGetContentApi = getContentApi;

/**
 * Public namespace for Blocks Everywhere host-page integration APIs.
 *
 * Currently exposes:
 *   - mountEditor( textarea, options? ) — mount a dynamic editor instance.
 *   - unmount( mountOrTextarea ) — unmount a previously-mounted editor.
 *   - getContentApi( textarea ) — read or hot-replace an editor instance's
 *     serialized block content.
 *   - getEditor( textarea ) — retrieve the mounted editor instance API for
 *     focus and unmount lifecycle coordination.
 *   - registerSlotFill( slot, renderFn ) — render React content into the editor
 *     footer / toolbar / heading slots from outside BE's React tree.
 *
 * See src/editor/slot-fills.tsx for the full API contract.
 */
( window as any ).blocksEverywhere = {
	mountEditor,
	unmount: unmountEditor,
	getContentApi,
	getEditor: ( textarea: HTMLTextAreaElement ) => textarea?.__blocksEverywhereEditor ?? null,
	getSettings: ( key = 'default' ) => bootstrapSettingsRegistry.get( key ) ?? null,
	registerSettings: registerBootstrapSettings,
	registerSlotFill,
};

domReady( () => {
	// Gutenberg package bootstrap below is intentionally global: these APIs
	// register filters, blocks, rich-text formats, and host-page DOM behavior.
	// Editor REST behavior is scoped through per-instance services in src/editor.
	// Modify any blocks we need to
	addFilter( 'blocks.registerBlockType', 'blocks-everywhere/modify-blocks', customBlocks );

	// Register core blocks once per page. WordPress enqueues `wp-block-library`
	// which exposes `wp.blockLibrary.registerCoreBlocks` on the global, but
	// nothing calls it on the host page — so without this, `getBlockType()`
	// returns undefined for every block name, and `createBlock()` recurses on
	// `core/missing` until the stack overflows (see the linked upstream issue).
	// IBE used to call this from its own initializer; PR #6 dropped IBE but
	// didn't carry this call forward.
	const blockLibrary = ( window as any ).wp?.blockLibrary;
	if ( blockLibrary?.registerCoreBlocks && ! ( window as any ).blocksEverywhereCoreBlocksRegistered ) {
		blockLibrary.registerCoreBlocks();
		( window as any ).blocksEverywhereCoreBlocksRegistered = true;
	}

	// Remove some formatting options
	unregisterFormatType( 'core/text-color' );
	unregisterFormatType( 'core/image' );

	// Remove some items from the toolbar “More” dropdown.
	// Keep: strikethrough, subscript, superscript.
	unregisterFormatType( 'core/code' );
	unregisterFormatType( 'core/keyboard' );
	unregisterFormatType( 'core/language' );
	unregisterFormatType( 'core/math' );

	if ( wpBlocksEverywhere?.patchEmoji && window?.twemoji?.parse ) {
		const original = window.twemoji.parse;

		window.twemoji.parse = ( object, args ) => {
			if ( object.closest( '.blocks-everywhere' ) ) {
				return object;
			}

			return original( object, args );
		};
	}

	// Add the editor
	document.querySelectorAll( wpBlocksEverywhere.saveTextarea ).forEach( ( node ) => {
		mountEditor( node as HTMLTextAreaElement );
	} );

	// Set the loaded flag
	setTimeout( () => document.body.classList.add( 'gutenberg-support-loaded' ), 250 );
} );
