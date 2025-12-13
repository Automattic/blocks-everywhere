# Agent Notes (blocks-everywhere)

## Plugin Overview
- Adds Gutenberg editors to WordPress comments, bbPress, BuddyPress, plus moderation/admin screens.
- PHP entry: `blocks-everywhere.php` bootstraps `classes/` and feature handlers in `classes/handlers/`.
- JS entry: `src/index.tsx` + `src/editor/index.tsx` build into `build/`; runtime config via global `wpBlocksEverywhere`.

## Build / Lint / Test
- Install deps: `yarn install` and `composer install`.
- Dev build/watch: `yarn start` (=`wp-scripts start`).
- Production build: `yarn build` (=`wp-scripts build` + `./bin/lintfix.sh`).
- Lint: `yarn lint:js`, `yarn lint:css`, `yarn lint:php` (=`./vendor/bin/phpcs -s`).
- PHP tests: `yarn test:php` (=`./vendor/bin/phpunit`).
- Single PHPUnit file: `./vendor/bin/phpunit "tests/test-bbpress-content.php"`.
- Single PHPUnit test: `./vendor/bin/phpunit --filter "test_name"`.
- Static analysis: `composer run psalm-check`.
- Subpackage: `yarn --cwd isolated-block-editor test` or `yarn --cwd isolated-block-editor e2e`.

## Code Style
- Formatting: Prettier `@wordpress/prettier-config`, `printWidth: 120`, tabs.
- Imports: group WordPress deps → internal/local (see `src/index.tsx`); enforce `@wordpress/dependency-group`; no deep `@wordpress/*/*` imports.
- TS/React: `*.ts(x)`, components `PascalCase`, functions `camelCase`; avoid `any` except WP globals shims.
- PHP: namespace `Automattic\Blocks_Everywhere`; classes `Pascal_Case`, methods `snake_case`; follow WPCS via `phpcs.xml`.
- Errors/safety: validate/sanitize inputs, escape output; prefer `WP_Error` over silent failures.
- Project rules: no inline scripts/styles; no `!important` in CSS (except editor styles).
- Cursor/Copilot rules: none found in `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md`.
