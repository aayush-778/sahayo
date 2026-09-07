/**
 * Socket.io event contract.
 *
 * This file is types only — no runtime socket code lives here. Both the
 * backend gateway and the mobile/web clients parameterise their Socket.io
 * generics with these interfaces so a renamed event or a changed payload is a
 * compile error rather than a silent no-op at runtime.
 */
import type { GeoPoint, Id, IsoDateTime, Paise } from './types/common';
import type { Booking, BookingStatus } from './types/booking';

/* ------------------------------------------------------------------ */
/* client -> server payloads                                          */
/* ------------------------------------------------------------------ */

export interface WorkerOnlinePayload {
  workerId: Id;
  /** Categories the worker is willing to take right now. */
  serviceCategoryIds: Id[];
  location: GeoPoint;
}

export interface WorkerOfflinePayload {
  workerId: Id;
}

export interface WorkerLocationPayload {
  workerId: Id;
  location: GeoPoint;
  /** Device heading in degrees, when available. */
  heading?: number;
  at: IsoDateTime;
}

export interface GigAcceptPayload {
  workerId: Id;
  bookingId: Id;
  /** Echoed from the offer so a stale accept can be rejected. */
  offerId: Id;
}

export interface GigDeclinePayload {
  workerId: Id;
  bookingId: Id;
  offerId: Id;
  reason?: string;
}

/** Ack for `gig:accept` — the server arbitrates races between workers. */
export interface GigAcceptAck {
  ok: boolean;
  /** Present when `ok` is false: `TAKEN`, `EXPIRED`, or `UNKNOWN_OFFER`. */
  reason?: 'TAKEN' | 'EXPIRED' | 'UNKNOWN_OFFER';
}

/* ------------------------------------------------------------------ */
/* server -> client payloads                                          */
/* ------------------------------------------------------------------ */

export interface GigOfferPayload {
  offerId: Id;
  bookingId: Id;
  serviceCategoryId: Id;
  pickup: GeoPoint;
  distanceM: number;
  estimatedFare: Paise;
  /** Wall-clock deadline; see GIG_OFFER_TIMEOUT_MS. */
  expiresAt: IsoDateTime;
}

export interface GigTakenPayload {
  offerId: Id;
  bookingId: Id;
}

export interface GigExpiredPayload {
  offerId: Id;
  bookingId: Id;
}

export interface BookingUpdatedPayload {
  bookingId: Id;
  status: BookingStatus;
  booking: Booking;
}

export interface WorkerMovedPayload {
  workerId: Id;
  bookingId?: Id;
  location: GeoPoint;
  heading?: number;
  at: IsoDateTime;
}

export interface CoopFundUpdatedPayload {
  cooperativeId: Id;
  /** Running fund balance after the contribution that triggered this event. */
  balance: Paise;
  delta: Paise;
  bookingId?: Id;
  at: IsoDateTime;
}

/* ------------------------------------------------------------------ */
/* the contract                                                        */
/* ------------------------------------------------------------------ */

export interface ClientToServerEvents {
  'worker:online': (payload: WorkerOnlinePayload) => void;
  'worker:offline': (payload: WorkerOfflinePayload) => void;
  'worker:location': (payload: WorkerLocationPayload) => void;
  'gig:accept': (payload: GigAcceptPayload, ack: (result: GigAcceptAck) => void) => void;
  'gig:decline': (payload: GigDeclinePayload) => void;
}

export interface ServerToClientEvents {
  'gig:offer': (payload: GigOfferPayload) => void;
  'gig:taken': (payload: GigTakenPayload) => void;
  'gig:expired': (payload: GigExpiredPayload) => void;
  'booking:updated': (payload: BookingUpdatedPayload) => void;
  'worker:moved': (payload: WorkerMovedPayload) => void;
  'coop:fund_updated': (payload: CoopFundUpdatedPayload) => void;
}

/** Reserved for multi-node Socket.io adapters. Empty until we scale out. */
export type InterServerEvents = Record<string, never>;

/** Per-socket state attached after authentication. */
export interface SocketData {
  userId?: Id;
  workerId?: Id;
  role?: 'CUSTOMER' | 'WORKER' | 'ADMIN';
}
