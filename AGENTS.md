# Blocks Everywhere - Agent Development Guide

## Plugin Overview

Blocks Everywhere extends the WordPress Gutenberg block editor to environments outside the traditional post editor:

- **WordPress Comments**: Users write comments using Gutenberg blocks
- **bbPress Forums**: Forum participants use blocks for topics and replies (support: "good")
- **BuddyPress**: Activity streams and messaging with blocks (support: "needs work")
- **Admin Moderation**: Moderators use block editor for content review

### Architecture

- **Entry Point**: `blocks-everywhere.php` bootstraps plugin
- **Classes**: Object-oriented handlers in `classes/` with inheritance-based architecture
  - `class-editor.php` - Asset/configuration management
  - `class-handler.php` - Base handler with shared functionality
  - `handlers/` - Platform-specific handlers (bbPress, Comments, BuddyPress)
- **Frontend**: TypeScript/React components in `src/` build via `@wordpress/scripts`
- **Assets**: Compiled JavaScript and SCSS in `build/` directory
- **Tests**: PHPUnit tests in `tests/` directory

### Plugin Bootstrap

Main file loads components in sequence:
1. Define plugin constants and paths
2. Require class files (Editor, Handler, platform handlers)
3. Initialize Editor instance
4. Conditionally initialize platform handlers based on filters/constants
5. Register WordPress hooks for asset loading and initialization

## Handler System

### Handler Hierarchy

```
Handler (abstract base)
├── bbPress (forums)
├── Comments (WordPress native)
└── BuddyPress (social networks)
```

### Creating Custom Handlers

All handlers extend `Automattic\Blocks_Everywhere\Handler` and implement:

1. **Constructor** - Register hooks into platform
2. **should_load_editor()** - Detect if editor needed on page
3. **enable_editor()** - Load editor assets and configuration
4. **Content processing** - Implement filters to process blocks in content

### Platform Handler Patterns

**bbPress Handler** (`class-bbpress.php`):
- Hooks: `bbp_template_redirect` (frontend), `bbp_ready` (admin)
- Filters: `bbp_get_forum_content`, `bbp_get_topic_content`, `bbp_get_reply_content`
- Admin: Topic/reply/forum edit screens

**Comments Handler** (`class-comments.php`):
- Hooks: `comment_form_default_fields`, `comment_text` filter
- Supports threaded comment editing
- Works with all themes

**BuddyPress Handler** (`class-buddypress.php`):
- Hooks: Activity stream display
- Integrates with BuddyPress form system
- Current: Basic support, needs enhancement

## Build / Lint / Test

### Dependencies
- Install: `yarn install && composer install`

### Development Workflow
- **Watch**: `yarn start` (watches src/, rebuilds, hot reload)
- **Build**: `yarn build` (minifies, optimizes for production)
- **Lint**: 
  - JavaScript: `yarn lint:js` (ESLint)
  - CSS: `yarn lint:css` (stylelint)
  - PHP: `yarn lint:php` (PHP_CodeSniffer via phpcs.xml)

### Testing
- **PHP Tests**: `yarn test:php` (runs vendor/bin/phpunit)
  - Single file: `./vendor/bin/phpunit "tests/test-bbpress-content.php"`
  - Single test: `./vendor/bin/phpunit --filter "test_name"`
- **Static Analysis**: `composer run psalm-check` (Psalm type checker)
- **Subpackage**: `yarn --cwd isolated-block-editor test` (Isolated Block Editor tests)

### Release Process
- `yarn release` (clean package without dev files)
- `yarn dist` (creates versioned ZIP for WordPress.org)

## Code Style & Standards

### TypeScript/React (JavaScript)

**File Organization**:
- Components: `src/blocks/*/` structure (feature-based organization)
- Styles: Modular SCSS (one file per feature)
- Types: Full TypeScript with avoid `any` except WordPress globals

**Naming**:
- Components: `PascalCase` (e.g., `BlockEditor.tsx`)
- Functions: `camelCase` (e.g., `processBlocks()`)
- Constants: `UPPER_SNAKE_CASE`

