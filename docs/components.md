# Components & Development Guide

## React/TypeScript Architecture

Blocks Everywhere uses React and TypeScript for all frontend components. The codebase is organized by feature with type-safe component patterns.

### Component Structure

**File Location**: `src/`

**Organization**:
```
src/
├── index.tsx                    (Main plugin entry)
├── editor/                      (Editor UI components)
│   ├── index.tsx               (Editor wrapper)
│   ├── bbpress.tsx             (BBPress-specific UI)
│   └── ...                     (Platform-specific components)
├── blocks/                     (Custom block definitions)
│   ├── support-content-block/  (Example: Content embed block)
│   │   ├── index.tsx
│   │   ├── edit.tsx
│   │   ├── save.tsx
│   │   └── ...
│   └── ...
├── block-customization/        (Block behavior modifications)
│   ├── paragraph/             (Enhanced paragraph block)
│   ├── embed.tsx              (Embed block customizations)
│   └── index.tsx
├── styles/                    (SCSS modules)
│   ├── editor.scss
│   ├── bbpress.scss
│   └── ...
└── completer/                 (Utilities for autocomplete)
    └── mentions.js            (User mention suggestions)
```

### Component Naming

**Convention**: `PascalCase` for components, `camelCase` for functions

```typescript
// Component (PascalCase)
export function BlockEditor( props: BlockEditorProps ) {
    return <div>...</div>;
}

// Helper function (camelCase)
function processBlocks( content: string ): string {
    return content;
}

// Constants (UPPER_SNAKE_CASE)
const ALLOWED_BLOCKS = [ 'core/paragraph', ... ];
```

### TypeScript Patterns

**Avoid `any`**:
```typescript
// ❌ Bad
const settings: any = getSettings();

// ✅ Good
interface EditorSettings {
    blocks: string[];
    embeds: string[];
}
const settings: EditorSettings = getSettings();
```

**Props Interface**:
```typescript
// ✅ Define props interface
interface BlockEditorProps {
    content: string;
    onChange: ( content: string ) => void;
    settings?: EditorSettings;
}

export function BlockEditor( { content, onChange, settings }: BlockEditorProps ) {
    return <div>...</div>;
}
```

**WordPress Global Types**:
```typescript
// Types for WordPress globals (shims)
declare global {
    interface Window {
        wpBlocksEverywhere?: any;
        wp: {
            blockEditor: any;
            blocks: any;
            // etc.
        };
    }
}
```

## Building Components

### Example: Custom Block

**File**: `src/blocks/custom-example/index.tsx`

```typescript
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { RichText } from '@wordpress/block-editor';
import Edit from './edit';
import Save from './save';

// Block configuration
registerBlockType( 'namespace/custom-example', {
    apiVersion: 3,
    title: __( 'Custom Example' ),
    category: 'common',
    attributes: {
        content: {
            type: 'string',
            default: '',
        },
    },
    edit: Edit,
    save: Save,
} );
```

**Edit Component** (`src/blocks/custom-example/edit.tsx`):
```typescript
import { RichText } from '@wordpress/block-editor';
import type { BlockEditProps } from '@wordpress/blocks';

interface Attributes {
    content: string;
}

export default function Edit( {
    attributes,
    setAttributes,
}: BlockEditProps< Attributes > ) {
    return (
        <RichText
            value={ attributes.content }
            onChange={ ( content ) =>
                setAttributes( { content } )
            }
            placeholder="Enter content..."
        />
    );
}
```

**Save Component** (`src/blocks/custom-example/save.tsx`):
```typescript
import { RichText } from '@wordpress/block-editor';
import type { BlockSaveProps } from '@wordpress/blocks';

interface Attributes {
    content: string;
}

export default function Save( { attributes }: BlockSaveProps< Attributes > ) {
    return <RichText.Content value={ attributes.content } />;
}
```

### Block Customizations

**Modifying Existing Blocks** (`src/block-customization/paragraph/`):

