/**
 * Embedded Editor Shell — toolbar + canvas composition for post-agnostic
 * block-editor mounts.
 *
 * This is the BE-owned, public-primitive-only equivalent of upstream's
 * `<VisualEditor>` from `@wordpress/editor`. We deliberately do NOT consume
 * `<EditorInterface>` / `<VisualEditor>` / `<DocumentTools>` from upstream:
 *
 * - Those components are NOT publicly exported (internal-only, not in
 *   `@wordpress/editor`'s `components/index.js` nor in `private-apis.js`).
 * - They are hard-coupled to a post entity (read `getCurrentPostId`,
 *   `getCurrentPostType`, `getRenderingMode` from `editorStore`, which is
 *   only populated when `<EditorProvider>` is mounted with a real post).
 * - They consume upstream's private `unlock()` APIs pervasively
 *   (`ExperimentalBlockCanvas`, `LayoutStyle`, `getInserterSidebarToggleRef`,
 *   etc.), which would couple BE to private contracts that break across
 *   Gutenberg minor releases.
 *
 * BE consumers (bbPress replies, comments, BuddyPress, ad-hoc textareas) do
 * NOT have a post entity, so upstream's composed surfaces are structurally
 * unusable. The opt-in `<PostEntityShell>` (see `post-entity-shell.tsx`) is
 * the correct integration point when a post IS available — it wraps BE in
 * upstream's public `<EditorProvider>` + `<AutosaveMonitor>` stack without
 * BE needing to fake an entity.
 *
 * Investigation that justifies this design lives in #28. The full feasibility
 * analysis (why replatforming on `@wordpress/editor` composed surfaces is not
 * viable) is captured there. Future contributors: read #28 before asking
 * "should we use `<EditorInterface>` here?" — the answer is no, and the
 * reasoning is documented.
 *
 * Public-API equivalent of `<VisualEditor>`:
 *
 *   <BlockTools>
 *     <WritingFlow>
 *       <ObserveTyping>
 *         <BlockCanvas height="100%" styles={ ... } />
 *       </ObserveTyping>
 *     </WritingFlow>
 *   </BlockTools>
 *
 * That stanza is the canvas composition BE has converged on after PRs #23,
 * #25, #26. It must be paired with `display: flex; flex-direction: column`
 * on `.blocks-everywhere-editor` and `flex: 1` on
 * `.blocks-everywhere-editor__body` so `height: 100%` resolves to the
 * remaining space below the toolbar. See `editor.scss`.
 */

/**
 * External dependencies
 */
import type { ReactNode } from 'react';

/**
 * WordPress dependencies
 */
import {
	BlockCanvas,
	BlockEditorKeyboardShortcuts,
	BlockTools,
	BlockToolbar,
	Inserter,
	ObserveTyping,
	WritingFlow,
	// @ts-ignore __experimentalListView is unstable but is the public surface
	// for the block list-view tree; the public ListView alias has not landed.
	__experimentalListView as ListView,
} from '@wordpress/block-editor';
import { EditorHistoryRedo, EditorHistoryUndo } from '@wordpress/editor';
import { Button, Dropdown, Slot } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { listView as listViewIcon } from '@wordpress/icons';

/**
 * Toolbar configuration shape.
 *
 * Default toolbar matches the upstream wp-admin post editor (every primitive
 * enabled). Consumers opt OUT individual primitives via
 * `settings.blocksEverywhere.toolbar`; they never need to opt IN.
 *
 * - `inserter` — document-level "+" block inserter button.
 * - `undo` / `redo` — delegate to the core editor history.
 * - `listView` — block list-view tree (dropdown panel).
 * - `blockTools` — selected-block format toolbar (`¶ B I link`).
 */
export interface ResolvedToolbarConfig {
	inserter: boolean;
	undo: boolean;
	redo: boolean;
	listView: boolean;
	blockTools: boolean;
}

export interface ResolvedChromeConfig {
	mode: 'inline' | 'full-height' | 'modal' | 'compact';
	topBar: boolean;
	toolbar: boolean;
	secondaryToolbar: boolean;
	footer: boolean;
	documentSidebar: boolean;
	inserterSidebar: boolean;
}

interface EmbeddedEditorShellProps {
	/** Resolved toolbar configuration (already merged with persistent-sidebar suppression). */
	toolbar: ResolvedToolbarConfig;
	/** Resolved shell chrome configuration. */
	chrome: ResolvedChromeConfig;
	/** Editor styles passed through to the iframe canvas. */
	styles?: unknown[];
	/** Optional extra className applied to the editor wrapper. */
	className?: string;
	/** Children rendered after the canvas body (e.g. registered slot fills, bridges). */
	children?: ReactNode;
}

/**
 * Toggle button + dropdown panel that exposes the block list view.
 *
 * Built on the public `@wordpress/block-editor` `__experimentalListView`
 * surface, which reads from `core/block-editor` state directly — so it works
 * the same whether or not the host mounts an `EditorProvider`. The dropdown
 * keeps the panel self-contained inside the BE toolbar; no external sidebar
 * plumbing is required.
 */
