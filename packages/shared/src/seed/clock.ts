/**
 * The dataset's time anchor, and the arithmetic around it.
 *
 * Its own module, importable as `@sahayo/shared/seed/clock`, so a caller that only
 * needs "now" does not load the seed. The seed builds its dates from here, the admin
 * portal's services slice periods with it, its UI renders "4h ago" against it, and
 * the backend rebases the seeded dataset from it at boot.
 */

/**
 * The instant the prototype treats as "now".
 *
 * Fixed rather than `Date.now()`. Every relative date in the dataset is computed
 * backwards from here, because a dataset that drifts with the wall clock is not
 * deterministic: "12,000 bookings over 90 days" would silently re-bucket itself
 * overnight and the charts would change shape between the rehearsal and the room.
 */
export const SEED_NOW = new Date('2026-09-12T10:30:00.000Z');

/** Milliseconds in a day, for the date arithmetic this codebase does constantly. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** An ISO timestamp `daysAgo` days (and optional minutes) before SEED_NOW. */
export function isoAgo(daysAgo: number, minutesOffset = 0): string {
  return new Date(SEED_NOW.getTime() - daysAgo * DAY_MS + minutesOffset * 60_000).toISOString();
}

/**
 * Orders two ISO-8601 timestamps, or two month keys like `2026-09`, oldest first.
 *
 * Plain ordinal comparison, not `localeCompare`. ISO strings sort correctly by
 * character code, and `localeCompare` runs the full Unicode collation algorithm on
 * every comparison — about seven times slower, which at 12,000 bookings and 40,000
 * ledger rows is the difference between an instant filter and a visible stall. Use
 * `localeCompare` for people's names, where collation is the point, and this for time.
 */
export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