The plugin extends the core paragraph block with custom functionality:

- `index.tsx` - Block registration and settings
- `edit.tsx` - Enhanced editing interface
- `use-enter.tsx` - Custom Enter key handling

```typescript
// Example: Custom block behavior
import { useEnter } from './use-enter';

export function ParagraphEdit( props: BlockEditProps< Attributes > ) {
    const { onEnter } = useEnter( props );
    
    return (
        <RichText
            onKeyDown={ ( event ) => {
                if ( event.key === 'Enter' ) {
                    onEnter( event );
                }
            } }
            { ...otherProps }
        />
    );
}
```

## Styling Components

### SCSS Modules

**Pattern**: Feature-based SCSS files with CSS Module support

**File**: `src/blocks/custom-example/edit.scss`

```scss
// Scoped styles for custom component
.customExample {
    padding: 1rem;
    border: 1px solid #ccc;

    &-title {
        font-weight: bold;
        color: var( --accent );
    }

    &-content {
        margin-top: 0.5rem;
    }
}
```

**Import in Component**:
```typescript
import styles from './edit.scss';

export default function Edit( props ) {
    return (
        <div className={ styles.customExample }>
            <h3 className={ styles.customExampleTitle }>Title</h3>
            <div className={ styles.customExampleContent }>Content</div>
        </div>
    );
}
```

### Theme Compatibility

Platform-specific styles ensure blocks work on different themes:

- `styles/editor.scss` - Base editor styles
- `styles/bbpress.scss` - Forum customizations
- `styles/comments.scss` - Comment form styles
- `styles/buddypress.scss` - Activity stream styles
- `styles/theme-compat.scss` - Override common theme issues

## Editor Configuration

### Settings Flow

```
WordPress filters
    ↓
blocks_everywhere_editor_settings
    ↓
Editor instance configuration
    ↓
Isolated Block Editor setup
```

### Customizing Editor via Filter

**PHP**:
```php
add_filter( 'blocks_everywhere_editor_settings', function( $settings ) {
    // Modify JavaScript settings
    $settings['blocksEverywhere']['blocks']['allowBlocks'] = [
        'core/paragraph',
        'core/image',
        'core/list',
    ];
    
    // Add platform-specific config
    if ( is_bbpress() ) {
        $settings['bbpress'] = [
            'forumId' => bbp_get_forum_id(),
            'topicId' => bbp_get_topic_id(),
        ];
    }
    
    return $settings;
} );
```

**JavaScript** (`src/editor/index.tsx`):
```typescript
// Access settings passed from PHP
const editorSettings = window.wpBlocksEverywhere?.settings;

if ( editorSettings?.blocksEverywhere?.blocks?.allowBlocks ) {
    // Use custom blocks list
}

if ( editorSettings?.bbpress ) {
    // Use BBPress-specific config
}
```

### Slot Fill API

Host pages can render React content into IBE's footer / toolbar / heading
slots via `window.blocksEverywhere.registerSlotFill( slot, renderFn )`.

This is the preferred way to surface action chrome (submit buttons, save
buttons, status indicators, etc.) inside the editor skeleton — content
rendered into these slots stays visible when the user toggles fullscreen
mode, because the slots live inside the IBE skeleton itself.

**API**:

```typescript
window.blocksEverywhere.registerSlotFill(
    slot: 'footer' | 'toolbar' | 'heading',
    renderFn: ( textarea: HTMLTextAreaElement ) => ReactNode
): () => void
```

The render function is invoked once per editor mount, with the editor's
textarea passed in. This lets consumers scope their fills to a specific
editor instance when multiple BE editors live on the same page (e.g.
inline reply forms).

The return value is an unregister function — call it to remove the fill.

Registrations made before BE mounts are picked up automatically.
Registrations made after mount are also picked up — already-mounted
editors re-render to include the new fill.

### Editor Lifecycle API

Each editor instance emits DOM lifecycle events on its container. Events use
the `blocksEverywhere:editor:<name>` format and include `container`,
`textarea`, `settings`, and `instance` in `event.detail`.

