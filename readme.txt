=== Plugin Name ===
Contributors: johnny5, automattic
Tags: gutenberg, comments
Requires at least: 5.5
Tested up to: 5.5.2
Stable tag: trunk
Requires PHP: 5.6
License: GPLv3

Replaces the standard WordPress comment editor with Gutenberg.

== Description ==

Features:

- list of blocks is determined by the list of allowed comment tags
- block processing is run on comments on the front-end
- Gutenberg is used on the comment edit page, if a comment has blocks

This is primarily to demonstrate how to use the `IsolatedBlockEditor` outside of editing WordPress posts, but within the WordPress environment.

Gutenberg is not bundled and instead is side-loaded from WordPress.

== Installation ==

The plugin is simple to install:

1. Download `gutenberg-comments.zip`
1. Unzip
1. Upload `gutenberg-comments` directory to your `/wp-content/plugins` directory
1. Go to the plugin management page and enable the plugin
1. Configure the options from the `Tools/Redirection` page

== Screenshots ==

1. Gutenberg in a comment form
2. Gutenberg when editing a comment

= 1.0 =
* First release
