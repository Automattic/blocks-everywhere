# Blocks Everywhere - Architecture

## Class Hierarchy

Blocks Everywhere uses an object-oriented architecture with inheritance-based handler system:

```
Automattic\Blocks_Everywhere\
├── Editor                        (Asset & configuration management)
├── Handler                       (Base handler class)
│   └── Handler\*                (Platform-specific handlers)
│       ├── bbPress              (extends Handler)
│       ├── Comments             (extends Handler)
│       └── BuddyPress           (extends Handler)
```

## Core Classes

### Editor Class

**File**: `classes/class-editor.php`  
**Namespace**: `Automattic\Blocks_Everywhere`

Manages the loading and configuration of Gutenberg editor assets across all platforms.

#### Responsibilities

- Load editor JavaScript and CSS assets
- Configure editor settings via `block_editor_settings_all` filter
- Initialize media upload capabilities
- Apply theme compatibility styles
- Set up editor environment (screen context, script dependencies)

#### Key Methods

- `__construct()` - Hooks into WordPress for asset loading
- `setup_media()` - Enables media uploads in editor
- `block_editor_settings_all( $settings )` - Modifies editor configuration
- `wp_theme_json_data_theme( $json )` - Provides theme.json configuration

#### Editor Settings Configuration

The Editor class provides:

1. **Block Filtering**: Determines which blocks are available based on KSES rules
2. **Allow Embeds**: Configures embed support
3. **Asset Management**: Script and style loading based on context
4. **Media Support**: File upload permissions and restrictions

### Handler Base Class

**File**: `classes/class-handler.php`  
**Namespace**: `Automattic\Blocks_Everywhere`

Abstract base class defining the interface and shared functionality for all platform handlers.

#### Responsibilities

- Provide common block processing (`do_blocks()` functionality)
- Manage content parsing and rendering
- Handle HTML sanitization via KSES
- Define handler interface for subclasses
- Manage editor initialization and configuration

#### Key Methods

- `enable_editor()` - Registers hooks to load editor on current page
- `do_blocks( $content, $context )` - Process blocks in content
- `should_load_editor()` - Determine if editor should load on page
- `render_blocks( $content )` - Render block markup
- `get_editor_settings()` - Return editor configuration

#### Block Processing Flow

```
Content with serialized blocks
    ↓
parse_blocks() - Parse block structure
    ↓
render_block() - Render each block
    ↓
wp_kses_post() - Sanitize HTML
    ↓
Return rendered content
```

### bbPress Handler

**File**: `classes/handlers/class-bbpress.php`  
**Namespace**: `Automattic\Blocks_Everywhere\Handler`  
**Class**: `bbPress extends Handler`

Integrates Gutenberg editor into bbPress forum interface.

#### Responsibilities

- Detect and handle forum/topic/reply pages
- Enable editor on topic/reply creation and editing screens
- Process blocks in forum content display
- Manage bbPress-specific permissions
- Handle bbPress admin editing with full block support

#### Integration Points

**Frontend (Forums)**:
- Hooked to `bbp_template_redirect` action
- Checks if current page is topic/reply/forum
- Loads editor interface if appropriate

**Backend (Admin)**:
- Hooked to `bbp_ready` action
- Enables editor on topic/reply/forum edit screens
- Restricts editing based on capabilities

#### Content Rendering

Filters applied to bbPress output:

- `bbp_get_forum_content` - Process forum content blocks
- `bbp_get_topic_content` - Process topic content blocks  
- `bbp_get_reply_content` - Process reply content blocks

All filters:
1. Run WordPress autoembed functionality
2. Process and render blocks
3. Return sanitized HTML

#### Permission Model

- **Topic/Reply Authors**: Can edit own content
- **Moderators**: Can edit any content
- **Administrators**: Full editing access
- **Regular Users**: Can reply to topics (blocks available if enabled)

#### Configuration

Enable with filters:
- `blocks_everywhere_bbpress` - Enable on forum frontend
- `blocks_everywhere_bbpress_admin` - Enable in forum admin
- `blocks_everywhere_admin_cap` - Required capability for admin editing

#### Key Methods

- `bbp_template_redirect()` - Handle forum page initialization
- `get_current_topic_id()` - Retrieve current topic ID
- `get_current_forum_id()` - Retrieve current forum ID
- `enable_topic_edit_screen()` - Setup topic editing interface
- `save_topic( $topic_id )` - Handle topic save with blocks

### Comments Handler

**File**: `classes/handlers/class-comments.php`  
**Namespace**: `Automattic\Blocks_Everywhere\Handler`  
**Class**: `Comments extends Handler`

