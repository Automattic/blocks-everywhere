# Build & Development Guide

## Setting Up Development Environment

### Prerequisites

- **Node.js**: 16.x or higher
- **npm/yarn**: Latest version
- **Composer**: For PHP dependency management
- **PHP**: 7.4+
- **WordPress**: 5.0+ with Gutenberg

### Initial Setup

```bash
# Clone or navigate to plugin directory
cd /path/to/blocks-everywhere

# Install dependencies
yarn install
composer install

# Verify installation
yarn --version          # Should be 1.22+
npm --version           # Should be 8.x+
php --version           # Should be 7.4+
composer --version      # Should be 2.x+
```

## Development Workflow

### Watch Mode (Recommended)

```bash
yarn start
```

**What it does**:
1. Watches `src/` for changes
2. Rebuilds TypeScript/JSX to JavaScript
3. Compiles SCSS to CSS
4. Hot-reloads browser (with BrowserSync)
5. Generates source maps for debugging

**Output**:
- `build/blocks-everywhere.js`
- `build/blocks-everywhere.css`
- `build/blocks-everywhere-view.js`

### Production Build

```bash
yarn build
```

**What it does**:
1. Compiles TypeScript/JSX
2. Minifies JavaScript (removes comments, whitespace)
3. Optimizes CSS (removes duplicates, unused rules)
4. Generates production source maps
5. Validates no warnings/errors

**Output**: Optimized files in `build/`

### Development Configuration

**Hot Reload Setup** (if not automatic):

1. Ensure WordPress `WP_ENVIRONMENT_TYPE` is set to `development`
2. BrowserSync configured in webpack config
3. Update site URL if needed

```bash
# Enable debug mode
SCRIPT_DEBUG=true yarn start
```

## Testing

### PHP Unit Tests

```bash
# Run all tests
yarn test:php
# or
composer test

# Run specific test file
./vendor/bin/phpunit tests/test-bbpress-content.php

# Run specific test
./vendor/bin/phpunit --filter test_bbpress_editor_loads

# Run with coverage
./vendor/bin/phpunit --coverage-html coverage/
```

### JavaScript/Jest Tests

```bash
# Run all tests
yarn test:js

# Watch mode
yarn test:js --watch

# Coverage report
yarn test:js --coverage
```

### Manual Testing Checklist

**Frontend - Comments**:
- [ ] Load post with comments
- [ ] New comment form displays block editor
- [ ] Can type and format text
- [ ] Can insert media
- [ ] Can use blocks
- [ ] Submit saves blocks correctly

**Frontend - BBPress**:
- [ ] Load forum page
- [ ] New topic form has block editor
- [ ] New reply form has block editor
- [ ] Can create topic with blocks
- [ ] Can reply with blocks
- [ ] Topic displays blocks correctly
- [ ] Reply displays blocks correctly

**Admin - Moderation**:
- [ ] Topic edit screen loads editor
- [ ] Reply edit screen loads editor
- [ ] Can edit topic content
- [ ] Can edit reply content
- [ ] Permissions enforced correctly

**Theme Compatibility**:
- [ ] Test on multiple themes
- [ ] Check editor styling
- [ ] Verify output styling
- [ ] Check for CSS conflicts

## Code Quality

### Linting

**JavaScript (ESLint)**:
```bash
yarn lint:js              # Check for errors
yarn lint:js --fix        # Auto-fix issues
```

**CSS (stylelint)**:
```bash
yarn lint:css             # Check for errors
yarn lint:css --fix       # Auto-fix issues
```

**PHP (PHP_CodeSniffer)**:
```bash
yarn lint:php             # Check against WordPress standards
composer run phpcs:fix    # Auto-fix PHP issues
```

### Type Checking

```bash
composer run psalm-check  # Full static analysis
```

### Pre-Commit Checks

Run before committing:
```bash
yarn lint:js && yarn lint:css && yarn test:php
```

## Debugging

### Browser DevTools

**Chrome DevTools**:
1. Open DevTools (F12)
2. Go to Sources tab
3. Locate your `.js` files in webpack:// section
4. Set breakpoints in source files
5. Check console for errors

**React DevTools**:
1. Install React DevTools extension
2. Open DevTools
3. Go to React tab
4. Inspect component tree
5. View/edit props and state

### Server-Side Debugging

**PHP Debugging with Xdebug**:

1. Install Xdebug in PHP
2. Configure PhpStorm or VS Code with Xdebug
3. Set breakpoints in PHP files
4. Trigger WordPress to hit breakpoint

**Basic Logging**:
```php
// In PHP code
error_log( 'Debug: ' . print_r( $data, true ) );

// In JavaScript
console.log( 'Debug:', data );
```

### WordPress Debug Mode

Enable in `wp-config.php`:
```php
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
define( 'WP_DEBUG_DISPLAY', false );

// Logs go to wp-content/debug.log
```

## File Structure for Development

```
blocks-everywhere/
├── src/                          (Your source code)
│   ├── index.tsx                (Main entry - MODIFY HERE)
│   ├── editor/
│   │   └── index.tsx            (Editor UI - MODIFY)
│   ├── blocks/
│   │   └── custom-block/        (Custom blocks)
│   ├── block-customization/
│   │   └── paragraph/           (Paragraph modifications)
│   ├── styles/
│   │   ├── editor.scss          (Base styles)
│   │   ├── bbpress.scss         (Forum styles)
│   │   └── ...
│   └── completer/
│
├── build/                        (Compiled output - DON'T MODIFY)
│   ├── blocks-everywhere.js
│   ├── blocks-everywhere.css
│   └── blocks-everywhere.js.map
│
├── classes/                      (PHP code - MODIFY)
│   ├── class-editor.php
│   ├── class-handler.php
│   └── handlers/
│       ├── class-bbpress.php
│       ├── class-comments.php
│       └── class-buddypress.php
│
├── tests/                        (Tests - MODIFY)
│   ├── test-bbpress-content.php
│   └── bootstrap.php
│
├── webpack.config.js            (Don't modify - use .wpenv.json)
├── tsconfig.json                (TypeScript config)
└── phpunit.xml                  (PHPUnit config)
```

