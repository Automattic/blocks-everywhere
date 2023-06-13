# Blocks Everywhere

<img width="1280" alt="110600033-c625d880-8183-11eb-9609-70ab7390c0d9" src="/resources/banner-1544x500.png">

Switches the default WordPress editor for comments, bbPress, and BuddyPress to use Gutenberg. These can now use a richer set of editing tools, as well as having access to the full power of Gutenberg blocks.

Admin moderation is also upgraded to use Gutenberg, and blocks are processed on the front end.

For extra security the list of available blocks is determined by the allowed tags from WordPress.

Gutenberg is not bundled and instead is side-loaded from WordPress. For better compatibility you should use the plugin version of Gutenberg, which is typically several versions ahead of the one included in WordPress.

The condition of the Gutenberg replacements are:

-   bbPress - good (requires bbPress 2.6+)
-   comments - alright
-   BuddyPress - needs a lot of work

The plugin uses the [Isolated Block Editor](https://github.com/Automattic/isolated-block-editor/). This can also be found in:

-   [Plain Text Editor](https://github.com/Automattic/isolated-block-editor/src/browser/README.md) - standalone JS file that can replace any `textarea` on any page with a full Gutenberg editor
-   [Gutenberg Chrome Extension](https://github.com/Automattic/gutenberg-everywhere-chrome/) - a Chrome extension that allows Gutenberg to be used on any page
-   [Gutenberg Desktop](https://github.com/Automattic/gutenberg-desktop/) - a desktop editor that supports the loading and saving of HTML and Markdown files
-   [P2](https://wordpress.com/p2/) - WordPress as a collaborative workspace (coming soon for self-hosted)

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

To enable Gutenberg when editing bbPress forums, topics, and replies you can use:

`define( 'BLOCKS_EVERYWHERE_BBPRESS_ADMIN', true );`

Or use `blocks_everywhere_bbpress_admin`

### Settings

Some settings are available through the settings object, which is filterable with `blocks_everywhere_editor_settings`.

`allowUrlEmbed` - Enable or disable auto-embed for URLs
`replaceParagraphCode` - Enable the custom paragraph that converts HTML and PHP code into a code block
`pastePlainText` - Convert all pasted content to plain text
`patchEmoji` - set to `true` to stop twemoji from affecting the editor
`iso.allowEmbeds` - List of enabled embeds
`iso.blocks.allowBlocks` - List of enabled blocks
`iso.className` - String of classes to be assigned to the editor.
`iso.__experimentalOnChange` - An optional callback that is triggered when the blocks are changed.
`iso.__experimentalOnInput` - An optional callback that is triggered when text is input.
`iso.__experimentalOnSelection` - An optional callback when a block is selected.

### Theme compatibility

Gutenberg is placed directly on the page along with your post, forum, etc. This means the contents of the editor will look like the page they will appear on. However, it also means that styles from the page may affect the editor.

We don't have a perfect way of separating these styles and it is possible that styles from the page or from Gutenberg may affect the other. If you are using this plugin then it is expected that you will be able to fix any differences as appropriate for your site.

A theme compatibility option is provided which might help. You can use this with:

`define( 'BLOCKS_EVERYWHERE_THEME_COMPAT', true );`

Or using the filter `blocks_everywhere_theme_compat`.

It provides some overrides for common theme issues. However, it is generally better not to require overrides so if you are able to modify your theme and make CSS more specific then that is the best route.

For example, rather than defining a global button style (which would then affect Gutenberg), make the style specific to the areas where a button will be used.

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

## Development

This repository can be used directly with WordPress. For example, in your `wp-content/plugins` directory you can:

`git clone git@github.com:Automattic/blocks-everywhere.git`

You can then activate the plugin as normal and can follow the 'Building' instructions to build the files.

### Sandboxes

If you wish to sync changes with a remote sandbox you add `blocks_everywhere` to your `~/.npmrc` file. The value should point to the remote directory (including host and username). The directory should have a trailing slash.

For example `blocks_everywhere=sandbox:public_html/wp-content/plugins/blocks-everywhere/`.

### Building

The JS and CSS needs to be compiled. You can do this in development mode, which will monitor for updates to the files:

`yarn start`

You can perform the same function but also upload to a remote sandbox (see sandbox configuration above):

`yarn start:sync`

If you want to build production files (minified and without debugging) then:

`yarn build`

And

`yarn build:sync`

### Releasing

A release packages up all the JS, CSS, and PHP files into a clean directory without any development tooling.

`yarn release`

The plugin will be available in the `release` directory.

You can sync to a remote sandbox with (see sandbox configuration above):

`yarn release:sync`

### Distribution

To produce a released and versioned distribution of the plugin run:

`yarn dist`

This will produce a zip file, upload it to Github, and mark it as an official release.

You can sync this to the WordPress.org SVN repo with:

`yarn dist:svn`

You will need appropriate permissions.
