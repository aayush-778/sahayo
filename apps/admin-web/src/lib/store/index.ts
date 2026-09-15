/**
 * The store's entry point.
 *
 * Importing from here is restricted to `src/lib/services/**` by
 * `no-restricted-imports` in eslint.config.mjs. If you are in a component and
 * want data, add or call a service function instead — that is the seam the real
 * backend swaps into.
 */
export { adminState, useAdminStore, type AdminState } from './admin-store';
