=== Blocks Everywhere ===
Contributors: johnny5, automattic
Tags: gutenberg, comments, bbpress, buddypress
Requires at least: 6.2
Tested up to: 6.2.2
Stable tag: 1.21.0
Requires PHP: 5.6
License: GPLv3

Puts the Gutenberg block editor everywhere it can - bbPress, comments, and BuddyPress.

== Description ==

Switches the default WordPress editor for comments, bbPress, and BuddyPress to use Gutenberg. These can now use a richer set of editing tools, as well as having access to the full power of Gutenberg blocks.

Admin moderation is also upgraded to use Gutenberg, and blocks are processed on the front end.

For extra security the list of available blocks is determined by the allowed tags from WordPress.

Gutenberg is not bundled and instead is side-loaded from WordPress. For better compatibility you should use the plugin version of Gutenberg, which is typically several versions ahead of the one included in WordPress.

The condition of the Gutenberg replacements are:
- bbPress - good (requires bbPress 2.6+)
- comments - alright
- BuddyPress - needs a lot of work

In addition, this plugin adds a new block type "Content Embed" for the Gutenberg editor, which allows you to embed a forum topic from any bbPress site or WordPress.com Support page.

Blocks Everywhere is developed on Github at:

[https://github.com/Automattic/blocks-everywhere](https://github.com/Automattic/blocks-everywhere)

== Caveats ==

The loading of Gutenberg will also increase the page size of any page it is loaded on. You should be aware of this and willing to accept this in the context of your site.

This doesn't yet work on block-based themes - it must be a 'classic' theme.

You should use the latest version of the Gutenberg plugin.

== Usage ==

To enable Blocks Everywhere you need to add the relevant `define` to `wp-config.php`:

`define( 'BLOCKS_EVERYWHERE_COMMENTS', true );`
`define( 'BLOCKS_EVERYWHERE_BBPRESS', true );`
`define( 'BLOCKS_EVERYWHERE_BUDDYPRESS', true );`

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

== Settings ==

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

== Theme compatibility ==

Gutenberg is placed directly on the page along with your post, forum, etc. This means the contents of the editor will look like the page they will appear on. However, it also means that styles from the page may affect the editor.

We don't have a perfect way of separating these styles and it is possible that styles from the page or from Gutenberg may affect the other. If you are using this plugin then it is expected that you will be able to fix any differences as appropriate for your site.

A theme compatibility option is provided which might help. You can use this with:

`define( 'BLOCKS_EVERYWHERE_THEME_COMPAT', true );`

Or using the filter `blocks_everywhere_theme_compat`.

It provides some overrides for common theme issues. However, it is generally better not to require overrides so if you are able to modify your theme and make CSS more specific then that is the best route.

For example, rather than defining a global button style (which would then affect Gutenberg), make the style specific to the areas where a button will be used.

== Using Content Embed block ==

Content Embed block uses REST API to fetch content to be embedded. This means that site contains bbPress topics to embed should have topic REST API enabled.

Blocks Everywhere enables topic REST API on its own, so if the site with bbPress have this plugin installed and configured, its topics can be embedded.

To enable Content Embed block in the editor, pass these settings to `blocks_everywhere_editor_settings` filter:

`
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
	$settings['iso']['blocks']['allowBlocks'][] = 'blocks-everywhere/support-content';
	return $settings;
} );
`

To enable REST API for forum topics, use next filters:

`
add_filter( 'blocks_everywhere_admin', '__return_true' );
add_filter( 'blocks_everywhere_admin_cap', '__return_empty_string' );
`

REST API is only used when creating content embed and not used to view it. So `blocks_everywhere_admin_cap` can return specific capability to limit users who will have access to API.

In order for Content Embed block from Blocks Everywhere to load post authors, it is required to enable author data in the topic REST API. To do it, use this filter

`
add_action( 'bbp_get_topic_post_type_supports', function( $supports ) {
	$supports[] = 'author';
	return $supports;
} );
`

== KSES ==

Gutenberg outputs HTML content and this may be affected by KSES (WordPress HTML sanitisation) and other sanitisation.

The plugin provides some modifications to this so it works fine with basic blocks. You may run into problems if you are using different blocks or have customised permission levels.

== Installation ==

The plugin is simple to install:

1. Download `blocks-everywhere.zip`
1. Unzip
1. Upload `blocks-everywhere` directory to your `/wp-content/plugins` directory
1. Go to the plugin management page and enable the plugin

== Screenshots ==

1. Gutenberg in a comment form
2. Gutenberg when editing a comment

== Changelog ==

= 1.21.0 =
* Disable block renaming
* Update for latest Gutenberg (16.7.1+)

= 1.20.1 =
* Fix toolbar not being full width in 16.2.1

= 1.20.0 =
* Now compatible with Gutenberg 16

= 1.19.0 =
* Fix link apply button having wrong style
* Fix disabled upload permissions from not working
* Fix React 17/18 warning

= 1.18.0 =
* Compatibility with Gutenberg 15.5.0+
* Add PHP access method for improved integration
* Fix KSES for comments
* Fix hiding of the comment textarea

= 1.17.1 =
* Revert fix for block inspector tabs in 1.15.0. Gutenberg has changed again.

= 1.17.0 =
* Updates to content support block
* Make the user autocompleter optional (enabled by default)

= 1.16.1 =
* Fix custom editor settings being reset
* Fix editor inline code style not appearing outside of paragraphs

= 1.16.0 =
* Add wp-exclude-emoji to the editor
* Content embed block view assets loaded for everyone (when enabled)

= 1.15.0 =
* Support Gutenberg 15.1.0

= 1.14.3 =
* Improve PHP 8.1 compatibility
* Add experimental `patchEmoji` option to stop twemoji affecting the editor

= 1.14.2 =
* Fix problem with site header offset on compat sites
* Fix problem with some emojis adding a trailing img tag

= 1.14.1 =
* Fix problem with block styles being loaded
* Fix z-index issue with popovers
* Improve link editor style
* Show links in notification email

= 1.14.0 =
* Add search to content embed block
* Improve Gutenberg support

= 1.13.4 =
* Fix block supports modifications incorrectly applied
* Fix HTML in code block

= 1.13.3 =
* Fix plain content in bbPress notification emails
* Fix list block KSES filter

= 1.13.2 =
* Fix empty bbPress content

= 1.13.1 =
* Add class to image KSES
* Minor tweaks for theme compat

= 1.13.0 =
* Improve the `replaceParagraphCode` function to better detect code
* Improve bbPress KSES handling
* Fix error when drag/dropping or pasting an image and upload has been disabled
* Fix problem with invalid list blocks
* Fix email notifications

= 1.12.0 =
* Add option to auto-detect HTML and PHP code paste
* Fix pasting of shortcodes
* Fix inline code on reply page
* Fix content embed block styles
* Improve name shown in bbPress autocompleter

= 1.11.0 =
* Allow editor to be enabled/disabled on bbPress forum or user
* Fix is-pressed style in editor
* Dont load editor if not logged in
* Handle no upload permissions better in image block
* Improve appearance of patterns in block inserter
* Hide upload button
* Add option to disable auto-embed of URLs, defaulting to off
* Improve paste handling
* Include user autocompleter for bbPress, restricted to people in the topic

= 1.10.0 =
* Process blocks in bbPress notification emails
* Add a Content Embed block to allow embedding of forum posts and support pages
* Provide basic bbPress KSES filtering so blocks can be added by lower capability users
* Add a theme compatibility CSS file, to help with some themes

= 1.9.0 =
* Increase minimum editor size
* Prevent editor buttons accidentally triggering a page submit
* Add filter to enable back-end editing
* Fix inline code in bbPress replies
* Fix minor size difference in bbPress lists

= 1.8.0 =
* Use .min in JS filename so it matches WP recommendations
* Add a check for queuing media, for sites that need to do custom setups.

= 1.7.0 =
* Improve list block appearance
* Split out CSS files so it's easier to identify what is applied
* Remove some unnecessary bbPress CSS
* Fix image block causing crash
* Namespace code

= 1.6.1 =
* Don't load admin form reset on front end pages

= 1.6.0 =
* Rename to Blocks Everywhere

= 1.5.0 =
* Further tweak the loading so handlers are not enabled by default
* Improve placeholders in bbPress
* Allow media upload to work, if enabled

= 1.4.1 =
* Improve loading of handlers so plugins have more chance to override them

= 1.4.0 =
* Further bbPress improvements
* Conditionally load the handlers depending on what is installed

= 1.3.0 =
* Improve bbPress compatibility

= 1.2.1 =
* Fix bbPress error 'your reply cannot be empty'

= 1.2.0 =
* Support Gutenberg 11.1.0

= 1.1.0 =
* Support Gutenberg 10.6.0

= 1.0 =
* First release