Integrates Gutenberg editor into WordPress comment forms.

#### Responsibilities

- Enable editor on comment submission forms
- Process blocks in comment content
- Handle comment HTML sanitization
- Manage comment author permissions
- Support nested comments with blocks

#### Integration Points

**Frontend (Comment Forms)**:
- Hooked to `comment_form_default_fields` or form template
- Adds editor interface to comment textarea
- Manages form submission

**Content Display**:
- Filter: `comment_text` - Process blocks in comment output
- Handles nested comment rendering

#### Permission Model

- **Logged-in Users**: Can use blocks if enabled
- **Comment Author**: Can edit own comment (if supported)
- **Moderators**: Can edit via admin screen
- **Administrators**: Full editing access

#### Configuration

Enable with filters:
- `blocks_everywhere_comments` - Enable on comment form
- `blocks_everywhere_admin` - Enable in admin moderation

#### Key Methods

- `enable_editor_on_form()` - Hook editor into comment form
- `sanitize_comment_content( $content )` - Process comment blocks
- `validate_comment_blocks( $content )` - Check for disallowed blocks
- `render_comment_with_blocks( $content )` - Output comment HTML

#### Caveats

- Comment depth limitations (WordPress native)
- Nested comment threading affects editor display
- Some themes have aggressive comment form styling

### BuddyPress Handler

**File**: `classes/handlers/class-buddypress.php`  
**Namespace**: `Automattic\Blocks_Everywhere\Handler`  
**Class**: `BuddyPress extends Handler`

Integrates Gutenberg editor into BuddyPress activity stream and messaging.

#### Responsibilities

- Enable editor in activity stream posts
- Support block editing in direct messages
- Process blocks in activity content
- Manage BuddyPress-specific permissions

#### Integration Points

**Frontend (Activity)**:
- BuddyPress activity form integration
- Activity comment editing

**Backend (Admin)**:
- Activity moderation screens
- User activity management

#### Current Status: "Needs Work"

This implementation is functional but has known limitations:

**Implemented Features**:
- Basic activity stream editor integration
- Block rendering in activity content

**Missing Features**:
- Private messaging block support
- Groups activity full integration
- Activity mentions with blocks
- Media in activity streams

#### Permission Model

- **Activity Authors**: Can edit own activity
- **Group Members**: Can post in group activity (if enabled)
- **Administrators**: Full editing access

#### Configuration

Enable with filters:
- `blocks_everywhere_buddypress` - Enable on activity stream
- `blocks_everywhere_admin` - Enable in admin moderation

#### Key Methods

- `enable_activity_editor()` - Hook editor into activity form
- `process_activity_blocks( $content )` - Render activity blocks
- `save_activity_with_blocks( $activity_id )` - Save activity content

## Plugin Bootstrap

**File**: `blocks-everywhere.php`

The main plugin file orchestrates loading:

```php
// 1. Define constants and paths
define( 'BLOCKS_EVERYWHERE_DIR', plugin_dir_path( __FILE__ ) );
define( 'BLOCKS_EVERYWHERE_URL', plugin_dir_url( __FILE__ ) );

// 2. Load classes
require_once BLOCKS_EVERYWHERE_DIR . 'classes/class-editor.php';
require_once BLOCKS_EVERYWHERE_DIR . 'classes/class-handler.php';
require_once BLOCKS_EVERYWHERE_DIR . 'classes/handlers/class-bbpress.php';
require_once BLOCKS_EVERYWHERE_DIR . 'classes/handlers/class-comments.php';
require_once BLOCKS_EVERYWHERE_DIR . 'classes/handlers/class-buddypress.php';

// 3. Initialize
new Editor();

if ( apply_filters( 'blocks_everywhere_comments', BLOCKS_EVERYWHERE_COMMENTS ) ) {
    new Handler\Comments();
}

if ( apply_filters( 'blocks_everywhere_bbpress', BLOCKS_EVERYWHERE_BBPRESS ) ) {
    new Handler\bbPress();
}

if ( apply_filters( 'blocks_everywhere_buddypress', BLOCKS_EVERYWHERE_BUDDYPRESS ) ) {
    new Handler\BuddyPress();
}
```

## Hook System

### WordPress Hooks Used

