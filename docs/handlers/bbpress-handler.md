# BBPress Handler - Integration Guide

## Overview

The BBPress handler integrates the Gutenberg block editor into bbPress forums, enabling forum participants to use rich block editing for topics, replies, and forum content.

**Status**: Good (fully supported)
**Minimum bbPress**: 2.6+

## File Location

`classes/handlers/class-bbpress.php`

**Namespace**: `Automattic\Blocks_Everywhere\Handler`
**Class**: `bbPress extends Handler`

## Integration Points

### Frontend (User-Facing)

The handler integrates blocks at these user interaction points:

#### Forum Pages

When a user visits forum pages, the handler:

1. Hooks to `bbp_template_redirect` action
2. Checks if current page is a forum, topic, or reply page
3. Determines if user should see the editor
4. Loads editor JavaScript and configuration if appropriate

#### Topic Creation & Editing

- User clicks "New Topic" button
- Editor loads on the topic form
- User edits with Gutenberg blocks
- Form submission saves serialized blocks to database

#### Reply Creation & Editing

- User replies to existing topic
- Editor loads on reply form
- User edits with blocks
- Form saves reply with block content

### Backend (Admin Screens)

When `BLOCKS_EVERYWHERE_BBPRESS_ADMIN` is enabled:

- Topic edit screen loads block editor
- Reply edit screen loads block editor
- Forum edit screen loads block editor
- Admin can moderate content with full block support

## Content Rendering

When forum content is displayed, the handler processes blocks:

### Filter Chain

```
BBPress output (topic, reply, forum content)
    ↓
Handler intercepts via filter:
├─ bbp_get_forum_content
├─ bbp_get_topic_content
└─ bbp_get_reply_content
    ↓
WordPress autoembed() processing
    ↓
do_blocks() converts block markup to HTML
    ↓
wp_kses_post() sanitizes HTML
    ↓
Rendered HTML displayed on page
```

### Specific Filters

**Forum Content** (`bbp_get_forum_content`):
- Runs when forum description is output
- Allows embeds before block processing
- Sanitizes via KSES

**Topic Content** (`bbp_get_topic_content`):
- Runs when displaying topic content
- First topic in a forum
- Author's initial post

**Reply Content** (`bbp_get_reply_content`):
- Runs for each reply in forum
- All responses to topics
- Most frequently processed filter

## Permissions

### Frontend Permissions

**Who Can Use the Editor**:

- **Topic Authors**: Can edit own topics (if editor enabled)
- **Reply Authors**: Can edit own replies (if editor enabled)
- **Moderators**: Can edit any content
- **Administrators**: Full editing access
- **Regular Users**: Can post new topics/replies if enabled

**How to Check Permission**:

```php
// Topic author
if ( bbp_is_user_topic_author( $user_id, $topic_id ) ) {
    // Can edit
}

// Moderator
if ( bbp_user_can_edit_topic( $user_id, $topic_id ) ) {
    // Can edit
}

// Admin
if ( current_user_can( 'manage_options' ) ) {
    // Can edit anything
}
```

### Admin Permissions

**Admin Screen Access**:

- Requires `manage_options` capability (configurable via `blocks_everywhere_admin_cap` filter)
- Can edit any topic or reply
- Full block support enabled
- Moderation tools available

## Configuration

### Enable BBPress Support

```php
// wp-config.php
define( 'BLOCKS_EVERYWHERE_BBPRESS', true );
define( 'BLOCKS_EVERYWHERE_BBPRESS_ADMIN', true ); // Optional: admin editing
```

Or use filters:

```php
// functions.php or plugin
add_filter( 'blocks_everywhere_bbpress', '__return_true' );
add_filter( 'blocks_everywhere_bbpress_admin', '__return_true' );
```

### Editor Settings

Customize what blocks are available in BBPress:

```php
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
    // Restrict to basic blocks only
    $settings['blocksEverywhere']['blocks']['allowBlocks'] = [
        'core/paragraph',
        'core/heading',
        'core/list',
        'core/image',
        'core/quote',
    ];

    // Disable embeds in forum
    $settings['blocksEverywhere']['allowEmbeds'] = [];

    return $settings;
} );
```

### Admin Capability

Change who can edit via admin screens:

```php
// Only users with 'moderate_comments' can use admin editor
add_filter( 'blocks_everywhere_admin_cap', function() {
    return 'moderate_comments';
} );
```

## Block Support

### Allowed Blocks

BBPress allows any block that complies with WordPress KSES. By default, these blocks work well:

**Recommended Blocks**:

- `core/paragraph` - Text content
- `core/heading` - Topic/reply titles
- `core/list` - Ordered/unordered lists
- `core/quote` - Block quotes
- `core/image` - Media insertion
- `core/audio` - Audio content
- `core/video` - Video content
- `core/embed` - YouTube, Twitter, etc.
- `core/code` - Code snippets
- `core/table` - Data tables

**Blocks with Limitations**:

- `core/media-text` - Works but may affect layout
- `core/columns` - Layout may not work in forum width
- `core/gallery` - Works well for image collections

### Disallowing Blocks

```php
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
    // Remove embeds and galleries from BBPress
    $settings['blocksEverywhere']['blocks']['allowBlocks'] = array_diff(
        $settings['blocksEverywhere']['blocks']['allowBlocks'],
        [ 'core/embed', 'core/gallery' ]
    );

    return $settings;
} );
```

## Storage & Processing

### Database Storage

Forum content is stored as serialized Gutenberg blocks:

