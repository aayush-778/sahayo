/**
 * The dataset's time anchor, and the arithmetic around it.
 *
 * This lives outside `src/lib/seed` on purpose. The seed builds its dates from
 * here, the services slice periods with it, and the UI needs it to render "4h
 * ago" against the same instant the data was built around — but the UI is barred
 * from importing the seed, and rightly so. Putting the anchor in a neutral module
 * lets all three share one definition instead of three.
 */

/**
 * The instant the prototype treats as "now".
 *
 * Fixed rather than `Date.now()`. Every relative date in the dataset is computed
 * backwards from here, because a dataset that drifts with the wall clock is not
 * deterministic: "900 bookings over 90 days" would silently re-bucket itself
 * overnight and the charts would change shape between the rehearsal and the room.
 */
export const SEED_NOW = new Date('2026-09-12T10:30:00.000Z');

/** Milliseconds in a day, for the date arithmetic this codebase does constantly. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** An ISO timestamp `daysAgo` days (and optional minutes) before SEED_NOW. */
export function isoAgo(daysAgo: number, minutesOffset = 0): string {
  return new Date(SEED_NOW.getTime() - daysAgo * DAY_MS + minutesOffset * 60_000).toISOString();
}
