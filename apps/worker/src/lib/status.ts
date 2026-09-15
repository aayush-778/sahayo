import { BookingStatus, type Booking } from '@sahayo/shared';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'muted';

/** What colour a booking's status badge is. Words always accompany the colour. */
export function toneForStatus(status: Booking['status']): BadgeTone {
  switch (status) {
    case BookingStatus.COMPLETED:
    case BookingStatus.SETTLED:
      return 'success';
    case BookingStatus.CANCELLED_BY_CUSTOMER:
    case BookingStatus.CANCELLED_BY_WORKER:
    case BookingStatus.EXPIRED_NO_ACCEPT:
    case BookingStatus.DISPUTED:
      return 'danger';
    case BookingStatus.REQUESTED:
    case BookingStatus.BROADCAST:
      return 'warning';
    default:
      return 'primary';
  }
}
