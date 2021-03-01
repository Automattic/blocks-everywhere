# Gutenberg Everywhere

Gutenberg in WordPress comments, admin pages, bbPress, and BuddyPress.

Features:

- list of blocks is determined by the list of allowed tags
- block processing is run before displaying any block content on the front-end
- Gutenberg is used on the admin edit page

Gutenberg is not bundled and instead is side-loaded from WordPress.

## Caveats

- The editor loads on every page where it is used. It may be performant to load it on-click.
- There may be additional CSS needed to fully blend in with the chosen theme.
- This assumes that `wp_kses` and Gutenberg will take care of any security issues for comments. This combination is untested by core.

## Building

Run:

`yarn start`

Or:

`yarn build`

## Releasing

Run:

`yarn release`

The plugin will be available in the `release` directory.