**Imports**:
- Group: WordPress → internal → local utilities
- Enforce via `@wordpress/dependency-group` eslint plugin
- Avoid: Deep imports like `@wordpress/block-editor/components`

**Formatting**:
- Tool: Prettier with `@wordpress/prettier-config`
- `printWidth: 120`, use tabs for indentation
- Semicolons required, single quotes for strings

### PHP

**Namespace**: `Automattic\Blocks_Everywhere` (and `Automattic\Blocks_Everywhere\Handler` for handlers)

**Class Names**: `Pascal_Case` (e.g., `class Comments_Handler`)

**Method Names**: `snake_case` (e.g., `public function enable_editor()`)

**Coding Standards**: Follow WordPress Coding Standards via `phpcs.xml`:
- 4-space indentation
- 80-120 character line length
- Same-line opening braces
- Inline documentation for functions/classes

**Input/Output Safety**:
- Sanitize all user input: `sanitize_text_field()`, `wp_kses_post()`
- Escape all output: `esc_html()`, `esc_attr()`, `esc_url()`
- Prepared statements for database queries
- Nonce verification for forms
- Capability checks before actions

**Error Handling**: Prefer WordPress patterns, avoid silent failures

### CSS/SCSS

**Files**: Modular SCSS organized by platform
- `styles/editor.scss` - Base editor styles
- `styles/bbpress.scss` - Forum-specific
- `styles/comments.scss` - Comment-specific  
- `styles/buddypress.scss` - Activity-specific
- `styles/theme-compat.scss` - Compatibility fixes

**Forbidden**: 
- No inline styles
- No `!important` (except for editor style overrides)
- No browser prefixes (handled by autoprefixer)

**CSS Modules**: Used for component-scoped styles

## Architectural Decisions

### Isolated Block Editor Dependency

