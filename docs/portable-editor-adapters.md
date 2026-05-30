# Portable Editor Adapter Guide

This guide is for teams migrating a bespoke embedded editor shell to Blocks Everywhere. It uses generic host terms so the same adapter shape can serve a frontend app, comment composer, reply editor, draft surface, or moderation UI.

Blocks Everywhere should own the Gutenberg editor runtime, block settings, editor chrome, and block serialization. The host adapter should own host routing, permissions, persistence, entity identity, and product-specific UI outside the editor.

## Migration Model

Think of a migration as three boundaries:

```
Host application
    owns route, entity, permissions, services, persistence
        |
        v
Host adapter
    maps host concepts to Blocks Everywhere configuration and events
        |
        v
Blocks Everywhere editor instance
    owns Gutenberg packages, block canvas, slots, settings, serialization
```

Keep the adapter thin. If a behavior can be described as editor configuration, block availability, a slot fill, a content bridge, or a lifecycle callback, put it behind the Blocks Everywhere integration boundary instead of keeping a second editor shell.

## Capability Map

| Migration concern | Adapter responsibility | Blocks Everywhere responsibility | Tracking issue |
|-------------------|------------------------|----------------------------------|----------------|
| Dynamic mount/unmount | Decide when an editor instance exists and provide a stable container or textarea target. | Provide a public instance API that can mount, unmount, and clean up dynamic editors. | [#50](https://github.com/Extra-Chill/blocks-everywhere/issues/50) |
| Lifecycle events | React to editor ready, focus, loading, dirty, save, and teardown states. | Emit generic lifecycle events per editor instance. | [#51](https://github.com/Extra-Chill/blocks-everywhere/issues/51), [#58](https://github.com/Extra-Chill/blocks-everywhere/issues/58) |
| Content bridges | Load initial serialized blocks and save edited serialized blocks through the host persistence layer. | Normalize content read/write beyond textarea mirroring. | [#52](https://github.com/Extra-Chill/blocks-everywhere/issues/52) |
| Custom stores/context | Register host data needed by blocks or chrome without coupling the editor to host internals. | Accept per-instance data stores and context injection. | [#53](https://github.com/Extra-Chill/blocks-everywhere/issues/53) |
| Slot/chrome extension | Render host actions, status, and metadata in editor-owned chrome. | Provide stable slot APIs for toolbar, heading, footer, and additional host-owned chrome areas. | [#54](https://github.com/Extra-Chill/blocks-everywhere/issues/54) |
| Initial transforms/templates | Convert legacy content, empty states, starter blocks, or host templates before the first edit. | Support initial transforms, starter patterns, and template bootstrapping. | [#55](https://github.com/Extra-Chill/blocks-everywhere/issues/55) |
| Editor modes | Select the mode for a post, comment, reply, draft, compact composer, or read-modify-save flow. | Apply mode-aware settings transforms. | [#56](https://github.com/Extra-Chill/blocks-everywhere/issues/56) |
| Host entity bridges | Map host entity IDs, revisions, authors, parents, URLs, and capabilities to the editor instance. | Provide a generic host entity bridge beyond canonical WordPress posts. | [#57](https://github.com/Extra-Chill/blocks-everywhere/issues/57) |
| Service injection | Provide fetch, media, autosave, upload, mention, notification, or telemetry services. | Accept per-instance editor services without global coupling. | [#59](https://github.com/Extra-Chill/blocks-everywhere/issues/59) |
| Server-side bootstrapping | Emit editor settings, nonce data, allowed blocks, entity context, and initial content on the page. | Make server-side context bootstrapping extensible for frontend applications. | [#60](https://github.com/Extra-Chill/blocks-everywhere/issues/60) |

## Adapter Responsibilities

### Dynamic Mount/Unmount

Use a host adapter when the editor is not a static page-load enhancement. Common examples include inline replies, drawer composers, modal editors, infinite-list draft forms, and route-driven frontend apps.

The adapter should:

- Create a stable editor target for each instance.
- Pass an instance key that remains stable for the lifetime of the edit session.
- Unmount the editor when the host route, modal, drawer, or list item is removed.
- Release host listeners, pending requests, and slot registrations during teardown.

Until the public mount/unmount API in [#50](https://github.com/Extra-Chill/blocks-everywhere/issues/50) lands, existing integrations should keep using the current textarea-driven enhancement path and avoid inventing host-specific global mount APIs.

### Content Bridges

The content bridge is the boundary between host persistence and Gutenberg serialization.

The adapter should provide:

- `loadContent`: returns serialized block markup or a legacy value that can be transformed before editing.
- `saveContent`: receives serialized block markup and host metadata such as entity ID, parent ID, draft ID, or revision token.
- `onInput` or `onChange`: updates host dirty state, autosave state, or optimistic UI.
- `onError`: maps editor or persistence failures to host notifications.

Prefer serialized block markup as the bridge format. If the host currently stores another format, convert it at the adapter boundary and track the missing generic bridge work in [#52](https://github.com/Extra-Chill/blocks-everywhere/issues/52) and [#55](https://github.com/Extra-Chill/blocks-everywhere/issues/55).

### Custom Stores And Context

Some embedded editors need host data while editing: current entity, viewer capabilities, related records, selected parent, mention suggestions, upload limits, or feature flags. Keep that data explicit.

The adapter should:

- Register only the stores the editor instance needs.
- Scope data to the editor instance instead of relying on ambient globals.
- Treat host context as read-only unless the bridge explicitly supports writes.
- Keep sensitive values behind host services rather than serializing them into editor settings.

Use [#53](https://github.com/Extra-Chill/blocks-everywhere/issues/53) for gaps where custom data stores or per-instance context cannot yet be injected cleanly.

### Editor Modes

Different host surfaces usually need different editor modes. A full post editor, compact reply composer, inline comment editor, draft editor, and moderation editor should not all share the same chrome and settings.

Mode selection should drive:

- Allowed blocks and transforms.
- Toolbar density and visible panels.
- Whether media, embeds, link UI, document tools, and block tools are available.
- Placeholder text and starter content.
- Autosave and submit behavior.

Use current `blocksEverywhere.toolbar` settings for toolbar primitive opt-outs. Track broader mode-aware settings in [#56](https://github.com/Extra-Chill/blocks-everywhere/issues/56).

### Slot And Chrome Extension

Host UI that belongs with the editor should render through Slots instead of wrapping or forking the editor shell.

Good slot fill candidates include:

- Submit, save, cancel, preview, or discard buttons.
- Status indicators such as saving, saved, failed, offline, pending review, or locked.
- Entity metadata such as parent title, destination, visibility, or draft label.
- Compact help text or policy notices that should remain attached to the editor.

Use the existing `window.blocksEverywhere.registerSlotFill( slot, renderFn )` API for `footer`, `toolbar`, and `heading` slots. Broader host-owned chrome areas are tracked in [#54](https://github.com/Extra-Chill/blocks-everywhere/issues/54).

```javascript
const unregister = window.blocksEverywhere.registerSlotFill(
	'footer',
	( textarea ) => {
		return window.wp.element.createElement(
			'button',
			{
				type: 'button',
				onClick: () => textarea.form?.requestSubmit(),
			},
			'Save draft'
		);
	}
);

// Call during host teardown.
unregister();
```

### Host Entity Bridges

A host entity bridge describes what is being edited without pretending every surface is a canonical WordPress post.

Bridge data can include:

- Entity type, ID, parent ID, and revision token.
- Author or viewer capability summary.
- Canonical URL, edit URL, preview URL, or API route.
- Save intent such as publish, submit, update, reply, or save draft.
- Locking, conflict, or freshness metadata.

Keep the editor API generic by passing entity facts instead of host-specific objects. Track missing entity bridge support in [#57](https://github.com/Extra-Chill/blocks-everywhere/issues/57).

### Service Injection

Services are functions the editor can call without learning host internals.

Useful services include:

- `apiFetch`: authenticated host requests.
- `media`: upload, select, or validate media.
- `autosave`: save draft content without submitting the host form.
- `mentions`: resolve autocomplete suggestions.
- `notify`: show success, warning, and error notices.
- `telemetry`: record editor lifecycle and performance events.

Inject services per instance where possible. Avoid mutating global WordPress packages or relying on a single global service registry for multiple editors. Track this work in [#59](https://github.com/Extra-Chill/blocks-everywhere/issues/59).

### Lifecycle Events

Lifecycle events let the host coordinate UI without polling editor state.

Useful events include:

- `beforeMount`: host target and boot settings are available.
- `ready`: editor packages, blocks, and initial content are loaded.
- `focus` and `blur`: host can update active composer state.
- `input` and `change`: host can mark the entity dirty or schedule autosave.
- `loading` and `loaded`: host can show skeletons or disable actions.
- `saveStart`, `saveSuccess`, and `saveError`: host can update submit UI.
- `beforeUnmount` and `unmounted`: host can release listeners and services.

The generic lifecycle hook and UI-state event work is tracked in [#51](https://github.com/Extra-Chill/blocks-everywhere/issues/51) and [#58](https://github.com/Extra-Chill/blocks-everywhere/issues/58).

### Server-Side Context Bootstrapping

Server-side bootstrapping should produce the initial editor contract for a host surface before JavaScript mounts.

Bootstrap data usually includes:

- Editor instance key and mode.
- Initial serialized content or template seed.
- Allowed blocks, embeds, styles, and toolbar settings.
- Current entity bridge data.
- Nonce or request metadata needed by injected services.
- Viewer capability summary.
- Feature flags and host URLs.

Keep bootstrap payloads minimal and auditable. Do not serialize secrets or broad user/session objects into page settings. Use [#60](https://github.com/Extra-Chill/blocks-everywhere/issues/60) for missing extension points in frontend app bootstrapping.

## Suggested Migration Steps

1. Inventory the current editor shell and mark each behavior as editor runtime, content bridge, host entity bridge, slot/chrome, service, lifecycle, or server bootstrap.
2. Replace host-owned block editing primitives with Blocks Everywhere settings and serialized block content.
3. Move submit buttons, save status, metadata badges, and compact controls into slot fills.
4. Move persistence to a content bridge that receives serialized blocks and host entity metadata.
5. Move host APIs behind injected services instead of importing host modules inside editor components.
6. Add lifecycle event handling for ready, focus, dirty, save, error, and teardown states.
7. Keep any remaining host-specific code in the adapter and link each missing generic capability to the relevant tracking issue above.

## Evaluation Checklist

Use this checklist to decide whether Blocks Everywhere can replace a bespoke embedded editor shell for a host surface.

- The host can represent edited content as serialized block markup at the adapter boundary.
- The host can identify each editor instance with stable entity and instance keys.
- Required host UI can be rendered outside the editor or through slots.
- Required host data can be passed as explicit context, store data, or service calls.
- The editor mode can be described with settings rather than a forked shell.
- The host can bootstrap initial settings server-side or through a clear frontend app payload.
- Open gaps are generic enough to map to issues [#50](https://github.com/Extra-Chill/blocks-everywhere/issues/50)-[#60](https://github.com/Extra-Chill/blocks-everywhere/issues/60).