Supported events:

- `blocksEverywhere:editor:before-load`
- `blocksEverywhere:editor:loaded`
- `blocksEverywhere:editor:focus-requested`
- `blocksEverywhere:editor:focused`
- `blocksEverywhere:editor:blurred`
- `blocksEverywhere:editor:error`
- `blocksEverywhere:editor:before-unmount`
- `blocksEverywhere:editor:unmounted`

Hosts can also provide callbacks on `settings.blocksEverywhere.lifecycle`:

```typescript
settings.blocksEverywhere.lifecycle = {
    onLoaded( { instance, container } ) {
        container.classList.remove( 'is-loading' );
        instance.focus();
    },
    onError( { error, container } ) {
        container.classList.add( 'has-editor-error' );
        console.error( error );
    },
};
```

The editor instance API is available from lifecycle event details, from
`window.blocksEverywhere.getEditor( textarea )`, and from
`textarea.__blocksEverywhereEditor` for low-level integrations.

```typescript
const instance = window.blocksEverywhere.getEditor( textarea );

instance.focus();
instance.unmount();
```

`instance.unmount()` emits `before-unmount` and `unmounted`, allowing host
pages to clean transient notices or UI state without forcing a page reload.

**Example** (vanilla JS, no React tree of your own):

```javascript
const { createElement } = window.wp.element;

window.blocksEverywhere.registerSlotFill( 'footer', ( textarea ) => {
    return createElement(
        'button',
        {
            type: 'button',
            onClick: () => textarea.form.submit(),
        },
        'Submit'
    );
} );
```

**Example** (React component from another tree):

```typescript
import { createElement, useEffect } from '@wordpress/element';

function HostComposer() {
    useEffect( () => {
        return window.blocksEverywhere?.registerSlotFill( 'footer', ( textarea ) => {
            return createElement( SubmitButton, { textarea } );
        } );
    }, [] );

    // ...rest of the component
}
```

**Slots**:

| Slot | IBE component | Where it renders |
|------|---------------|------------------|
| `footer` | `FooterSlot` / `ActionArea` | Bottom of editor skeleton (`.edit-post-layout__footer`) |
| `toolbar` | `ToolbarSlot` | Editor header toolbar |
| `heading` | `EditorHeadingSlot` | Above the visual canvas |

**Why this pattern matters**: BE mounts IBE inside its own SlotFillProvider,
so a `<Slot>` rendered outside that provider will not see fills from
external React trees. The `registerSlotFill` API solves that by feeding
fills into the IBE tree via the registry, where they reach the slots
through the shared provider.

## Working with Imports

### Proper Import Organization

**Order** (enforce via eslint):
1. WordPress packages
2. Internal custom code
3. Local utilities

```typescript
// ✅ Correct order
import { registerBlockType } from '@wordpress/blocks';
import { RichText } from '@wordpress/block-editor';

import { EditorComponent } from '../editor';
import { processContent } from '../utils';

import styles from './styles.scss';
```

### Import Rules

**Do**:
- ✅ Import specific exports: `import { foo } from '@package'`
- ✅ Use package root: `import { foo } from '@wordpress/blocks'`
- ✅ Namespace internal imports: `import { Foo } from '../components'`

**Don't**:
- ❌ Deep imports: `import { foo } from '@wordpress/blocks/components'`
- ❌ Wildcard imports: `import * as foo from '@package'`
- ❌ Mixed internal/external in one import

## Testing Components

### Jest Configuration

**File**: `jest.config.js` (provided by `@wordpress/scripts`)

### Testing Patterns

