=== Plugin Name ===
Contributors: johnny5, automattic
Tags: gutenberg, comments, bbpress, buddypress
Requires at least: 5.8
Tested up to: 6.0.2
Stable tag: trunk
Requires PHP: 5.6
License: GPLv3

Puts Gutenberg everywhere it can - bbPress, comments, and BuddyPress.

== Description ==

Switches the default WordPress editor for comments, bbPress, and BuddyPress to use Gutenberg. These can now use a richer set of editing tools, as well as having
access to the full power of Gutenberg blocks.

Admin moderation is also upgraded to use Gutenberg, and blocks are processed on the front end.

For extra security the list of available blocks is determined by the allowed tags from WordPress.

Gutenberg is not bundled and instead is side-loaded from WordPress. For better compatibility you should use the plugin version of Gutenberg, which is typically several versions
ahead of the one included in WordPress.

The condition of the Gutenberg replacements are:
- bbPress - pretty good (requires bbPress 2.6+)
- comments - alright
- BuddyPress - needs a lot of work

Gutenberg Everywhere is developed on Github at https://github.com/Automattic/gutenberg-everywhere

== Caveats ==

Gutenberg is placed directly on the page along with your post, forum, etc. This means the contents of the editor will look like the page they will appear on. However, it also
means that styles from the page may affect the editor.

Currently we don't have a perfect way of seperating these styles and it is possible that styles from the page or from Gutenberg may affect the other. If you are using this plugin
then it is expected that you will be able to fix any differences as appropriate for your site.

The loading of Gutenberg will also increase the page size of any page it is loaded on. You should be aware of this and willing to accept this in the context of your site.

== Usage ==

To enable Gutenberg Everywhere you need to add the relevant `define` to `wp-config.php`:

`define( 'GUTENBERG_EVERYWHERE_COMMENTS', true );`
`define( 'GUTENBERG_EVERYWHERE_BBPRESS', true );`
`define( 'GUTENBERG_EVERYWHERE_BUDDYPRESS', true );`

You can also use the WordPress filter `gutenberg_everywhere_comments`, `gutenberg_everywhere_bbpress`, and `gutenberg_everywhere_buddypress`.

== Installation ==

The plugin is simple to install:

1. Download `gutenberg-everywhere.zip`
1. Unzip
1. Upload `gutenberg-everywhere` directory to your `/wp-content/plugins` directory
1. Go to the plugin management page and enable the plugin

== Screenshots ==

1. Gutenberg in a comment form
2. Gutenberg when editing a comment

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
