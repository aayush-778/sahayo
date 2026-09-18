import { BookingStatus, DEFAULT_JOB_MINUTES, overlapsFor, slotEndMs, type Id, type ScheduleConflict } from '@sahayo/shared';
import * as bookings from '../repositories/bookings';
import * as catalogue from '../repositories/catalogue';
import type { StoredBooking } from '../store';

/** Work a worker has taken and not finished: what a new slot can collide with. */
const COMMITTED = new Set<string>([BookingStatus.ACCEPTED, BookingStatus.EN_ROUTE, BookingStatus.ARRIVED, BookingStatus.IN_PROGRESS]);

/** How long a job usually takes: its service's standard minutes, or an hour when that is not known. */
export function jobMinutesFor(booking: StoredBooking): number {
  const item = booking.serviceItemId ? catalogue.findItem(booking.serviceItemId) : undefined;
  return item && item.mode === 'fixed' ? item.stdMinutes : DEFAULT_JOB_MINUTES;
}

/** When a job starts: its slot if booked ahead, otherwise when it was last moved on — a job in hand is happening now. */
function startsAtMs(booking: StoredBooking): number {
  return Date.parse(booking.scheduledFor ?? booking.updatedAt);
}

/** The work `workerId` has already taken that `booking` would overlap, earliest first. */
export function conflictsFor(workerId: Id, booking: StoredBooking): ScheduleConflict[] {
  const commitments = bookings
    .listForWorker(workerId)
    .filter((other) => other.id !== booking.id && COMMITTED.has(other.status))
    .map((other) => ({ booking: other, startsAtMs: startsAtMs(other), minutes: jobMinutesFor(other) }));
  const slot = { startsAtMs: startsAtMs(booking), minutes: jobMinutesFor(booking) };
  return overlapsFor(slot, commitments).map(({ commitment, overlapMinutes }) => ({
    bookingId: commitment.booking.id,
    serviceName:
      catalogue.findItem(commitment.booking.serviceItemId ?? '')?.name ??
      catalogue.subCategoryName(commitment.booking.serviceCategoryId) ??
      commitment.booking.category,
    locality: commitment.booking.address.line2 ?? commitment.booking.address.line1,
    location: commitment.booking.location,
    startsAt: new Date(commitment.startsAtMs).toISOString(),
    endsAt: new Date(slotEndMs(commitment)).toISOString(),
    overlapMinutes,
  }));
}
