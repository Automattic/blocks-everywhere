# Blocks Everywhere

<img width="1280" alt="110600033-c625d880-8183-11eb-9609-70ab7390c0d9" src="/resources/banner-1544x500.png">

Switches the default WordPress editor for comments, bbPress, and BuddyPress to use Gutenberg. These can now use a richer set of editing tools, as well as having access to the full power of Gutenberg blocks.

Admin moderation is also upgraded to use Gutenberg, and blocks are processed on the front end.

For extra security the list of available blocks is determined by the allowed tags from WordPress.

Gutenberg is not bundled and instead is side-loaded from WordPress. For better compatibility you should use the plugin version of Gutenberg, which is typically several versions ahead of the one included in WordPress.

The condition of the Gutenberg replacements are:
- bbPress - good (requires bbPress 2.6+)
- comments - alright
- BuddyPress - needs a lot of work

The plugin uses the [Isolated Block Editor](https://github.com/Automattic/isolated-block-editor/). This can also be found in:

- [Plain Text Editor](https://github.com/Automattic/isolated-block-editor/src/browser/README.md) - standalone JS file that can replace any `textarea` on any page with a full Gutenberg editor
- [Gutenberg Chrome Extension](https://github.com/Automattic/gutenberg-everywhere-chrome/) - a Chrome extension that allows Gutenberg to be used on any page
- [Gutenberg Desktop](https://github.com/Automattic/gutenberg-desktop/) - a desktop editor that supports the loading and saving of HTML and Markdown files
- [P2](https://wordpress.com/p2/) - WordPress as a collaborative workspace (coming soon for self-hosted)

Blocks Everywhere can be downloaded from WordPress.org:

https://wordpress.org/plugins/blocks-everywhere/

### Caveats

Gutenberg is placed directly on the page along with your post, forum, etc. This means the contents of the editor will look like the page they will appear on. However, it also means that styles from the page may affect the editor.

Currently we don't have a perfect way of seperating these styles and it is possible that styles from the page or from Gutenberg may affect the other. If you are using this plugin then it is expected that you will be able to fix any differences as appropriate for your site.

The loading of Gutenberg will also increase the page size of any page it is loaded on. You should be aware of this and willing to accept this in the context of your site.

### Usage

To enable Blocks Everywhere you need to add the relevant `define` to `wp-config.php`:

```php
define( 'BLOCKS_EVERYWHERE_COMMENTS', true );
define( 'BLOCKS_EVERYWHERE_BBPRESS', true );
define( 'BLOCKS_EVERYWHERE_BUDDYPRESS', true );
```

You can also use the WordPress filter `blocks_everywhere_comments`, `blocks_everywhere_bbpress`, and `blocks_everywhere_buddypress`.

To enable back-end editing in bbPress:

`define( 'BLOCKS_EVERYWHERE_ADMIN', true );`

Or use the filter `blocks_everywhere_admin`. Back-end editing is restricted to users with the `manage_options` capability (can be changed with the `blocks_everywhere_admin_cap` filter).

To enable conversion of blocks in email:

`define( 'BLOCKS_EVERYWHERE_EMAIL', true );`

Or use the filter `blocks_everywhere_email`.

### Using Content Embed block

Content Embed block uses REST API to fetch content to be embedded. This means that site contains bbPress topics to embed should have topic REST API enabled.

Blocks Everywhere enables topic REST API on its own, so if the site with bbPress have this plugin installed and configured, its topics can be embedded.

To enable Content Embed block in the editor, pass these settings to `blocks_everywhere_editor_settings` filter:

```
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
	$settings['iso']['blocks']['allowBlocks'][] = 'blocks-everywhere/support-content';
	return $settings;
} );
```

To enable REST API for forum topics, use next filters:

```
add_filter( 'blocks_everywhere_admin', '__return_true' );
add_filter( 'blocks_everywhere_admin_cap', '__return_empty_string' );
```

REST API is only used when creating content embed and not used to view it. So `blocks_everywhere_admin_cap` can return specific capability to limit users who will have access to API.

### KSES

Gutenberg outputs HTML content and this may be affected by KSES (WordPress HTML sanitisation), as well as other functions.

The plugin provides some modifications to this so it works fine with basic blocks. You may run into problems if you are using different blocks or have customised permission levels.

## Building

Run:

`yarn start`

Or:

`yarn build`

### Releasing

Run:

`yarn release`

The plugin will be available in the `release` directory.

### Distribution

Run:

`yarn dist`
