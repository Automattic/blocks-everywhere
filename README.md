# Gutenberg Everywhere

<img width="1280" alt="110600033-c625d880-8183-11eb-9609-70ab7390c0d9" src="https://user-images.githubusercontent.com/1277682/110774785-15d4d480-8256-11eb-8d21-40f0f2c20b79.png">

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