## Workflow Examples

### Creating a New Feature

1. **Create source file** in `src/`
   ```bash
   mkdir -p src/features/my-feature
   touch src/features/my-feature/index.tsx
   touch src/features/my-feature/styles.scss
   ```

2. **Start watch mode**
   ```bash
   yarn start
   ```

3. **Write code** - automatically rebuilds
   ```typescript
   // src/features/my-feature/index.tsx
   export function MyFeature() { ... }
   ```

4. **Import in entry point**
   ```typescript
   // src/index.tsx
   import { MyFeature } from './features/my-feature';
   ```

5. **Test in browser**
   - Visit WordPress site
   - Check console for errors
   - Test functionality

6. **Commit changes**
   ```bash
   git add src/
   git commit -m "Add MyFeature"
   ```

### Modifying an Existing Block

1. **Locate block** in `src/blocks/`
2. **Edit `edit.tsx`** for editing interface
3. **Edit `save.tsx`** for saved output
4. **Modify `index.tsx`** if changing configuration
5. **Add styles** in accompanying `.scss` file
6. **Test** - reload WordPress page

### Fixing a Bug

1. **Reproduce** bug in browser
2. **Check error** in console
3. **Find source** file
4. **Add debugging**
   ```typescript
   console.log( 'Before:', value );
   // Fix code here
   console.log( 'After:', value );
   ```
5. **Reload** browser
6. **Verify fix**

## Release Process

### Creating a Release

```bash
# 1. Test thoroughly
yarn test:php && yarn test:js

# 2. Build production files
yarn build

# 3. Create clean release package
yarn release
# Creates: release/ directory with production files

# 4. Create distributable ZIP (WordPress.org)
yarn dist
# Creates: blocks-everywhere-x.y.z.zip
```

### What Gets Included

**Production ZIP** (`yarn release`):
```
blocks-everywhere/
├── blocks-everywhere.php
├── classes/
├── build/                    (Compiled only - no src/)
├── README.md
└── LICENSE.md
```

**Distribution ZIP** (`yarn dist`):
```
blocks-everywhere/
├── (same as release, plus)
├── readme.txt               (WordPress.org format)
└── screenshot-*.png        (WordPress.org assets)
```

**Excluded**:
- `src/` - Source files
- `node_modules/` - Dependencies
- `tests/` - Test files
- `.git/` - Git directory
- `build/` - During `release` (only output)

## Troubleshooting

### Build Issues

**Issue**: `yarn start` fails with error
- **Check**: `node --version` (need 16+)
- **Solution**: Update Node.js
- **Fallback**: Clear cache: `rm -rf node_modules yarn.lock && yarn install`

**Issue**: CSS not compiling
- **Check**: SCSS syntax
- **Solution**: Run `yarn lint:css --fix`
- **Debug**: Check `src/styles/` for errors

**Issue**: TypeScript errors
- **Check**: Type annotations
- **Solution**: Run `composer run psalm-check` to see all errors
- **Debug**: Hover over variable in IDE

### Runtime Issues

**Editor not loading on page**:
1. Check browser console for JS errors
2. Verify filter returns true: `apply_filters( 'blocks_everywhere_bbpress', ... )`
3. Check network tab for missing assets

**Blocks not rendering**:
1. Check if `do_blocks()` is called
2. Verify KSES allows block HTML
3. Check server error log

**Styles not applying**:
1. Check CSS is loaded (Network tab)
2. Verify CSS rules in DevTools
3. Check for `!important` overrides

### Performance Issues

**Page slow with editor**:
1. Check if all assets needed on page
2. Verify no large synchronous operations
3. Profile with Chrome DevTools (Performance tab)

**Build slow**:
1. Clear `node_modules` and reinstall
2. Check disk space
3. Run on faster drive/SSD

## Environment Variables

Configure via `.wpenv.json` or `env` file:

```json
{
    "SCRIPT_DEBUG": true,
    "WP_DEBUG": true
}
```

Or command line:
```bash
SCRIPT_DEBUG=true yarn start
```

## IDE/Editor Setup

### VS Code Configuration

**.vscode/settings.json**:
```json
{
    "eslint.enable": true,
    "[typescript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[scss]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    }
}
```

### PhpStorm Configuration

1. **Settings** → **Languages & Frameworks** → **Node.js**
   - Set Node interpreter
   
2. **Settings** → **Languages & Frameworks** → **PHP**
   - Set PHP executable path
   
3. **Settings** → **Tools** → **Composer**
   - Set Composer executable path

## Continuous Integration

### GitHub Actions

Configured via `.github/workflows/` (if present):
- Runs linters
- Runs tests
- Checks code quality

Runs on:
- Push to main
- Pull requests

### Local CI Simulation

```bash
# Run full CI pipeline locally
yarn lint:js && yarn lint:css && yarn lint:php && yarn test:php && yarn test:js && yarn build
```

---

**See Also**:
- [Architecture Guide](architecture.md)
- [Components Guide](components.md)
- [WordPress Scripts Documentation](https://developer.wordpress.org/block-editor/packages/packages-scripts/)
