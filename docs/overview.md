# Blocks Everywhere - Overview

## Purpose

Blocks Everywhere is a WordPress plugin that extends the Gutenberg block editor to environments outside the traditional WordPress post editor. It enables rich content editing with Gutenberg blocks in:

- **WordPress Comments**: Users can use blocks when writing comments
- **bbPress Forums**: Forum users get full block editor access for topics and replies (marked as "good" support level)
- **BuddyPress**: Social network integration (marked as "needs work" - in development)
- **Admin Moderation**: Administrators can moderate content using the block editor

## Key Features

### Platform Integration Levels

| Platform | Status | Support Level |
|----------|--------|---|
| bbPress | Fully supported | Good |
| WordPress Comments | Supported with caveats | Alright |
| BuddyPress | Basic support, limitations | Needs work |

### Gutenberg Features Available

- Full block library (subject to site's allowed blocks via KSES)
- Block formatting and styling
- Embed functionality
- Media insertion and management
- Custom block support
- Code blocks and formatting

## Architecture Overview

### Core Components

1. **Editor Class** (`classes/class-editor.php`)
   - Loads Gutenberg assets and configuration
   - Manages editor initialization
   - Configures editor settings and permissions

2. **Handler System** (`classes/class-handler.php`)
   - Base handler class for all platform implementations
   - Provides common functionality for block processing
   - Manages content rendering with blocks

3. **Platform Handlers** (`classes/handlers/`)
   - **bbPress Handler** - Integrates blocks into forum content
   - **Comments Handler** - Enables blocks in WordPress comments
   - **BuddyPress Handler** - Provides BuddyPress integration

### Isolated Block Editor Dependency

Blocks Everywhere uses the [Isolated Block Editor](https://github.com/Automattic/isolated-block-editor/) - a standalone implementation of the Gutenberg editor that can be embedded anywhere on a page without the full WordPress editor UI.

**Key Benefits:**
- Self-contained editor instance
- Style isolation from page content
- Flexible API for integration
- No dependency on WordPress admin pages

## Technology Stack

### Backend (PHP)

- **Namespace**: `Automattic\Blocks_Everywhere`
- **Minimum PHP**: 7.4+
- **WordPress Minimum**: 5.0+
- **Development Dependencies**: PHPUnit, PHP_CodeSniffer
- **Key Libraries**: Isolated Block Editor

### Frontend (JavaScript/React)

- **TypeScript/TSX**: Full type safety
- **Build Tool**: `@wordpress/scripts` with webpack
- **Styling**: SCSS with modular CSS patterns
- **Components**: React-based block editor components
- **Editor Package**: WordPress Gutenberg packages

## Configuration & Activation

### Configuration Methods

Blocks Everywhere can be enabled via either `wp-config.php` constants or WordPress filters:

```php
// Option 1: wp-config.php constants
define( 'BLOCKS_EVERYWHERE_COMMENTS', true );
define( 'BLOCKS_EVERYWHERE_BBPRESS', true );
define( 'BLOCKS_EVERYWHERE_BUDDYPRESS', true );
define( 'BLOCKS_EVERYWHERE_ADMIN', true );
define( 'BLOCKS_EVERYWHERE_BBPRESS_ADMIN', true );
define( 'BLOCKS_EVERYWHERE_EMAIL', true );
define( 'BLOCKS_EVERYWHERE_THEME_COMPAT', true );

// Option 2: WordPress filters (takes precedence)
add_filter( 'blocks_everywhere_comments', '__return_true' );
add_filter( 'blocks_everywhere_bbpress', '__return_true' );
// ... etc
```

### Permission Model

- **Public Comments**: Available to logged-in users with `edit_posts` capability
- **bbPress Editing**: Topic/reply authors and users with `moderate` capability
- **Admin Moderation**: Restricted to users with `manage_options` capability (configurable via `blocks_everywhere_admin_cap` filter)

## Block Support

### Available Blocks

The plugin allows any block that complies with WordPress KSES (HTML sanitization) settings. Block availability is determined by:

1. WordPress allowed HTML tags (via `wp_kses_post()`)
2. Editor settings filter: `blocks_everywhere_editor_settings`
3. Isolated Block Editor configuration

### Custom Blocks

Custom Gutenberg blocks can be enabled by extending editor settings:

```php
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
    $settings['iso']['blocks']['allowBlocks'][] = 'namespace/custom-block';
    return $settings;
} );
```

## Content Processing

### Block Rendering

When content is displayed, Blocks Everywhere:

1. Detects serialized Gutenberg blocks in content
2. Parses block structure
3. Renders each block with `do_blocks()` filter
4. Applies HTML sanitization via KSES
5. Outputs rendered HTML

### Email Support

With `BLOCKS_EVERYWHERE_EMAIL` enabled, blocks are converted to HTML-safe format for email distribution.

## Theme Integration & Style Isolation

### Style Isolation Strategy

The Isolated Block Editor is placed directly on the page alongside page content. This approach means:

**Benefits:**
- Preview matches final appearance
- Styles from page inform editing context

**Challenges:**
- Page styles may unintentionally affect editor
- Editor styles may affect page rendering

### CSS Management

Blocks Everywhere includes modular CSS files for platform-specific styling:

- `styles/editor.scss` - Editor base styles
- `styles/bbpress.scss` - BBPress-specific styles  
- `styles/comments.scss` - Comments-specific styles
- `styles/buddypress.scss` - BuddyPress-specific styles
- `styles/theme-compat.scss` - Theme compatibility overrides

### Theme Compatibility Mode

Enable with `BLOCKS_EVERYWHERE_THEME_COMPAT` constant or filter. Provides:

- Common theme style overrides
- CSS specificity adjustments
- Known issue workarounds

Better approach: Modify theme to be more specific in selectors rather than relying on compatibility mode.

## Security Model

### Input Sanitization

- All comment/forum content goes through WordPress `wp_kses_post()` or equivalent
- Block attributes validated against allowed values
- User capabilities checked before allowing edits

### Output Escaping

- HTML output escaped with appropriate context
- Block HTML processed through WordPress sanitization
- Database queries use prepared statements

### Capability Checks

- Comments: Requires `edit_posts` capability
- BBPress: Topic/reply authors or users with `moderate` capability  
- Admin: Requires `manage_options` capability (customizable)

## Development & Build System

### Build Process

- **Development**: `yarn start` (watch mode with hot reload)
- **Production**: `yarn build` (minified, optimized)
- **Release**: `yarn release` (clean package for distribution)
- **Testing**: `yarn test:php` and `yarn test:js`

### Asset Bundling

- JavaScript bundles compiled to `build/` directory
- CSS compiled and minified
- Runtime config via global `wpBlocksEverywhere` object

## Known Limitations

### bbPress ("good" status)

- Requires bbPress 2.6+
- Full editor support for topics and replies
- Reply quoting works with blocks

### Comments ("alright" status)

- WordPress native comment depth limitations apply
- Threaded comments work but with editor loading costs
- Nested comment styling may conflict

### BuddyPress ("needs work" status)

- Activity stream integration incomplete
- Private messaging blocks not fully supported
- Groups integration requires additional work
- Recommended for experienced developers only

## Testing & Validation

The plugin includes:

- PHPUnit tests for PHP functionality
- Tests for bbPress content handling
- KSES validation testing
- Manual testing requirements for theme compatibility

## Related Documentation

- [Architecture Details](architecture.md) - Class hierarchy and design patterns
- [Handler System](handlers/) - Platform-specific implementation guides
- [Components Guide](components.md) - React/TypeScript component organization
- [Build & Development](build-and-development.md) - Development workflow
- [Theme Compatibility](theme-compatibility.md) - Integration with themes

---

**See Also**: 
- [Isolated Block Editor](https://github.com/Automattic/isolated-block-editor) - Core dependency
- [WordPress.org Plugin Page](https://wordpress.org/plugins/blocks-everywhere/)
