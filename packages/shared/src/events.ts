/**
 * Socket.io event contract.
 *
 * No runtime socket code lives here — only the types and the event-name constants. Both the
 * backend gateway and the mobile/web clients parameterise their Socket.io
 * generics with these interfaces so a renamed event or a changed payload is a
 * compile error rather than a silent no-op at runtime.
 */
import type { GeoPoint, Id, IsoDateTime, Paise } from './types/common';
import type { Booking, BookingStatus } from './types/booking';
import type { EquityWeights } from './equity';
import type { LedgerEntry } from './types/ledger';
import type { EquityScoreInputs, KycStatus } from './types/worker';

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
  /**
   * A scheduled request that overlaps work this worker already took is refused with
   * `CONFLICT` unless this is true: the worker has seen the clash and accepts anyway.
   */
  confirmOverlap?: boolean;
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
  /** Present when `ok` is false: `TAKEN`, `EXPIRED`, `UNKNOWN_OFFER`, or `CONFLICT` for an unconfirmed overlap. */
  reason?: 'TAKEN' | 'EXPIRED' | 'UNKNOWN_OFFER' | 'CONFLICT';
  /** With `CONFLICT`: the accepted jobs this one overlaps, as the server sees them now. */
  conflicts?: ScheduleConflict[];
  /** Present when `ok` is true: the booking, now ACCEPTED and assigned to this worker. */
  booking?: Booking;
}

/** An accepted job that a scheduled request would overlap. */
export interface ScheduleConflict {
  bookingId: Id;
  /** What the job is, as a worker names it: the service, or its trade. */
  serviceName: string;
  locality: string;
  location: GeoPoint;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  overlapMinutes: number;
}

/* ------------------------------------------------------------------ */
/* server -> client payloads                                          */
/* ------------------------------------------------------------------ */

/**
 * `INSTANT`: needed now; thirty seconds to answer, full-screen on the phone.
 * `SCHEDULED`: booked ahead; open until the slot, waiting in a list, never interrupting.
 */
export type GigOfferKind = 'INSTANT' | 'SCHEDULED';

export interface GigOfferPayload {
  offerId: Id;
  kind: GigOfferKind;
  /** When the customer wants the work done. Always present on a SCHEDULED offer. */
  scheduledFor?: IsoDateTime;
  bookingId: Id;
  serviceCategoryId: Id;
  pickup: GeoPoint;
  distanceM: number;
  estimatedFare: Paise;
  /** Wall-clock deadline on the SERVER's clock: GIG_OFFER_TIMEOUT_MS away for INSTANT, the slot itself for SCHEDULED. */
  expiresAt: IsoDateTime;
  /**
   * When the server sent the offer, on the same clock as `expiresAt`. A client counts
   * down `expiresAt - issuedAt` from the moment the offer arrives, so a phone whose
   * clock is a minute out still shows the true thirty seconds.
   */
  issuedAt: IsoDateTime;
  /** The booking being offered, as it stands at BROADCAST — what the offer card shows. */
  booking: Booking;
  customerName: string;
  /** How long the job usually takes, in minutes, as the dispatcher quotes it. */
  estimatedMinutes: number;
}

export interface GigTakenPayload {
  offerId: Id;
  bookingId: Id;
}

export interface GigExpiredPayload {
  offerId: Id;
  bookingId: Id;
}

/**
 * What a customer is shown about the worker coming to their door. Carried on
 * `booking:updated` itself so the customer's screen can name the worker the moment
 * the job is accepted, without a second request over venue wifi.
 */
export interface PublicWorkerSummary {
  id: Id;
  name: string;
  avatarUrl: string;
  rating: number;
  ratingCount: number;
  lifetimeJobs: number;
  /** Where the worker was last reported. */
  location: GeoPoint;
}

export interface BookingUpdatedPayload {
  bookingId: Id;
  status: BookingStatus;
  booking: Booking;
  /** Present once a worker is assigned. */
  worker?: PublicWorkerSummary;
}

export interface WorkerMovedPayload {
  workerId: Id;
  bookingId?: Id;
  location: GeoPoint;
  heading?: number;
  at: IsoDateTime;
}

