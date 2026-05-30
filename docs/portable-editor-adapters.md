# Portable Editor Adapter Guide

This guide is for teams migrating a bespoke embedded editor shell to Blocks Everywhere. It uses generic host terms so the same adapter shape can serve a frontend app, comment composer, reply editor, draft surface, or moderation UI.

Blocks Everywhere should own the Gutenberg editor runtime, block settings, editor chrome, and block serialization. The host adapter should own host routing, permissions, persistence, entity identity, and product-specific UI outside the editor.

## Adapter Contract

Think of the integration as four generic boundaries:

```
Host app
    owns routes, host state, permissions, persistence, and product UI
        |
        v
Adapter
    maps host concepts to editor settings, lifecycle callbacks, and services
        |
        +--> Entity bridge
        |       describes the edited record and coordinates edits
        |
        +--> Service adapters
        |       provide fetch, media, notices, autosave, and telemetry
        |
        v
Embedded editor
    owns Gutenberg packages, block canvas, chrome, slots, and serialization
```

Keep the adapter thin. If a behavior can be described as editor configuration, block availability, a slot fill, a content bridge, or a lifecycle callback, put it behind the Blocks Everywhere integration boundary instead of keeping a second editor shell.

The adapter contract is intentionally generic:

- **Host app** decides when an editor exists and which entity is being edited.
- **Frontend app** code mounts or unmounts editor instances when routes, drawers, modals, or list items change.
- **Embedded editor** receives settings and emits lifecycle, content, focus, and teardown signals.
- **Adapter** converts host state into Blocks Everywhere settings and responds to editor events.
- **Entity bridge** tracks identity, capabilities, revision state, and edit persistence for the current host record.
- **Service adapter** supplies editor-callable functions without exposing host internals to editor components.

## Current Public Surfaces

The first-wave APIs establish the shared surface that second-wave adapter work should build on:

| Surface | Current entry point | Use for |
|---------|---------------------|---------|
| Mounting | `window.blocksEverywhere.mountEditor( textarea, options )` | Dynamic editor creation for frontend app routes, modals, drawers, and inline composers. |
| Unmounting | `window.blocksEverywhere.unmount( mountOrTextarea )` or `mount.unmount()` | Cleanup when the host app removes the editor surface. |
| Instance lookup | `window.blocksEverywhere.getEditor( textarea )` | Focus and instance-level coordination from host UI. |
| Content API | `window.blocksEverywhere.getContentApi( textarea )` | Reading serialized block markup or replacing mounted editor content. |
| Content bridge | `settings.blocksEverywhere.contentBridge` | Loading, serializing, saving, and hot-replacing content through host persistence. |
| Lifecycle callbacks | `settings.blocksEverywhere.lifecycle` | Instance-scoped callbacks for load, focus, error, and teardown. |
| Lifecycle DOM events | `blocksEverywhere:editor:{event}` | Host listeners that should not be coupled to the settings object. |
| Slot fills | `window.blocksEverywhere.registerSlotFill( slot, renderFn )` | Host-owned controls and status rendered inside editor chrome. |
| Chrome settings | `settings.blocksEverywhere.chrome` and `settings.blocksEverywhere.toolbar` | Mode-like layout and toolbar choices already supported by the embedded editor. |
| Server bootstrap | context settings/preload/body-class/asset hooks | Preparing initial editor settings and frontend app payloads before mount. |

Second-wave work should extend these surfaces instead of introducing another global namespace or host-specific registry.

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

