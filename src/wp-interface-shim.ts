/**
 * Avoid importing the `@wordpress/interface` package root, which registers the
 * `core/interface` store and can collide with WordPress core on the frontend.
 *
 * We re-export only the component layer that Blocks Everywhere needs.
 */

export { InterfaceSkeleton } from '../node_modules/@wordpress/interface/build-module/components/index.mjs';
