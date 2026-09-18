import type { IsoDateTime } from './types/common';

/**
 * Booked-ahead work: when a booking counts as scheduled, when its reminder shows, and
 * whether two jobs collide. Shared, because the dispatcher enforces the same overlap
 * rule the worker app warns about — a warning the server did not agree with would be
 * worse than none.
 */

const MINUTE = 60_000;

/**
 * A booking whose slot is at least this far off is dispatched as a scheduled request:
 * sent to every matching worker at once, and claimable until the slot. Anything sooner
 * is effectively "now" and goes out as an instant offer with the thirty-second window —
 * half an hour is about the time it takes to reach a job across Patna.
 */
export const SCHEDULED_LEAD_MS = 30 * MINUTE;

/** The worker app puts a reminder banner up this long before an accepted slot. */
export const SCHEDULE_REMINDER_MS = 60 * MINUTE;

/** And marks the job as due soon from this long before it. */
export const SCHEDULE_DUE_SOON_MS = 15 * MINUTE;

/** A job whose usual length is not known is planned as an hour. */
export const DEFAULT_JOB_MINUTES = 60;

/** Whether a booking for `scheduledFor`, made at `nowMs`, is dispatched as a scheduled request. */
export function isScheduledDispatch(scheduledFor: IsoDateTime | undefined, nowMs: number): boolean {
  if (!scheduledFor) return false;
  const at = Date.parse(scheduledFor);
  return Number.isFinite(at) && at - nowMs >= SCHEDULED_LEAD_MS;
}

/** A stretch of a worker's day: when a job starts and how long it runs. */
export interface TimeSlot {
  startsAtMs: number;
  minutes: number;
}

export function slotEndMs(slot: TimeSlot): number {
  return slot.startsAtMs + slot.minutes * MINUTE;
}

/** Whole minutes two slots share; 0 when they only touch or do not meet. */
export function overlapMinutes(a: TimeSlot, b: TimeSlot): number {
  const shared = Math.min(slotEndMs(a), slotEndMs(b)) - Math.max(a.startsAtMs, b.startsAtMs);
  return shared > 0 ? Math.ceil(shared / MINUTE) : 0;
}

/**
 * The commitments `slot` collides with, earliest first. A job ending at 2:00 and one
 * starting at 2:00 do not collide: travel between them is the worker's call to make,
 * and the app shows the distance so they can make it.
 */
export function overlapsFor<T extends TimeSlot>(slot: TimeSlot, commitments: readonly T[]): Array<{ commitment: T; overlapMinutes: number }> {
  return commitments
    .map((commitment) => ({ commitment, overlapMinutes: overlapMinutes(slot, commitment) }))
    .filter((entry) => entry.overlapMinutes > 0)
    .sort((a, b) => a.commitment.startsAtMs - b.commitment.startsAtMs);
}
