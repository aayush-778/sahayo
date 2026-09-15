/**
 * Instants relative to now.
 *
 * A demo is given on a day nobody can predict, so every mock timestamp a
 * screen shows as "today", "this month" or "closes in 3 days" is computed at
 * load. Fixed dates go stale: a job offer from last Tuesday is not an offer.
 */

const MINUTE = 60_000;

export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * MINUTE).toISOString();
}

export function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * MINUTE).toISOString();
}

export function daysAgo(days: number, hour = 10, minute = 0): string {
  const at = new Date();
  at.setDate(at.getDate() - days);
  at.setHours(hour, minute, 0, 0);
  return clampToPast(at);
}

export function daysFromNow(days: number, hour = 10, minute = 0): string {
  const at = new Date();
  at.setDate(at.getDate() + days);
  at.setHours(hour, minute, 0, 0);
  return at.toISOString();
}

/**
 * A given day of the month `monthsAgo` before this one.
 *
 * The day is clamped to the month's length, and for the current month to
 * today — so "three months of earnings" never contains a payout that has not
 * happened yet, whatever date the demo runs on.
 */
export function dayOfMonthsAgo(monthsAgo: number, day: number, hour = 11): string {
  const now = new Date();
  const at = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1, hour, 0, 0, 0);
  const lastDay = new Date(at.getFullYear(), at.getMonth() + 1, 0).getDate();
  const cap = monthsAgo === 0 ? Math.min(lastDay, now.getDate()) : lastDay;
  at.setDate(Math.max(1, Math.min(day, cap)));
  return clampToPast(at);
}

/** Today at 11:00 is still in the future at 09:00. Pull it back to an hour ago. */
function clampToPast(at: Date): string {
  return at.getTime() > Date.now() ? new Date(Date.now() - 60 * MINUTE).toISOString() : at.toISOString();
}