function ListViewToggle(): JSX.Element {
	return (
		<Dropdown
			className="blocks-everywhere-editor__list-view-toggle"
			contentClassName="blocks-everywhere-editor__list-view-panel"
			popoverProps={ { placement: 'bottom-start' } }
			renderToggle={ ( { isOpen, onToggle } ) => (
				<Button
					icon={ listViewIcon }
					label={ __( 'Document Overview' ) }
					onClick={ onToggle }
					aria-expanded={ isOpen }
					isPressed={ isOpen }
					showTooltip
				/>
			) }
			renderContent={ () => (
				/* @ts-ignore __experimentalListView is unstable */
				<ListView />
			) }
		/>
	);
}

/**
 * Toolbar + canvas composition for an embedded, post-agnostic block editor.
 *
 * Must be rendered inside a `<SlotFillProvider>` + `<BlockEditorProvider>`
 * tree (see `EmbeddedBlockEditor` in `index.tsx`, which owns the provider
 * setup and the block-state contract).
 *
 * @param props           Component props.
 * @param props.toolbar   Resolved toolbar config (which primitives to render).
 * @param props.styles    Iframe canvas styles (passed to `<BlockCanvas>`).
 * @param props.className Optional extra wrapper className from the consumer.
 * @param props.children  Slot-fill consumers, theme bridges, content bridge,
 *                        etc. Rendered after the canvas body.
 */
export default function EmbeddedEditorShell( props: EmbeddedEditorShellProps ): JSX.Element {
	const { chrome, toolbar, styles, className, children } = props;
	const editorClassName = [
		'blocks-everywhere-editor',
		'block-editor',
		`blocks-everywhere-editor--${ chrome.mode }`,
		className || '',
	]
		.filter( Boolean )
		.join( ' ' );

	return (
		<>
			<div className={ editorClassName }>
				{ chrome.topBar && (
					<div className="blocks-everywhere-editor__top-bar">
						<Slot name="blocks-everywhere/topBar" />
						<Slot name="blocks-everywhere/windowControls" />
					</div>
				) }
				{ chrome.toolbar && (
					<div className="blocks-everywhere-editor__toolbar">
						<Slot name="blocks-everywhere/heading" />
						{ toolbar.inserter && <Inserter rootClientId={ null } /> }
						{ toolbar.undo && <EditorHistoryUndo /> }
						{ toolbar.redo && <EditorHistoryRedo /> }
						{ toolbar.listView && <ListViewToggle /> }
						{ toolbar.blockTools && <BlockToolbar hideDragHandle /> }
						<Slot name="blocks-everywhere/toolbar" />
						<Slot name="blocks-everywhere/actions" />
					</div>
				) }
				{ chrome.secondaryToolbar && (
					<div className="blocks-everywhere-editor__secondary-toolbar">
						<Slot name="blocks-everywhere/secondaryToolbar" />
					</div>
				) }
				<div className="blocks-everywhere-editor__body-row">
					{ chrome.documentSidebar && (
						<aside className="blocks-everywhere-editor__sidebar blocks-everywhere-editor__sidebar--document">
							<Slot name="blocks-everywhere/documentSidebar" />
						</aside>
					) }
					<div className="blocks-everywhere-editor__body">
						<BlockEditorKeyboardShortcuts />
						<BlockEditorKeyboardShortcuts.Register />
						<BlockTools>
							<WritingFlow>
								<ObserveTyping>
									{ /*
									 * `<BlockCanvas>` defaults `height` to `'300px'` (see
									 * `@wordpress/block-editor/src/components/block-canvas/index.js`)
									 * and sets that as an inline style on its wrapping
									 * `<BlockTools>` div. The iframe inside
									 * (`.block-editor-iframe__container` and
									 * `.block-editor-iframe__scale-container`, both
									 * `height: 100%`) then resolves to a hard 300px tall
									 * canvas regardless of how much vertical room the host
									 * gives BE.
									 *
									 * wp-admin's `<VisualEditor>` (and the old IBE
									 * `visual-editor.js`) both pass `height="100%"` here
									 * and rely on the editor wrapper being a flex column
									 * so the canvas fills the remaining space below the
									 * toolbar. We do the same: `height="100%"` here, paired
									 * with `display: flex; flex-direction: column` on
									 * `.blocks-everywhere-editor` and `flex: 1` on
									 * `.blocks-everywhere-editor__body` (see editor.scss).
									 */ }
									<BlockCanvas height="100%" styles={ ( styles as never ) || [] } />
								</ObserveTyping>
							</WritingFlow>
						</BlockTools>
					</div>
					{ chrome.inserterSidebar && (
						<aside className="blocks-everywhere-editor__sidebar blocks-everywhere-editor__sidebar--inserter">
							<Slot name="blocks-everywhere/inserterSidebar" />
						</aside>
					) }
				</div>
				{ chrome.footer && <Slot name="blocks-everywhere/footer" /> }
			</div>
			{ children }
		</>
	);
}
