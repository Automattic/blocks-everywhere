/**
 * Post Entity Shell — opt-in `<EditorProvider>` wiring for canonical-post BE mounts.
 *
 * When a consumer provides `settings.postEntity = { type, id }`, this component
 * loads the post entity from `core/coreData`, mounts `<EditorProvider>` so the
 * `core/editor` store is populated, and renders `<AutosaveMonitor />` +
 * `<LocalAutosaveMonitor />` so the editor inherits WordPress core's full
 * autosave stack (per-user revision rows via /wp/v2/<type>/<id>/autosaves,
 * sessionStorage backup, recovery flows).
 *
 * Vendor-agnostic by design. The shell knows nothing about specific post types,
 * specific consumers (host applications, forum drafts, etc.), or specific endpoints. It
 * just wires the standard WP editor primitives when a post entity is available.
 *
 * When no `postEntity` is supplied — or the entity hasn't loaded yet — the
 * shell renders its children without the provider tree, preserving current
 * behavior for textarea-only mounts.
 */

/**
 * External dependencies
 */
import type { ReactElement, ReactNode } from 'react';

/**
 * WordPress dependencies
 */
import { serialize } from '@wordpress/blocks';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { AutosaveMonitor, EditorProvider, LocalAutosaveMonitor, store as editorStore } from '@wordpress/editor';

export interface PostEntityRef {
	/** Post type slug, e.g. 'post', 'page', or any registered CPT. */
	type: string;
	/** Numeric post ID. 0 / null indicates not-yet-created. */
	id: number;
}

interface PostEntityShellProps {
	postEntity?: PostEntityRef | null;
	editorSettings?: Record< string, unknown >;
	children: ReactNode;
}

/**
 * Forward editor block changes to `core/editor` edits so `<AutosaveMonitor>`
 * picks them up as dirty state. Mount inside the BlockEditorProvider tree
 * (where the live blocks array is available) when `<EditorProvider>` is the
 * surrounding parent.
 *
 * Skips dispatch when serialized content matches the current edited content
 * to avoid feedback loops with `<EditorProvider>`'s own `useEntityBlockEditor`
 * sync. Cheap stringify; the autosave debounce is the real throttle.
 *
 * @param root0        Component props.
 * @param root0.blocks Current block list from the BlockEditorProvider tree.
 */
export function EditorEditsBridge( { blocks }: { blocks: object[] } ): null {
	const { editPost } = useDispatch( editorStore );
	const lastDispatchedContent = useRef< string >( '' );

	const editedContent = useSelect(
		( select ) =>
			(
				select( editorStore ) as { getEditedPostAttribute?: ( name: string ) => unknown }
			 ).getEditedPostAttribute?.( 'content' ) as string | undefined,
		[]
	);

	useEffect( () => {
		const serialized = serialize( blocks || [] );
		if ( serialized === lastDispatchedContent.current ) {
			return;
		}
		if ( serialized === editedContent ) {
			lastDispatchedContent.current = serialized;
			return;
		}
		lastDispatchedContent.current = serialized;
		editPost( { content: serialized } );
	}, [ blocks, editedContent, editPost ] );

	return null;
}

/**
 * Internal: render the EditorProvider + autosave monitors around the children.
 *
 * Split out so that the entity-fetch hook only runs when we actually have a
 * postEntity to fetch (the parent gates this branch).
 *
 * @param root0                Component props.
 * @param root0.postEntity     Canonical post entity reference.
 * @param root0.editorSettings Editor settings passed to EditorProvider.
 * @param root0.children       Children rendered inside the provider tree.
 */
function EditorShell( {
	postEntity,
	editorSettings,
	children,
}: {
	postEntity: PostEntityRef;
	editorSettings: Record< string, unknown >;
	children: ReactNode;
} ): ReactElement {
	const post = useSelect(
		( select ) =>
			(
				select( coreStore ) as {
					getEntityRecord: ( kind: string, name: string, id: number ) => unknown;
				}
			 ).getEntityRecord( 'postType', postEntity.type, postEntity.id ),
		[ postEntity.type, postEntity.id ]
	);

	if ( ! post ) {
		// Entity not yet loaded. Render children without the provider tree;
		// once the entity arrives, useSelect re-renders and EditorProvider mounts.
		return <>{ children }</>;
	}

	return (
		<EditorProvider post={ post } settings={ editorSettings }>
			<AutosaveMonitor />
			<LocalAutosaveMonitor />
			{ children }
		</EditorProvider>
	);
}

export default function PostEntityShell( {
	postEntity,
	editorSettings,
	children,
}: PostEntityShellProps ): ReactElement {
	if ( ! postEntity || ! postEntity.id || postEntity.id <= 0 ) {
		// No canonical post — preserve existing behavior. No provider, no monitors.
		return <>{ children }</>;
	}

	return (
		<EditorShell postEntity={ postEntity } editorSettings={ editorSettings || {} }>
			{ children }
		</EditorShell>
	);
}