```typescript
// __tests__/editor.test.tsx
import { render, screen } from '@testing-library/react';
import BlockEditor from '../index';

describe( 'BlockEditor', () => {
    it( 'renders editor component', () => {
        render( <BlockEditor /> );
        expect( screen.getByRole( 'button' ) ).toBeInTheDocument();
    } );

    it( 'calls onChange when content changes', () => {
        const onChange = jest.fn();
        render( <BlockEditor onChange={ onChange } /> );
        
        // Simulate user interaction
        const input = screen.getByRole( 'textbox' );
        fireEvent.change( input, { target: { value: 'test' } } );
        
        expect( onChange ).toHaveBeenCalledWith( 'test' );
    } );
} );
```

## Performance Optimization

### Memoization

```typescript
import { memo, useCallback } from 'react';

// Prevent unnecessary re-renders
export const BlockEditor = memo( function BlockEditor( {
    content,
    onChange,
}: BlockEditorProps ) {
    // useCallback to prevent function recreation
    const handleChange = useCallback( ( newContent: string ) => {
        onChange( newContent );
    }, [ onChange ] );

    return <Editor onChange={ handleChange } />;
} );
```

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy( () => import( './HeavyComponent' ) );

export function App() {
    return (
        <Suspense fallback={ <div>Loading...</div> }>
            <HeavyComponent />
        </Suspense>
    );
}
```

## Debugging

### Browser DevTools

**React DevTools**:
1. Install React DevTools browser extension
2. Inspect components in Elements tab
3. View props and state in React tab

**Console Logging**:
```typescript
function BlockEditor( props: BlockEditorProps ) {
    console.log( 'BlockEditor props:', props );
    
    return <div>...</div>;
}
```

### WordPress Debugging

Enable in `wp-config.php`:
```php
define( 'WP_DEBUG', true );
define( 'SCRIPT_DEBUG', true ); // Load unminified scripts
```

## Build Process

### Webpack Configuration

**File**: `webpack.config.js` (extends `@wordpress/scripts`)

Configuration includes:
- Entry points for JavaScript
- CSS/SCSS preprocessing
- Image optimization
- Source maps for debugging

### npm Scripts

**Development**:
```bash
yarn start              # Watch and rebuild
yarn start:sync        # Watch and upload to remote
```

**Production**:
```bash
yarn build             # Minify and optimize
yarn build:sync        # Build and upload
```

**Testing**:
```bash
yarn test:php          # PHPUnit tests
yarn test:js           # Jest tests
```

**Linting**:
```bash
yarn lint:js           # ESLint
yarn lint:css          # stylelint
yarn lint:php          # PHP_CodeSniffer
```

## Accessibility (a11y)

### WCAG 2.1 Compliance

**Keyboard Navigation**:
```typescript
<button
    onClick={ handleClick }
    onKeyDown={ ( e ) => {
        if ( e.key === 'Enter' || e.key === ' ' ) {
            handleClick();
        }
    } }
>
    Action
</button>
```

**Screen Reader Support**:
```typescript
<div aria-label="Editor controls">
    <button aria-pressed={ isActive }>Toggle</button>
</div>
```

**Color Contrast**:
- Maintain at least 4.5:1 contrast ratio
- Don't rely on color alone for information

## Deployment & Distribution

### Release Process

1. **Development**: `yarn start` (watch mode)
2. **Build**: `yarn build` (optimize production)
3. **Package**: `yarn release` (create clean distribution)
4. **Distribute**: `yarn dist` (WordPress.org submission)

### What Gets Built

**JavaScript Bundles**:
- `build/blocks-everywhere.js` - Main plugin logic
- `build/blocks-everywhere-view.js` - Frontend rendering
- Source maps for debugging

**CSS**:
- `build/blocks-everywhere.css` - Compiled and minified

### File Inclusion

Built files in `build/` included in production ZIP via `composer.json` or `build.sh`.

Development files excluded:
- `src/` - Source TypeScript/React
- `node_modules/` - Dependencies
- Tests and configuration files

---

**See Also**:
- [Architecture Guide](architecture.md)
- [Build & Development](build-and-development.md)
- [@wordpress/scripts Documentation](https://developer.wordpress.org/block-editor/packages/packages-scripts/)
- [React Documentation](https://react.dev/)
