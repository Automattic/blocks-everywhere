=== Plugin Name ===
Contributors: johnny5, automattic
Tags: gutenberg, comments, bbpress, buddypress
Requires at least: 5.8
Tested up to: 6.1
Stable tag: 1.8.0
Requires PHP: 5.6
License: GPLv3

Puts the Gutenberg block editor everywhere it can - bbPress, comments, and BuddyPress.

== Description ==

Switches the default WordPress editor for comments, bbPress, and BuddyPress to use Gutenberg. These can now use a richer set of editing tools, as well as having access to the full power of Gutenberg blocks.

Admin moderation is also upgraded to use Gutenberg, and blocks are processed on the front end.

For extra security the list of available blocks is determined by the allowed tags from WordPress.

Gutenberg is not bundled and instead is side-loaded from WordPress. For better compatibility you should use the plugin version of Gutenberg, which is typically several versions ahead of the one included in WordPress.

The condition of the Gutenberg replacements are:
- bbPress - pretty good (requires bbPress 2.6+)
- comments - alright
- BuddyPress - needs a lot of work

Blocks Everywhere is developed on Github at:

[https://github.com/Automattic/blocks-everywhere](https://github.com/Automattic/blocks-everywhere)

== Caveats ==

Gutenberg is placed directly on the page along with your post, forum, etc. This means the contents of the editor will look like the page they will appear on. However, it also means that styles from the page may affect the editor.

Currently we don't have a perfect way of seperating these styles and it is possible that styles from the page or from Gutenberg may affect the other. If you are using this plugin then it is expected that you will be able to fix any differences as appropriate for your site.

The loading of Gutenberg will also increase the page size of any page it is loaded on. You should be aware of this and willing to accept this in the context of your site.

== Usage ==

To enable Blocks Everywhere you need to add the relevant `define` to `wp-config.php`:

`define( 'BLOCKS_EVERYWHERE_COMMENTS', true );`
`define( 'BLOCKS_EVERYWHERE_BBPRESS', true );`
`define( 'BLOCKS_EVERYWHERE_BUDDYPRESS', true );`

You can also use the WordPress filter `blocks_everywhere_comments`, `blocks_everywhere_bbpress`, and `blocks_everywhere_buddypress`.


== Problems ==

Gutenberg outputs HTML content and this may be affected by KSES (WordPress HTML sanitisation). The default sanitisation should work fine with the default blocks, however you may run into problems if you are using different blocks or have customised permission levels.

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

= 1.9.0 =
* Increase minimum editor size
* Prevent editor buttons accidentally triggering a page submit
* Add filter to enable back-end editing
* Fix inline code in bbPress replies

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
