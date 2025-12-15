/**
 * Avoid importing `@wordpress/interface` root, which registers the `core/interface`
 * store and can collide with WordPress core on the frontend.
 *
 * We re-export the component layer only.
 */

export { InterfaceSkeleton } from '../node_modules/@wordpress/interface/build-module/components';
