import { BookingStatus } from '@sahayo/shared';

/**
 * How a booking's status turns into something the customer can read.
 *
 * The status values themselves come from @sahayo/shared and are the contract
 * the backend will speak. Everything here is presentation: which bucket a
 * status falls into, what order the steps run in, and what colour a chip is.
 */

/**
 * The steps the tracker draws.
 *
 * BROADCAST is missing on purpose. It is a real state — the job is out to
 * nearby workers — but from the customer's side it is indistinguishable from
 * REQUESTED: nobody has accepted yet. Drawing it as its own step would ask
 * the customer to care about our dispatch mechanics.
 */
export const TRACKED_STEPS = [
  BookingStatus.REQUESTED,
  BookingStatus.ACCEPTED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
] as const;

export type TrackedStep = (typeof TRACKED_STEPS)[number];

/** Statuses that mean the job is still happening. */
const ACTIVE_STATUSES = new Set<BookingStatus>([
  BookingStatus.REQUESTED,
  BookingStatus.BROADCAST,
  BookingStatus.ACCEPTED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
]);

const CANCELLED_STATUSES = new Set<BookingStatus>([
  BookingStatus.CANCELLED_BY_CUSTOMER,
  BookingStatus.CANCELLED_BY_WORKER,
  BookingStatus.EXPIRED_NO_ACCEPT,
  BookingStatus.DISPUTED,
]);

export function isActiveStatus(status: BookingStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

export function isCancelledStatus(status: BookingStatus): boolean {
  return CANCELLED_STATUSES.has(status);
}

/** Which step of the tracker a status has reached; -1 once off the happy path. */
export function stepIndexOf(status: BookingStatus): number {
  if (status === BookingStatus.BROADCAST) return 0;
  if (status === BookingStatus.SETTLED) return TRACKED_STEPS.length - 1;
  return (TRACKED_STEPS as readonly BookingStatus[]).indexOf(status);
}

/**
 * The next status a manual advance moves to, or undefined at the end.
 *
 * Stops at COMPLETED rather than running on to SETTLED: settlement is what
 * paying does, and letting a debug tap mark money as received would put the
 * demo one stray tap away from claiming a payment that never happened.
 */
export function nextStatus(status: BookingStatus): BookingStatus | undefined {
  const index = stepIndexOf(status);
  if (index < 0 || index >= TRACKED_STEPS.length - 1) return undefined;
  return TRACKED_STEPS[index + 1];
}

export type BookingGroup = 'active' | 'upcoming' | 'past';
export const BOOKING_GROUPS: BookingGroup[] = ['active', 'upcoming', 'past'];

/**
 * Which tab a booking belongs in.
 *
 * `scheduledFor` is what splits active from upcoming, not the status: a
 * booking can be ACCEPTED and still be three days out, and listing it beside
 * a worker who is on their way right now would misread the screen. Once the
 * scheduled time arrives it moves to Active on its own, with no state change.
 */
export function groupOf(
  status: BookingStatus,
  scheduledFor: string | undefined,
  now: number = Date.now(),
): BookingGroup {
  if (!isActiveStatus(status)) return 'past';
  if (scheduledFor && new Date(scheduledFor).getTime() > now) return 'upcoming';
  return 'active';
}

/** Chip colours for the Past tab, where completed and cancelled sit together. */
export function chipToneFor(status: BookingStatus): 'success' | 'danger' | 'muted' {
  if (status === BookingStatus.COMPLETED || status === BookingStatus.SETTLED) return 'success';
  if (isCancelledStatus(status)) return 'danger';
  return 'muted';
}
