# Blocks Everywhere Architecture

Blocks Everywhere is organized around a small PHP context engine and a native Gutenberg editor runtime. The current architecture replaces the old inheritance-based handler model and legacy standalone editor wrapper.

## Backend Layout

```text
classes/
├── class-editor.php      # WordPress/Gutenberg asset and editor settings integration
├── class-handler.php     # Shared editor loading, allowed blocks, rendering, and bootstrap helpers
├── class-engine.php      # Data-driven context manager
└── contexts/
    ├── bbpress.php
    ├── buddypress.php
    └── comments.php
```

`Engine` collects context configs from `blocks_everywhere_contexts`, checks each context condition, wires context-specific filters, and calls the shared editor loader with the context's textarea/container settings.

## Context Config Shape

Contexts are plain configuration arrays. They can provide conditions, textareas, containers, body classes, allowed blocks, settings transforms, preload paths, server block settings, and setup callbacks.

```php
add_filter( 'blocks_everywhere_contexts', function ( $contexts ) {
	$contexts['example'] = [
		'condition'      => fn () => is_singular(),
		'textarea'       => '#example-content',
		'container'      => '.example-editor',
		'mode'           => 'compact',
		'allowed_blocks' => [ 'core/paragraph', 'core/list' ],
	];

	return $contexts;
} );
```

## Frontend Layout

```text
src/
├── index.tsx                     # Public namespace and page-global Gutenberg bootstrap
├── bootstrap-settings.ts          # Registered settings and aggregate page-global decisions
├── block-customization/           # Page-global block registration customizations
└── editor/
    ├── index.tsx                  # mountEditor runtime
    ├── embedded-editor-shell.tsx   # native Gutenberg shell/chrome
    ├── content-bridge.tsx          # external content API
    ├── post-entity-shell.tsx       # canonical WP post entity bridge
    ├── bbpress-adapter.ts          # bbPress-specific adapter behavior
    ├── editor-services.ts          # shared service/context types
    └── slot-fills.tsx              # host chrome extension slots
```

## Runtime Flow

```text
server emits one or more settings objects
        ↓
window.wpBlocksEverywhereSettings registry
        ↓
src/index.tsx mounts matching textareas
        ↓
mountEditor() resolves modes/transforms/services
        ↓
BlockEditorProvider renders the embedded Gutenberg shell
        ↓
content bridge / entity bridge / lifecycle / services coordinate host behavior
```

## Extension Boundaries

### Instance-Scoped

These can vary per mounted editor instance:

- `blocksEverywhere.mode` and `modes`
- `settingsTransforms`
- `contentBridge`
- `entityBridge`
- `initialContent`
- `services` and `servicesByMode`
- `lifecycle` callbacks and host adapter callbacks
- `data.context`, `data.blockContext`, and registered stores
- toolbar/chrome/sidebar settings
- allowed/disallowed blocks via editor settings

### Page-Global

Some Gutenberg APIs are page-global hooks or registries. Blocks Everywhere keeps these boundaries explicit and uses the aggregate bootstrap settings summary for decisions such as block registration customization, rich-text format removal, MediaUpload hook installation, and bbPress-only block variation pruning.

Avoid putting host-specific behavior into these global paths when it can be represented as an instance setting, service, lifecycle callback, content bridge, or entity bridge.

## Content Flow

```text
textarea / contentBridge / entityBridge / initialContent
        ↓
parsed blocks seeded into BlockEditorProvider
        ↓
onInput / onChange serialize block content
        ↓
contentBridge.save + entityBridge.saveEdits + lifecycle events
        ↓
host persistence or textarea sync
```

## Rendering Flow

```text
stored serialized blocks
        ↓
WordPress block parsing/rendering
        ↓
KSES-aware sanitization
        ↓
frontend output
```

## Adapter Rule Of Thumb

Host adapters own routing, persistence, permissions, entity identity, and product-specific UI. Blocks Everywhere owns Gutenberg composition, serialization, lifecycle, and generic extension contracts.

When a behavior can be expressed as settings, services, lifecycle callbacks, content bridges, entity bridges, or slot fills, prefer those contracts over new page-global hooks.