```
<!-- wp:paragraph -->
<p>Topic content with blocks</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":123} -->
<figure class="wp-block-image"><img src="..." /></figure>
<!-- /wp:image -->
```

### Block Detection

The handler detects if content has blocks:

```php
if ( has_blocks( $topic_content ) ) {
    // Content contains Gutenberg blocks
    $content = do_blocks( $topic_content );
}
```

### Empty Block Handling

If blocks are present but empty:

1. `do_blocks()` processes them
2. May result in empty HTML
3. Sanitization removes invalid tags
4. Final output may be empty string

## Theme Compatibility Issues

### Common Problems

**Issue 1: Editor styles conflict with theme**
- Solution: Use `BLOCKS_EVERYWHERE_THEME_COMPAT` mode
- Better: Make theme selectors more specific

**Issue 2: Forum layout breaks with blocks**
- Solution: Use responsive block settings
- Better: Design theme to accommodate wide blocks

**Issue 3: Block styling doesn't match forum**
- Solution: Add custom CSS via filter
- Better: Use theme colors in blocks

### Adding Custom CSS

```php
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
    $settings['blocksEverywhere']['className'] = 'bbpress-editor-custom';
    return $settings;
} );
```

Then style in theme:

```css
.bbpress-editor-custom .wp-block-image {
    max-width: 100%;
    height: auto;
}
```

## Email Processing

If `BLOCKS_EVERYWHERE_EMAIL` is enabled:

- Forum notifications include block content
- Blocks converted to plain HTML (email-safe)
- Links preserved
- Images included as references

## Known Limitations

### Current Limitations

1. **Quote Formatting**: Reply quoting may not preserve block structure
2. **Media Management**: Large uploads may slow forum performance
3. **Nested Topics**: Very nested threads have editor loading delays
4. **Theme Styles**: Aggressive forum CSS may override block styles

### Future Improvements

- Optimized media handling for forums
- Better quote support for blocks
- Improved performance for large discussions
- Enhanced style isolation

## Testing Checklist

### Frontend Testing

- [ ] Topic creation with blocks
- [ ] Reply creation with blocks
- [ ] Topic editing preserves blocks
- [ ] Reply editing preserves blocks
- [ ] Block content displays correctly
- [ ] Multiple blocks in single topic
- [ ] Media insertion works
- [ ] Embeds render properly
- [ ] Nested replies show blocks
- [ ] Mobile editor responsiveness

### Admin Testing

- [ ] Topic admin edit screen
- [ ] Reply admin edit screen
- [ ] Bulk editing operations
- [ ] Permissions enforced
- [ ] Capability restrictions work

### Compatibility Testing

- [ ] Different themes (Genesis, Elementor, etc.)
- [ ] bbPress with BuddyPress
- [ ] Forum notifications with blocks
- [ ] Search includes block content
- [ ] Permalinks work correctly

## Integration with Other Plugins

### BuddyPress Integration

When both Blocks Everywhere and BuddyPress are active:

- Private forums inherit block support
- Activity stream separate from forums
- Mentions work in block content

### WooCommerce Integration

E-commerce forums can use blocks for product discussions.

### Custom Plugins

To integrate custom plugins with BBPress blocks:

1. Hook to `blocks_everywhere_editor_settings`
2. Add custom blocks to allowed list
3. Implement custom rendering

## Troubleshooting

### Editor Not Appearing

**Check**:
- Is `blocks_everywhere_bbpress` filter returning true?
- Is bbPress 2.6+ installed?
- Are blocks enabled in theme?

**Solution**:
```php
// Debug: Check if filter is enabled
if ( apply_filters( 'blocks_everywhere_bbpress', true ) ) {
    // Should work
}
```

### Blocks Not Rendering

**Check**:
- Is content being saved as blocks?
- Are KSES rules blocking tags?
- Is `do_blocks()` being called?

**Solution**:
```php
// Check if do_blocks is called
error_log( 'Content: ' . $content );
$rendered = do_blocks( $content );
error_log( 'Rendered: ' . $rendered );
```

### Style Conflicts

**Check**:
- Is theme CSS overriding block styles?
- Are editor styles loaded?
- Is BLOCKS_EVERYWHERE_THEME_COMPAT enabled?

**Solution**:
```php
// Enable compatibility mode
define( 'BLOCKS_EVERYWHERE_THEME_COMPAT', true );

// Or add specific CSS
add_filter( 'wp_enqueue_scripts', function() {
    wp_enqueue_style( 'my-bbpress-compat', get_template_directory_uri() . '/bbpress-compat.css' );
} );
```

## Development Example

### Creating a Custom Scenario

```php
// Enable BBPress support
add_filter( 'blocks_everywhere_bbpress', '__return_true' );

// Customize editor for forum
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
    // Only allow specific blocks
    $settings['blocksEverywhere']['blocks']['allowBlocks'] = [
        'core/paragraph',
        'core/image',
        'core/quote',
    ];

    // Add custom class
    $settings['blocksEverywhere']['className'] = 'my-forum-editor';

    return $settings;
} );

// Add custom CSS
add_action( 'wp_enqueue_scripts', function() {
    wp_enqueue_style( 'my-forum-editor', get_template_directory_uri() . '/forum-editor.css' );
} );
```

---

**See Also**:
- [Architecture Overview](../architecture.md)
- [Handler Base Class](../architecture.md#handler-base-class)
- [Comments Handler](comments-handler.md)
- [BuddyPress Handler](buddypress-handler.md)