**Filters** (input/output transformation):
- `block_editor_settings_all` - Customize editor settings
- `blocks_everywhere_editor_settings` - Platform-specific editor config
- `blocks_everywhere_comments` - Enable/disable comments feature
- `blocks_everywhere_bbpress` - Enable/disable bbPress feature
- `blocks_everywhere_buddypress` - Enable/disable BuddyPress feature
- `blocks_everywhere_admin` - Enable/disable admin editing
- `blocks_everywhere_admin_cap` - Required capability for admin
- `blocks_everywhere_theme_compat` - Enable theme compatibility mode
- `should_load_block_editor_scripts_and_styles` - Force editor scripts
- `wp_theme_json_data_theme` - Provide theme.json configuration

**Actions** (one-way events):
- `template_redirect` - Editor initialization on frontend
- `bbp_template_redirect` - BBPress page setup
- `bbp_ready` - BBPress initialization
- `admin_enqueue_scripts` - Asset loading in admin

### Custom Hooks Provided

Blocks Everywhere provides these extension points:

- `blocks_everywhere_editor_settings` - Plugins can modify editor config
- `blocks_everywhere_allowed_blocks` - Override allowed blocks list
- `blocks_everywhere_render_block_*` - Custom block rendering

## Asset Loading Strategy

### JavaScript Bundles

Compiled from TypeScript/React source files to webpack bundles:

- `build/blocks-everywhere.js` - Main plugin editor
- `build/blocks-everywhere.css` - Plugin editor styles
- `build/blocks-everywhere-view.js` - Frontend block rendering

### CSS Architecture

Modular SCSS structure with platform-specific styling:

```scss
// Base editor styles
styles/editor.scss
  ├── Container layout
  ├── Block styling
  └── Interactive elements

// Platform-specific overrides
styles/bbpress.scss      (Forum styling)
styles/comments.scss     (Comment styling)  
styles/buddypress.scss   (Activity styling)
styles/theme-compat.scss (Theme fixes)
```

### Conditional Loading

Assets loaded based on context:

```php
if ( should_load_block_editor_scripts_and_styles() ) {
    wp_enqueue_script( 'blocks-everywhere' );
    wp_enqueue_style( 'blocks-everywhere' );
    
    if ( is_bbpress() ) {
        wp_enqueue_style( 'blocks-everywhere-bbpress' );
    }
}
```

## Data Flow: Creating Content

```
1. User opens editor (comment form, forum topic, activity)
   ↓
2. Isolated Block Editor initialized via JavaScript
   ↓
3. Editor configuration applied (allowed blocks, settings)
   ↓
4. User edits content with blocks
   ↓
5. Form submitted with serialized blocks
   ↓
6. PHP handler receives content
   ↓
7. Blocks validated/sanitized
   ↓
8. Content saved to database
   ↓
9. Content displayed with do_blocks() processing
```

## Data Flow: Displaying Content

```
1. Content retrieved from database (comment, forum post, activity)
   ↓
2. Handler filter intercepts output (bbp_get_topic_content, etc.)
   ↓
3. do_blocks() processes serialized blocks
   ↓
4. render_block() converts each block to HTML
   ↓
5. wp_kses_post() sanitizes HTML
   ↓
6. Output displayed on page
```

## Extensibility Patterns

### Adding Block Support to New Platforms

1. Create handler class extending `Handler`
2. Implement `enable_editor()` and `should_load_editor()`
3. Hook into platform-specific actions/filters
4. Process content through `do_blocks()`
5. Register in main plugin file

### Customizing Editor Settings

```php
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
    // Add custom blocks
    $settings['blocksEverywhere']['blocks']['allowBlocks'][] = 'custom/block';
    
    // Modify allowed embeds
    $settings['blocksEverywhere']['allowEmbeds'] = [ 'youtube', 'twitter' ];
    
    // Custom CSS classes
    $settings['blocksEverywhere']['className'] = 'my-custom-editor-class';
    
    return $settings;
} );
```

### Restricting Block Usage

```php
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
    // Only allow basic blocks
    $settings['blocksEverywhere']['blocks']['allowBlocks'] = [
        'core/paragraph',
        'core/heading',
        'core/list',
    ];
    
    return $settings;
} );
```

## Testing Architecture

### PHPUnit Tests

Located in `tests/` directory:

- `test-bbpress-content.php` - BBPress handler tests
- Focus on block rendering and content processing
- Uses WordPress test framework

### Manual Testing Requirements

1. **Theme Compatibility**: Test on various themes
2. **Block Interactions**: Verify block functionality in each platform
3. **Permission Scenarios**: Test with different user roles
4. **Content Scenarios**: Test with various block combinations

---

**Related Documentation**:
- [Handler Details](handlers/) - Platform-specific implementations
- [Components Guide](components.md) - React/TypeScript components
