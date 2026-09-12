import type { AdminBooking, BookingEvent, BookingStatus } from '@sahayo/shared';
import { adminState } from '@/lib/store';
import { respond } from './latency';

export interface BookingFilter {
  /** Matches the booking reference, the customer or the worker. */
  search?: string;
  status?: BookingStatus;
  zoneId?: string;
  workerId?: string;
  customerId?: string;
  /** Inclusive lower bound on `createdAt`, as an ISO string. */
  since?: string;
}

export async function listBookings(filter: BookingFilter = {}): Promise<AdminBooking[]> {
  const { bookings } = adminState();
  const needle = filter.search?.trim().toLowerCase();

  const matched = bookings.filter((booking) => {
    if (filter.status && booking.status !== filter.status) return false;
    if (filter.zoneId && booking.zoneId !== filter.zoneId) return false;
    if (filter.workerId && booking.workerId !== filter.workerId) return false;
    if (filter.customerId && booking.customerId !== filter.customerId) return false;
    if (filter.since && booking.createdAt < filter.since) return false;
    if (needle) {
      const haystack =
        `${booking.reference} ${booking.customerName} ${booking.workerName ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  /* Newest first: a booking log is read from the top. */
  return respond([...matched].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function getBooking(bookingId: string): Promise<AdminBooking | undefined> {
  const { bookings } = adminState();
  return respond(bookings.find((booking) => booking.id === bookingId));
}

/**
 * The booking's events, oldest first.
 *
 * Oldest first because this is read as a narrative — the dispute queue draws it
 * as a vertical timeline from the request down to the payment split, and the
 * Broadcast Inspector reads the same list to explain who was offered the job.
 */
export async function getBookingTimeline(bookingId: string): Promise<BookingEvent[]> {
  const { bookings } = adminState();
  const booking = bookings.find((candidate) => candidate.id === bookingId);
  return respond(booking ? [...booking.timeline].sort((a, b) => a.at.localeCompare(b.at)) : []);
}
