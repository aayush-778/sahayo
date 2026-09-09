import type { GeoPoint, Id, IsoDateTime, Paise } from './common';

/**
 * Lifecycle of a booking.
 *
 * REQUESTED -> BROADCAST -> ACCEPTED -> EN_ROUTE -> ARRIVED -> IN_PROGRESS
 *           -> COMPLETED -> SETTLED
 *
 * Terminal off-ramps: CANCELLED_BY_CUSTOMER, CANCELLED_BY_WORKER,
 * EXPIRED_NO_ACCEPT, DISPUTED.
 */
export const BookingStatus = {
  REQUESTED: 'REQUESTED',
  BROADCAST: 'BROADCAST',
  ACCEPTED: 'ACCEPTED',
  EN_ROUTE: 'EN_ROUTE',
  ARRIVED: 'ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  SETTLED: 'SETTLED',
  CANCELLED_BY_CUSTOMER: 'CANCELLED_BY_CUSTOMER',
  CANCELLED_BY_WORKER: 'CANCELLED_BY_WORKER',
  EXPIRED_NO_ACCEPT: 'EXPIRED_NO_ACCEPT',
  DISPUTED: 'DISPUTED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const BOOKING_STATUSES = Object.values(BookingStatus);

export interface BookingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  point: GeoPoint;
}

/** Fare breakdown, computed at settlement using the shares in constants.ts. */
export interface BookingFare {
  total: Paise;
  workerShare: Paise;
  platformShare: Paise;
  coopFundShare: Paise;
}

export interface Booking {
  id: Id;
  customerId: Id;
  /** Unset until a worker accepts the broadcast. */
  workerId?: Id;
  serviceCategoryId: Id;
  status: BookingStatus;
  address: BookingAddress;
  notes?: string;
  /** Set when the customer books ahead rather than on demand. */
  scheduledFor?: IsoDateTime;
  fare?: BookingFare;
  cancellationReason?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