Use the public mount/unmount API from [#50](https://github.com/Extra-Chill/blocks-everywhere/issues/50) for dynamic editor instances instead of inventing host-specific global mount APIs.

### Content Bridges

The content bridge is the boundary between host persistence and Gutenberg serialization.

The adapter should provide:

- `load`: returns serialized block markup or parsed blocks before editing.
- `serialize`: optionally transforms parsed blocks into serialized block markup.
- `save`: receives parsed blocks, serialized block markup, and host metadata such as entity ID, parent ID, draft ID, or revision token.
- `replaceContent`: optionally transforms hot-replacement content before it enters the mounted editor.
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

Use the existing `window.blocksEverywhere.registerSlotFill( slot, renderFn )` API for `footer`, `toolbar`, `heading`, `topBar`, `actions`, `secondaryToolbar`, `documentSidebar`, `inserterSidebar`, and `windowControls` slots.

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

Currently emitted lifecycle events include:

- `before-load`: host target and boot settings are available.
- `loaded`: editor packages, blocks, and initial content are loaded.
- `focus-requested`, `focused`, and `blurred`: host can update active composer state.
- `error`: host can map editor failures to notices or telemetry.
- `before-unmount` and `unmounted`: host can release listeners and services.

Remaining adapter-level lifecycle candidates include dirty-state transitions, save start/success/error, submit intent, and autosave state. Add them through [#51](https://github.com/Extra-Chill/blocks-everywhere/issues/51) only when they need shared editor semantics rather than host-local callbacks.

The baseline lifecycle event work landed in [#58](https://github.com/Extra-Chill/blocks-everywhere/issues/58). Use [#51](https://github.com/Extra-Chill/blocks-everywhere/issues/51) for any remaining adapter-level lifecycle gaps that cannot be represented by the current callback and DOM event surface.

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

## Second-Wave Coordination

The remaining parallel issues should compose into one adapter contract rather than landing as unrelated option bags.

| Issue | Fits in the contract as | Coordination note |
|-------|--------------------------|-------------------|
| [#51](https://github.com/Extra-Chill/blocks-everywhere/issues/51) | Adapter lifecycle layer above the first-wave lifecycle events. | Start from the merged `settings.blocksEverywhere.lifecycle` callbacks and `blocksEverywhere:editor:*` DOM events. Add only missing adapter coordination points, such as save/submit semantics, dirty-state transitions, or standardized teardown cleanup. |
| [#53](https://github.com/Extra-Chill/blocks-everywhere/issues/53) | Adapter-provided editor context and optional stores. | Treat context as instance-scoped data that entity bridges, mode transforms, service adapters, blocks, and slot fills can read. Avoid ambient globals so multiple editors can use different context on one page. |
| [#56](https://github.com/Extra-Chill/blocks-everywhere/issues/56) | Mode transform pipeline for settings. | Mode transforms should run before mount and produce normal `settings.blocksEverywhere` values: allowed blocks, toolbar/chrome, templates, preference keys, lifecycle defaults, service choices, and context defaults. |
| [#57](https://github.com/Extra-Chill/blocks-everywhere/issues/57) | Entity bridge. | Define entity identity and edit semantics before services need to save, autosave, reset, or resolve capabilities. Keep canonical WordPress post behavior as one bridge implementation, not the only contract. |
| [#59](https://github.com/Extra-Chill/blocks-everywhere/issues/59) | Service adapter registry. | Services should receive the same instance context and entity bridge facts that lifecycle callbacks receive. Media, fetch, notices, autosave, suggestions, permissions, and telemetry should be replaceable per instance. |

Recommended sequencing:

1. Land the entity bridge shape from [#57](https://github.com/Extra-Chill/blocks-everywhere/issues/57) first, because context, services, lifecycle, and modes all need a shared way to identify the edited record.
2. Land context/store injection from [#53](https://github.com/Extra-Chill/blocks-everywhere/issues/53) next, using the entity bridge facts as the first context consumer.
3. Land mode transforms from [#56](https://github.com/Extra-Chill/blocks-everywhere/issues/56) once there is a stable context object to transform from and into.
4. Land service adapters from [#59](https://github.com/Extra-Chill/blocks-everywhere/issues/59) after entity and context are stable enough for services to receive consistent arguments.
5. Finish [#51](https://github.com/Extra-Chill/blocks-everywhere/issues/51) last or in parallel as a thin coordination pass, limited to lifecycle gaps not already covered by [#58](https://github.com/Extra-Chill/blocks-everywhere/issues/58).

The common argument shape should stay consistent across these issues:

```javascript
const adapterContext = {
	textarea,
	container,
	settings,
	mode,
	entity,
	services,
};
```

Use this as documentation vocabulary, not a required implementation object until the related issues land. The important constraint is that each callback or service receives the same editor instance facts instead of inventing per-feature parameter lists.

## Suggested Migration Steps

1. Inventory the current editor shell and mark each behavior as editor runtime, content bridge, host entity bridge, slot/chrome, service, lifecycle, or server bootstrap.
2. Replace host-owned block editing primitives with Blocks Everywhere settings and serialized block content.
3. Move submit buttons, save status, metadata badges, and compact controls into slot fills.
4. Move persistence to a content bridge that receives serialized blocks and host entity metadata.
5. Move host APIs behind service adapters instead of importing host modules inside editor components.
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
