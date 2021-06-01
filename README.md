# Gutenberg Everywhere

<img width="1280" alt="110600033-c625d880-8183-11eb-9609-70ab7390c0d9" src="/resources/banner-1544x500.png">

Gutenberg in WordPress comments, admin pages, bbPress, and BuddyPress.

Features:

- list of blocks is determined by the list of allowed tags
- block processing is run before displaying any block content on the front-end
- Gutenberg is used on the admin edit page

Gutenberg is not bundled and instead is side-loaded from WordPress.

Note that this is still experimental, and may require additional work to fit in with your theme of choice.

The plugin uses the [Isolated Block Editor](https://github.com/Automattic/isolated-block-editor/). This can also be found in:

- [Plain Text Editor](https://github.com/Automattic/isolated-block-editor/src/browser/README.md) - standalone JS file that can replace any `textarea` on any page with a full Gutenberg editor
- [Gutenberg Chrome Extension](https://github.com/Automattic/gutenberg-everywhere-chrome/) - a Chrome extension that allows Gutenberg to be used on any page
- [Gutenberg Desktop](https://github.com/Automattic/gutenberg-desktop/) - a desktop editor that supports the loading and saving of HTML and Markdown files
- [P2](https://wordpress.com/p2/) - WordPress as a collaborative workspace (coming soon for self-hosted)

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

## Distribution

Run:

`yarn dist`
