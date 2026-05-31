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
import {
	getBootstrapSetting,
	getBootstrapSettingsSummary,
	getRegisteredBootstrapSettings,
	registerBootstrapSettings,
} from './bootstrap-settings';
import './styles/style.scss';

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
	getSettings: getBootstrapSetting,
	registerSettings: registerBootstrapSettings,
	registerSlotFill,
};

domReady( () => {
	// Gutenberg package bootstrap below is intentionally page-global: these APIs
	// register filters, blocks, rich-text formats, and host-page DOM behavior.
	// Decisions here use the aggregate bootstrap settings summary because
	// Gutenberg does not expose per-editor registrations for these hooks.
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

	// Rich-text formats are a Gutenberg-wide registry, not an instance adapter.
	unregisterFormatType( 'core/text-color' );
	unregisterFormatType( 'core/image' );

	// Remove some items from the toolbar “More” dropdown.
	// Keep: strikethrough, subscript, superscript.
	unregisterFormatType( 'core/code' );
	unregisterFormatType( 'core/keyboard' );
	unregisterFormatType( 'core/language' );
	unregisterFormatType( 'core/math' );

	if ( getBootstrapSettingsSummary().patchEmoji && window?.twemoji?.parse ) {
		const original = window.twemoji.parse;

		window.twemoji.parse = ( object, args ) => {
			if ( object.closest( '.blocks-everywhere' ) ) {
				return object;
			}

			return original( object, args );
		};
	}

	// Add the editor
	getRegisteredBootstrapSettings().forEach( ( settings ) => {
		if ( ! settings?.saveTextarea ) {
			return;
		}

		document.querySelectorAll( settings.saveTextarea ).forEach( ( node ) => {
			mountEditor( node as HTMLTextAreaElement, { settings } );
		} );
	} );

	// Set the loaded flag
	setTimeout( () => document.body.classList.add( 'gutenberg-support-loaded' ), 250 );
} );
