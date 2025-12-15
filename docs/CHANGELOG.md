# Changelog

All notable changes to Blocks Everywhere are documented in this file.

## [1.25.0] - 2025-12-14

### Added
- Comprehensive documentation suite in `/docs/` directory
- Mentions autocompleter for user @mentions in bbPress topics
- Production build script (`build.sh`) for optimized distributions
- WordPress interface compatibility shim for better integration

### Changed
- Enhanced bbPress media upload API with custom endpoint integration
- Improved iframe editor asset loading and theme compatibility
- Simplified PHP code style by removing unnecessary fully-qualified function call prefixes
- Refactored asset registration and enqueueing for better control
- Enhanced webpack configuration and build process

### Fixed
- Iframe editor styles for responsive embeds now load correctly
- Block category retrieval uses modern `WP_Block_Editor_Context`
- Responsive embed rendering issues in iframe editors
- CSS specificity conflicts in theme compatibility mode

## [1.24.0] - 2025-12-13

### Added
- WordPress 6.9 and PHP 8.4 compatibility
- Comprehensive dark mode and theme variable support for editor UI components
- Custom media upload API integration for bbPress via `extrachill/v1/media` endpoint
- Automatic attachment reparenting for new bbPress topics with pending content embeds
- Iframe theme fixes with MutationObserver to strip problematic inline Gutenberg styles
- Block type pruning to remove disallowed blocks after registration
- WordPress component CSS variable mapping to theme variables (`--wp-components-color-*`)

### Changed
- Updated to forked `@chubes4/isolated-block-editor` dependency
- Refactored script loading with separate `blocks-everywhere-settings` inline script for reliable config delivery
- Split asset registration from enqueueing for better control
- Footer script group pre-population ensures correct loading order
- PHP code style now uses fully-qualified function calls

### Fixed
- Iframe editor styles for responsive embeds now load correctly
- Block category retrieval uses `WP_Block_Editor_Context` instead of deprecated `$post` parameter
- `WP_Theme_JSON_Data` fallback for non-Gutenberg plugin installs
- Safety check for `unstable__bootstrapServerSideBlockDefinitions` function existence
- Native `_wp_get_iframed_editor_assets()` used when available

## [1.23.0] - 2024-03-21

- Update for Gutenberg 17.9
- Toolbars now merged into a single toolbar

## [1.22.0]

- Update for Gutenberg 16.9
- Now only works with this specific version

## [1.21.0]

- Disable block renaming
- Update for latest Gutenberg (16.7.1+)

## [1.20.1]

- Fix toolbar not being full width in 16.2.1

## [1.20.0]

- Now compatible with Gutenberg 16

## [1.19.0]

- Fix link apply button having wrong style
- Fix disabled upload permissions from not working
- Fix React 17/18 warning

## [1.18.0]

- Compatibility with Gutenberg 15.5.0+
- Add PHP access method for improved integration
- Fix KSES for comments
- Fix hiding of the comment textarea

## [1.17.1]

- Revert fix for block inspector tabs in 1.15.0 (Gutenberg changed again)

## [1.17.0]

- Updates to content support block
- Make the user autocompleter optional (enabled by default)

## [1.16.1]

- Fix custom editor settings being reset
- Fix editor inline code style not appearing outside of paragraphs

## [1.16.0]

- Add wp-exclude-emoji to the editor
- Content embed block view assets loaded for everyone (when enabled)

## [1.15.0]

- Support Gutenberg 15.1.0

## [1.14.3]

- Improve PHP 8.1 compatibility
- Add experimental `patchEmoji` option to stop twemoji affecting the editor

## [1.14.2]

- Fix problem with site header offset on compat sites
- Fix problem with some emojis adding a trailing img tag

## [1.14.1]

- Fix problem with block styles being loaded
- Fix z-index issue with popovers
- Improve link editor style
- Show links in notification email

## [1.14.0]

- Add search to content embed block
- Improve Gutenberg support

## [1.13.4]

- Fix block supports modifications incorrectly applied
- Fix HTML in code block

## [1.13.3]

- Fix plain content in bbPress notification emails
- Fix list block KSES filter

## [1.13.2]

- Fix empty bbPress content

## [1.13.1]

- Add class to image KSES
- Minor tweaks for theme compat

## [1.13.0]

- Improve the `replaceParagraphCode` function to better detect code
- Improve bbPress KSES handling
- Fix error when drag/dropping or pasting an image and upload has been disabled
- Fix problem with invalid list blocks
- Fix email notifications

## [1.12.0]

- Add option to auto-detect HTML and PHP code paste
- Fix pasting of shortcodes
- Fix inline code on reply page
- Fix content embed block styles
- Improve name shown in bbPress autocompleter

## [1.11.0]

- Allow editor to be enabled/disabled on bbPress forum or user
- Fix is-pressed style in editor
- Dont load editor if not logged in
- Handle no upload permissions better in image block
- Improve appearance of patterns in block inserter
- Hide upload button
- Add option to disable auto-embed of URLs, defaulting to off
- Improve paste handling
- Include user autocompleter for bbPress, restricted to people in the topic

## [1.10.0]

- Process blocks in bbPress notification emails
- Add a Content Embed block to allow embedding of forum posts and support pages
- Provide basic bbPress KSES filtering so blocks can be added by lower capability users
- Add a theme compatibility CSS file, to help with some themes

## [1.9.0]

- Increase minimum editor size
- Prevent editor buttons accidentally triggering a page submit
- Add filter to enable back-end editing
- Fix inline code in bbPress replies
- Fix minor size difference in bbPress lists

## [1.8.0]

- Use .min in JS filename so it matches WP recommendations
- Add a check for queuing media, for sites that need to do custom setups

## [1.7.0]

- Improve list block appearance
- Split out CSS files so it's easier to identify what is applied
- Remove some unnecessary bbPress CSS
- Fix image block causing crash
- Namespace code

## [1.6.1]

- Don't load admin form reset on front end pages

## [1.6.0]

- Rename to Blocks Everywhere

## [1.5.0]

- Further tweak the loading so handlers are not enabled by default
- Improve placeholders in bbPress
- Allow media upload to work, if enabled

## [1.4.1]

- Improve loading of handlers so plugins have more chance to override them

## [1.4.0]

- Further bbPress improvements
- Conditionally load the handlers depending on what is installed

## [1.3.0]

- Improve bbPress compatibility

## [1.2.1]

- Fix bbPress error 'your reply cannot be empty'

## [1.2.0]

- Support Gutenberg 11.1.0

## [1.1.0]

- Support Gutenberg 10.6.0

## [1.0.0]

- First release
