# Components

Blocks Everywhere is a React/TypeScript editor runtime for mounting Gutenberg in host application surfaces. This page is a short map of the current source layout and component responsibilities. For the integration contract between a host app, its adapter, and the embedded editor, see the [Portable Editor Adapter Guide](portable-editor-adapters.md).

## Source Layout

```text
src/
├── index.tsx                    Main entry point and public mount API bootstrap
├── editor/                      Embedded editor shell and adapter-facing APIs
│   ├── index.tsx                Editor registration and mount lifecycle
│   ├── embedded-editor-shell.tsx Gutenberg editor shell used by portable mounts
│   ├── post-entity-shell.tsx    WordPress post-backed shell for classic contexts
│   ├── content-bridge.tsx       Adapter-facing content read/write bridge
│   ├── slot-fills.tsx           Host slot-fill registry
│   ├── detached-sidebar.tsx     Optional editor chrome panels
│   ├── bbpress-adapter.ts       Built-in host adapter helpers
│   └── buddypress.tsx           Built-in host surface integration
├── block-customization/         Core block behavior adjustments
│   ├── index.tsx
│   ├── embed.tsx
│   └── paragraph/
│       ├── index.tsx
│       ├── edit.tsx
│       └── use-enter.tsx
├── support-content-block/       Support content embed block implementation
│   ├── block.ts
│   ├── index.tsx
│   ├── edit.tsx
│   ├── save.tsx
│   └── view.ts
└── styles/                      Editor, block, and host-surface styles
```

Keep new source close to the boundary it serves:

- Editor runtime behavior belongs in `src/editor/`.
- Adapter-facing content, lifecycle, chrome, and service boundaries should extend the public surfaces described in [Portable Editor Adapter Guide](portable-editor-adapters.md).
- Core block tweaks belong in `src/block-customization/`.
- Support content block code belongs in `src/support-content-block/`.
- Host-specific glue should stay thin and translate host state into generic editor settings, services, lifecycle callbacks, or content bridges.

## Runtime Boundaries

Blocks Everywhere code should preserve a clear separation between the host app, adapter, and embedded editor:

| Boundary | Owns |
|----------|------|
| Host app | Routing, persistence, permissions, surrounding product UI, and entity identity. |
| Adapter | Mapping host state into Blocks Everywhere settings, lifecycle callbacks, content bridges, services, and slot fills. |
| Embedded editor | Gutenberg packages, block canvas, editor chrome, block settings, serialization, and editor lifecycle events. |

Prefer generic extension points over host-specific branches. If a behavior can be represented as settings, a content bridge, a service adapter, a lifecycle callback, or a slot fill, add it behind that boundary instead of forking the editor shell.

## Component Patterns

Use TypeScript for new editor components and keep props explicit:

```typescript
interface EmbeddedEditorProps {
	content: string;
	onChange: ( content: string ) => void;
	settings: EditorSettings;
}

export function EmbeddedEditor( {
	content,
	onChange,
	settings,
}: EmbeddedEditorProps ) {
	return <EditorCanvas content={ content } onChange={ onChange } settings={ settings } />;
}
```

General conventions:

- Use `PascalCase` for React components and `camelCase` for functions.
- Avoid `any` in new code; add small local interfaces for adapter settings, callbacks, and payloads.
- Keep host data explicit. Pass it through `settings.blocksEverywhere.data`, `entityBridge`, `contentBridge`, or injected services instead of reading broad globals inside editor components.
- Keep editor components reusable across host surfaces; host-specific naming belongs in adapters, not shared editor runtime code.

## Editor Configuration

Server filters prepare default editor settings before JavaScript mounts:

```php
add_filter( 'blocks_everywhere_editor_settings', function ( $settings ) {
	$settings['blocksEverywhere']['blocks']['allowBlocks'] = array(
		'core/paragraph',
		'core/image',
		'core/list',
	);

	return $settings;
} );
```

Dynamic hosts can override settings per mount:

```typescript
const mount = window.blocksEverywhere.mountEditor( textarea, {
	settings: {
		...window.wpBlocksEverywhere,
		blocksEverywhere: {
			...window.wpBlocksEverywhere.blocksEverywhere,
			data: {
				context: {
					entityType: 'comment',
					entityId: 42,
				},
			},
		},
	},
} );
```

Use the adapter guide for the current public surfaces: mount/unmount, content API, content bridge, entity bridge, lifecycle callbacks/events, slot fills, chrome settings, service adapters, and server bootstrap.

## Styling

Styles are grouped by editor surface and host surface under `src/styles/`. Keep shared editor styles generic, then add narrow host-surface overrides only where the host page markup requires them.

When adding component styles:

- Prefer editor-owned classes for editor chrome and block canvas behavior.
- Keep host layout assumptions out of shared components.
- Use CSS custom properties where a host needs to theme spacing, colors, or chrome density.

## Build And Validation

Common local commands:

```bash
yarn start      # Watch and rebuild during development
yarn build      # Production build
yarn lint:js    # JavaScript/TypeScript linting
yarn lint:css   # Style linting
yarn lint:php   # PHP linting
yarn test:php   # PHP tests
```

For documentation-only changes, a build is usually unnecessary. Run `git diff --check` before committing to catch whitespace and formatting issues.

## See Also

- [Portable Editor Adapter Guide](portable-editor-adapters.md)
- [Architecture Guide](architecture.md)
- [Build & Development](build-and-development.md)
