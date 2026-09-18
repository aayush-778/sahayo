/**
 * The prototype dataset, built by the canonical seed in @sahayo/shared.
 *
 * The seed moved there in Phase 5 so the backend builds exactly the dataset this
 * portal shows — the same ids, names and figures. This module stays as the portal's
 * one door to it: nothing outside `src/lib/store` should import from here, and the
 * lint rule that enforces that still points at this path.
 */
export * from '@sahayo/shared/seed';