/** One worker's line in a dispatch round, with the arithmetic that placed them. */
export interface DispatchCandidate {
  workerId: Id;
  name: string;
  distanceM: number;
  rating: number;
  jobsThisWeek: number;
  inputs: EquityScoreInputs;
  score: number;
  rank: number;
  /** Among the top five the job was offered to. */
  offered: boolean;
  /** Had the worker app open when the offer went out. */
  connected: boolean;
}

/** A round of offers going out: the Broadcast Inspector's live feed. Admin room only. */
export interface DispatchRoundPayload {
  bookingId: Id;
  reference: string;
  round: 1 | 2;
  kind: GigOfferKind;
  radiusM: number;
  weights: EquityWeights;
  /** Every available worker in the radius, ranked; `offered` marks the top five. */
  candidates: DispatchCandidate[];
  /** When the booking was created, and when this round's offers went out and run out. */
  requestedAt: IsoDateTime;
  offeredAt: IsoDateTime;
  expiresAt: IsoDateTime;
}

/** How a dispatch ended. Admin room only. */
export interface DispatchResolvedPayload {
  bookingId: Id;
  reference: string;
  outcome: 'ACCEPTED' | 'EXPIRED' | 'WITHDRAWN';
  workerId?: Id;
  workerName?: string;
  rank?: number;
  score?: number;
  /** From the booking being requested to this outcome. */
  elapsedMs: number;
  at: IsoDateTime;
}

/** Ledger rows the server has just posted, and the fund's balance after them. Admin room only. */
export interface LedgerAppendedPayload {
  bookingId?: Id;
  reference?: string;
  entries: LedgerEntry[];
  fundBalance: Paise;
  at: IsoDateTime;
}

/** The cooperative decided a worker's verification. Sent to that worker's app, and the admin room. */
export interface WorkerKycUpdatedPayload {
  workerId: Id;
  kycStatus: KycStatus;
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
  'dispatch:round': (payload: DispatchRoundPayload) => void;
  'dispatch:resolved': (payload: DispatchResolvedPayload) => void;
  'ledger:appended': (payload: LedgerAppendedPayload) => void;
  'worker:kyc_updated': (payload: WorkerKycUpdatedPayload) => void;
}

/* ------------------------------------------------------------------ */
/* event names                                                         */
/* ------------------------------------------------------------------ */

/**
 * Every event name as a constant. Emitters and listeners use these, never a string:
 * a typo in a string literal is a listener that silently never fires. The checks
 * below make both lists exactly the keys of their event maps, so adding an event
 * to a map without naming it here is a compile error.
 */
export const ClientEvent = {
  WORKER_ONLINE: 'worker:online',
  WORKER_OFFLINE: 'worker:offline',
  WORKER_LOCATION: 'worker:location',
  GIG_ACCEPT: 'gig:accept',
  GIG_DECLINE: 'gig:decline',
} as const satisfies Record<string, keyof ClientToServerEvents>;

export const ServerEvent = {
  GIG_OFFER: 'gig:offer',
  GIG_TAKEN: 'gig:taken',
  GIG_EXPIRED: 'gig:expired',
  BOOKING_UPDATED: 'booking:updated',
  WORKER_MOVED: 'worker:moved',
  COOP_FUND_UPDATED: 'coop:fund_updated',
  DISPATCH_ROUND: 'dispatch:round',
  DISPATCH_RESOLVED: 'dispatch:resolved',
  LEDGER_APPENDED: 'ledger:appended',
  WORKER_KYC_UPDATED: 'worker:kyc_updated',
} as const satisfies Record<string, keyof ServerToClientEvents>;

type Exactly<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const clientEventsNamed: Exactly<(typeof ClientEvent)[keyof typeof ClientEvent], keyof ClientToServerEvents> = true;
const serverEventsNamed: Exactly<(typeof ServerEvent)[keyof typeof ServerEvent], keyof ServerToClientEvents> = true;
void clientEventsNamed;
void serverEventsNamed;

/** Reserved for multi-node Socket.io adapters. Empty until we scale out. */
export type InterServerEvents = Record<string, never>;

/** Per-socket state attached after authentication. */
export interface SocketData {
  userId?: Id;
  workerId?: Id;
  role?: 'CUSTOMER' | 'WORKER' | 'ADMIN';
}
