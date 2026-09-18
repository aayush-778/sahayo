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

/**
 * A step in a booking's life, as the dispute queue and the Broadcast Inspector
 * reconstruct it.
 *
 * `BROADCAST` and `PINGED` are separate on purpose: the first is the request
 * going out, the second records which workers it reached and in what order, and
 * that ordering is the evidence for why the dispatcher chose whom.
 */
export const BookingEventKind = {
  REQUESTED: 'REQUESTED',
  BROADCAST: 'BROADCAST',
  PINGED: 'PINGED',
  ACCEPTED: 'ACCEPTED',
  EN_ROUTE: 'EN_ROUTE',
  ARRIVED: 'ARRIVED',
  STARTED: 'STARTED',
  COMPLETED: 'COMPLETED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  /** No worker accepted in time, even after the radius was widened. */
  EXPIRED: 'EXPIRED',
  DISPUTED: 'DISPUTED',
} as const;
export type BookingEventKind = (typeof BookingEventKind)[keyof typeof BookingEventKind];

/** Who moved a booking: a person in one of the three apps, or the dispatcher itself. */
export interface BookingActor {
  role: 'CUSTOMER' | 'WORKER' | 'ADMIN' | 'SYSTEM';
  /** Absent for SYSTEM. */
  id?: Id;
}

export interface BookingEvent {
  id: Id;
  kind: BookingEventKind;
  at: IsoDateTime;
  /**
   * Who caused it. Every transition the server applies records one; events in the
   * generated history predate the server and carry none.
   */
  actor?: BookingActor;
  /** The status the booking reached with this event, when it changed status. */
  status?: BookingStatus;
  /** One plain-language line describing what happened. */
  detail: string;
  /** Set on PINGED: how many workers the request reached. */
  workersPinged?: number;
  /** Set on ACCEPTED: the accepting worker's position in the equity ranking. */
  equityRank?: number;
  /** Marks a moment a dispute points at, drawn with a coral marker. */
  disputed?: boolean;
}

/**
 * A booking as the administration sees it, denormalised for the same reason as
 * `AdminWorker`: the portal lists and filters these without joins, and the
 * backend swaps in behind the shape.
 */
export interface AdminBooking {
  id: Id;
  /** Short human-quotable handle, e.g. `BKG-01423`. */
  reference: string;
  customerId: Id;
  customerName: string;
  /** Unset until a worker accepts. */
  workerId?: Id;
  workerName?: string;
  category: string;
  zoneId: Id;
  /** Jittered around the zone centroid; this is the job's address, not the zone. */
  location: GeoPoint;
  status: BookingStatus;
  /** Gross the customer paid, which the 90/5/5 split divides. */
  amount: Paise;
  createdAt: IsoDateTime;
  acceptedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  timeline: BookingEvent[];
}
