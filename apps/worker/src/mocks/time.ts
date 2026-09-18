import { createDeviceClock } from '@sahayo/shared/seed/cast';

/**
 * Instants relative to now.
 *
 * A demo is given on a day nobody can predict, so every mock timestamp a
 * screen shows as "today", "this month" or "closes in 3 days" is computed at
 * load. Fixed dates go stale: a job offer from last Tuesday is not an offer.
 *
 * The arithmetic lives with the demo cast in @sahayo/shared, whose bookings are
 * written against the same clock so the backend's seed can place them at its
 * own fixed instant instead.
 */
export const { minutesAgo, minutesFromNow, daysAgo, daysFromNow, dayOfMonthsAgo } = createDeviceClock(Date.now);
