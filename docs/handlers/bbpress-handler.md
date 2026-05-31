# bbPress Integration Guide

Blocks Everywhere integrates the Gutenberg block editor into bbPress topic and reply forms through the shared context engine and portable editor runtime.

## Status

| Area | Status | Notes |
| --- | --- | --- |
| Frontend topics/replies | Maintained | Uses the bbPress context config and shared editor loader. |
| Content rendering | Maintained | Uses WordPress block parsing/rendering plus KSES-aware sanitization. |
| Draft/autosave restore | Maintained | Implemented in the frontend bbPress adapter. |
| Media endpoint support | Maintained | Scoped through the bbPress adapter/services. |
| Admin editing | Supported where enabled | Capability checks remain host controlled. |

## Backend Integration

The bbPress context is registered from `classes/contexts/bbpress.php`. The context engine evaluates whether the current request is a bbPress editing surface, then loads the shared editor assets and bootstrap settings for the configured textarea/container pair.

```text
bbPress request
        ↓
bbPress context condition
        ↓
shared editor loader
        ↓
bootstrap settings for topic/reply textarea
        ↓
frontend portable editor runtime
```

The shared PHP layer owns editor setup, allowed block defaults, block rendering helpers, and sanitized settings bootstrap. bbPress-specific behavior should stay in the bbPress context config or frontend adapter instead of being added to the generic runtime.

## Frontend Adapter

bbPress-specific browser behavior lives in `src/editor/bbpress-adapter.ts`. It coordinates topic/reply behavior that is not generic to every embedded editor, including draft restore, reply switching, media endpoint details, and bbPress-specific autocomplete behavior.

Generic editor capabilities should use the portable editor contracts instead:

- `blocksEverywhere.mode`
- `blocksEverywhere.services`
- `blocksEverywhere.lifecycle`
- `blocksEverywhere.contentBridge`
- `blocksEverywhere.entityBridge`
- `blocksEverywhere.initialContent`
- registered slot fills

## Content Rendering

Forum content is stored as serialized Gutenberg block markup and rendered through WordPress block APIs.

```text
stored topic/reply content
        ↓
parse/render WordPress blocks
        ↓
apply allowed HTML sanitization
        ↓
render forum output
```

The default allowed blocks are KSES-aware. Hosts can further restrict or expand the list through editor settings.

## Configuration

Enable bbPress support with the constant or filter:

```php
define( 'BLOCKS_EVERYWHERE_BBPRESS', true );

add_filter( 'blocks_everywhere_bbpress', '__return_true' );
```

Adjust bbPress editor settings through `blocks_everywhere_editor_settings` or the bbPress context config:

```php
add_filter( 'blocks_everywhere_editor_settings', function ( $settings ) {
	$settings['blocksEverywhere']['mode'] = 'compact-reply';
	$settings['blocksEverywhere']['blocks']['allowBlocks'] = [
		'core/paragraph',
		'core/list',
		'core/quote',
		'core/image',
	];

	return $settings;
} );
```

## Permissions

bbPress remains responsible for topic/reply permissions, author checks, moderation capabilities, and form availability. Blocks Everywhere should receive only the editor surfaces that bbPress has already decided the current user can access.

For custom host behavior, expose privileged actions through scoped services instead of serializing broad permissions or nonces into public settings.

## Adapter Guidance

- Keep bbPress-specific behavior in the bbPress context or `bbpress-adapter.ts`.
- Keep generic editor behavior in the portable editor contracts.
- Prefer instance-scoped settings, services, lifecycle callbacks, content bridges, and entity bridges over page-global hooks.
- Treat block patterns, synced patterns, and override behavior as upstream Gutenberg features unless a bbPress-specific bug is proven.

## Related Documentation

- [Architecture](../architecture.md)
- [Portable Editor Adapter Guide](../portable-editor-adapters.md)
- [Component Guide](../components.md)