Blocks Everywhere uses [Isolated Block Editor](https://github.com/Automattic/isolated-block-editor) - a standalone Gutenberg implementation that can be embedded anywhere.

**Why Not Full Gutenberg**:
- Blocks Everywhere runs outside WordPress admin
- Can't use WordPress admin editor UI
- Isolated Block Editor provides minimal footprint
- Full control over styling and behavior

**Integration Pattern**:
1. Editor class loads Isolated Block Editor JS/CSS
2. Handler classes configure editor for each platform
3. Editor instance initialized on form elements
4. Content saved as serialized blocks

### Handler-Based Extensibility

Why handlers instead of single class:
- Each platform has different lifecycle (bbPress hooks ≠ comment hooks)
- Handlers can be independently enabled/disabled
- Easy to add new platform support
- Clear separation of concerns

### Content Processing via Filters

Why filter-based rendering:
- Integrates with WordPress display pipeline
- Compatible with caching plugins
- Works with nested content (comments in comments, etc.)
- Allows third-party modification

**Filter Chain**:
```
bbp_get_topic_content → do_blocks() → wp_kses_post() → output
```

## Isolated Block Editor

### What It Provides

- Standalone block editor component
- Works in textarea replacement
- Minimal styling (CSS class isolation)
- Full block library support
- No dependency on WordPress admin

### Configuration

Editor settings passed via filter:

```php
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
    $settings['iso']['blocks']['allowBlocks'] = [ 'core/paragraph', ... ];
    $settings['iso']['allowEmbeds'] = [ 'youtube', 'twitter' ];
    return $settings;
} );
```

### Style Isolation

**Challenge**: Editor placed directly on page (not iframe), so:
- Page styles may affect editor appearance
- Editor styles may affect page rendering

**Solution**:
- Editor wrapped in `.wp-block-editor` container
- CSS specificity used to prevent conflicts
- Theme compatibility mode for common issues
- Better approach: Make theme CSS more specific

## Development Patterns

### Adding Block Support to New Platform

1. Create `Handler\NewPlatform extends Handler`
2. Implement `__construct()` with hooks
3. Implement `should_load_editor()` detection
4. Implement `enable_editor()` initialization
5. Hook into content output with `do_blocks()`
6. Register in main plugin file
7. Add configuration via filter
8. Test on multiple themes

### Customizing Editor Settings

```php
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
    // Restrict blocks
    $settings['iso']['blocks']['allowBlocks'] = [ ... ];
    
    // Configure embeds
    $settings['iso']['allowEmbeds'] = [ ... ];
    
    // Custom styling
    $settings['iso']['className'] = 'my-custom-editor';
    
    // Add bbPress-specific config
    $settings['bbpress'] = [ ... ];
    
    return $settings;
} );
```

### Testing Handlers

- **Unit Tests**: Test handler initialization, should_load_editor() logic
- **Integration Tests**: Test with actual platform plugins (bbPress, etc.)
- **Theme Tests**: Test style isolation on different themes
- **Manual Tests**: Test user workflows (create topic, reply, comment)

## Troubleshooting

### Editor Not Appearing

**Debug Checklist**:
1. Is filter returning true? `apply_filters( 'blocks_everywhere_bbpress', ... )`
2. Does minimum plugin version match? (bbPress 2.6+)
3. Is user logged in with edit capability?
4. Check browser console for JavaScript errors

### Blocks Not Rendering

**Debug Checklist**:
1. Is content saved as serialized blocks? (Check database)
2. Is `do_blocks()` being called?
3. Are KSES rules blocking HTML?
4. Check server error logs

### Style Conflicts

**Debug Checklist**:
1. Inspect editor element in DevTools
2. Check if page styles override block styles
3. Try enabling `BLOCKS_EVERYWHERE_THEME_COMPAT`
4. Add custom CSS via filter

## File Structure

```
blocks-everywhere/
├── blocks-everywhere.php          (Entry point)
├── classes/
│   ├── class-editor.php           (Asset/config management)
│   ├── class-handler.php          (Base handler)
│   └── handlers/
│       ├── class-bbpress.php      (Forum integration)
│       ├── class-comments.php     (Comment integration)
│       └── class-buddypress.php   (Activity integration)
├── src/                           (TypeScript/React source)
│   ├── index.tsx                  (Main entry)
│   ├── editor/                    (Editor components)
│   ├── blocks/                    (Custom blocks)
│   ├── styles/                    (SCSS modules)
│   └── completer/                 (Autocomplete utilities)
├── tests/                         (PHPUnit tests)
├── build/                         (Compiled output)
├── composer.json                  (PHP dependencies)
├── package.json                   (JavaScript dependencies)
└── docs/                          (User documentation)
```

## Documentation

### For Users
- `/docs/overview.md` - Plugin purpose and features
- `/docs/handlers/*` - Platform-specific guides

### For Developers
- `/docs/architecture.md` - Class hierarchy and design
- `/docs/components.md` - React component organization
- `/docs/build-and-development.md` - Development workflow
- `/docs/theme-compatibility.md` - Style integration

## Key Dependencies

**External Libraries**:
- `Isolated Block Editor` - Standalone editor implementation
- WordPress Gutenberg packages (auto-loaded from WordPress)
- `@wordpress/scripts` - Build tooling

**WordPress Requirements**:
- Minimum WordPress: 5.0
- Minimum PHP: 7.4
- Optional: bbPress 2.6+, BuddyPress

## Forbidden Patterns

- Do NOT use PSR-4 autoloading for plugin code (use direct includes)
- Do NOT use `!important` in CSS (except editor override styles)
- Do NOT use inline scripts or styles
- Do NOT use backward compatibility fallbacks
- Do NOT leave references to deleted functionality

## Planning Standards

1. Identify exact files and classes to modify
2. List all method changes with signatures
3. Detail filter/action changes
4. Include all edge cases and error handling
5. Plan tests for new functionality
6. Update documentation before implementation

## Performance Considerations

- Asset loading conditional (only load when needed)
- Editor scripts large: lazy-load outside critical path
- Block processing via filters: may impact rendering speed
- Theme CSS scope: avoid global styles affecting editor

## Future Enhancement Areas

1. **BuddyPress Support**: Full implementation of "needs work" features
2. **Performance**: Optimize editor loading and rendering
3. **Theming**: Better style isolation patterns
4. **Hooks**: Expand extensibility for third-party integration
5. **Accessibility**: Enhance keyboard navigation and screen reader support
