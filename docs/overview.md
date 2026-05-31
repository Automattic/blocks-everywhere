# Blocks Everywhere Overview

Blocks Everywhere embeds the Gutenberg block editor in WordPress surfaces outside the wp-admin post editor. It is designed for comments, bbPress forums, BuddyPress-style activity surfaces, moderation tools, and host applications that need a portable editor instance on the frontend.

## What It Provides

- Native Gutenberg package integration without a legacy standalone editor wrapper.
- A context engine for comments, bbPress, BuddyPress, and custom host surfaces.
- Per-instance editor settings for allowed blocks, modes, toolbar/chrome, content bridges, entity bridges, services, lifecycle callbacks, and initial content.
- Page-global Gutenberg bootstrap for APIs that WordPress exposes globally, with those boundaries documented in the portable adapter guide.
- Server-rendered bootstrap settings for one or more editor instances on the same page.

## Integration Status

| Surface | Status | Notes |
| --- | --- | --- |
| bbPress | Maintained | Topics/replies, draft restore/autosave, media endpoint support, KSES-aware allowed blocks. |
| WordPress comments | Supported | Comment depth and theme form styling still depend on the host theme. |
| BuddyPress-style contexts | Basic | Generic context support exists; product-specific behavior may need adapters. |
| Custom host apps | Supported through adapter APIs | Use the portable editor mount/settings/lifecycle/service contracts. |

## Runtime Model

```text
server context config
        ↓
settings bootstrap registry
        ↓
mountEditor(textarea, settings)
        ↓
native Gutenberg BlockEditorProvider
        ↓
content bridge / entity bridge / services / lifecycle callbacks
```

The editor runtime composes Gutenberg primitives directly. Host applications own routing, persistence, permissions, and product-specific UI. Blocks Everywhere owns editor composition, block serialization, bootstrap settings, and generic extension points.

## Configuration

Blocks Everywhere can be enabled with constants or filters:

```php
define( 'BLOCKS_EVERYWHERE_COMMENTS', true );
define( 'BLOCKS_EVERYWHERE_BBPRESS', true );
define( 'BLOCKS_EVERYWHERE_BUDDYPRESS', true );
define( 'BLOCKS_EVERYWHERE_ADMIN', true );
define( 'BLOCKS_EVERYWHERE_THEME_COMPAT', true );
```

Editor settings can be adjusted through context configs or the `blocks_everywhere_editor_settings` filter:

```php
add_filter( 'blocks_everywhere_editor_settings', function ( $settings ) {
	$settings['blocksEverywhere']['blocks']['allowBlocks'][] = 'namespace/custom-block';
	$settings['blocksEverywhere']['mode'] = 'compact-reply';

	return $settings;
} );
```

## Portable Editor APIs

The frontend namespace exposes the main integration points:

- `window.blocksEverywhere.mountEditor( textarea, options )`
- `window.blocksEverywhere.unmount( mountOrTextarea )`
- `window.blocksEverywhere.getContentApi( textarea )`
- `window.blocksEverywhere.getEditor( textarea )`
- `window.blocksEverywhere.getSettings( key )`
- `window.blocksEverywhere.registerSettings( key, settings )`
- `window.blocksEverywhere.registerSlotFill( slot, renderFn )`

See [Portable Editor Adapter Guide](portable-editor-adapters.md) for the full adapter boundary, including content bridges, initial content transforms, services, lifecycle events, entity bridges, modes, and page-global Gutenberg bootstrap constraints.

## Security Model

- Content is rendered through WordPress block rendering and sanitization paths.
- Allowed block lists derive from KSES-aware defaults and explicit settings.
- Sensitive operations should live behind services instead of broad serialized settings.
- Public lifecycle DOM events intentionally expose sanitized details rather than raw settings, nonces, services, or registry internals.

## Development

- Build: `yarn build`
- Targeted JS lint: `yarn wp-scripts lint-js <files>`
- PHP tests: `composer run-script test`

## Related Documentation

- [Architecture](architecture.md)
- [Portable Editor Adapter Guide](portable-editor-adapters.md)
- [Component Guide](components.md)
- [Build & Development](build-and-development.md)
