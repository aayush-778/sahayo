import { BookingStatus } from '@sahayo/shared';
import type { StatusVariant } from '@/components/ui-kit/StatusPill';

/**
 * Booking lifecycle states mapped onto the six pill variants.
 *
 * The pill set is deliberately small, so several booking states share one. The
 * label keeps the distinction the colour loses — "Cancelled" and "Expired" both
 * read as rejected, but they say which they are. Shared by every list of bookings,
 * so a job reads the same on a worker's profile and a customer's.
 */
export const BOOKING_STATUS_PILL: Record<string, { status: StatusVariant; label: string }> = {
  [BookingStatus.REQUESTED]: { status: 'pending', label: 'Requested' },
  [BookingStatus.BROADCAST]: { status: 'pending', label: 'Offered out' },
  [BookingStatus.ACCEPTED]: { status: 'active', label: 'Accepted' },
  [BookingStatus.EN_ROUTE]: { status: 'active', label: 'On the way' },
  [BookingStatus.ARRIVED]: { status: 'active', label: 'Arrived' },
  [BookingStatus.IN_PROGRESS]: { status: 'active', label: 'In progress' },
  [BookingStatus.COMPLETED]: { status: 'resolved', label: 'Finished' },
  [BookingStatus.SETTLED]: { status: 'resolved', label: 'Paid' },
  [BookingStatus.CANCELLED_BY_CUSTOMER]: { status: 'rejected', label: 'Customer cancelled' },
  [BookingStatus.CANCELLED_BY_WORKER]: { status: 'rejected', label: 'Worker cancelled' },
  [BookingStatus.EXPIRED_NO_ACCEPT]: { status: 'rejected', label: 'Nobody accepted' },
  [BookingStatus.DISPUTED]: { status: 'rejected', label: 'Disputed' },
};

export function bookingStatusPill(status: string): { status: StatusVariant; label: string } {
  return BOOKING_STATUS_PILL[status] ?? { status: 'pending', label: status };
}
