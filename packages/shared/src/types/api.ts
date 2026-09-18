import type { Booking, BookingActor, BookingAddress, BookingEvent, BookingStatus } from './booking';
import type { Id, IsoDateTime, Paise } from './common';
import type { Proposal } from './fund';
import type { LedgerEntry } from './ledger';
import type { User, UserRole } from './user';
import type { AdminBooking } from './booking';
import type { AdminWorker } from './worker';
import type { DispatchResolvedPayload, DispatchRoundPayload, PublicWorkerSummary } from '../events';

/**
 * The REST API's request and response shapes.
 *
 * Every request body has a zod schema in schemas/api.ts that the backend validates
 * against and the clients build to, so a renamed field is a compile error at both ends.
 */

/** What every failed request returns. `message` says what went wrong and what to do next. */
export interface ApiError {
  ok: false;
  error: string;
  message: string;
  issues?: Array<{ path: string; message: string }>;
}

export interface LoginRequest {
  /** Any common Indian format: `9431067203`, `+919431067203`, `+91 94310 67203`. */
  phone: string;
}

export interface LoginResult {
  user: User;
  role: UserRole;
  /** Set for a worker: the id dispatch and the socket handshake use. */
  workerId?: Id;
}

/** The sky over Patna, as far as pricing is concerned. */
export const Weather = {
  CLEAR: 'CLEAR',
  CLOUDY: 'CLOUDY',
  RAIN: 'RAIN',
  HEAVY_RAIN: 'HEAVY_RAIN',
} as const;
export type Weather = (typeof Weather)[keyof typeof Weather];

export interface QuoteRequest {
  serviceItemId: Id;
  /** Where the job is, for the demand term. */
  point: { lat: number; lng: number };
  /** Set when the customer books ahead: no urgency, weather or demand surcharge. */
  scheduledFor?: IsoDateTime;
}

/**
 * A price, with its reasons.
 *
 * `multiplier = 1 + urgency + weather + demand`, capped. The surcharge is part of the
 * item total the three shares are taken out of; GST is added on top.
 */
export interface FareQuote {
  serviceItemId: Id;
  base: Paise;
  factors: { urgency: number; weather: number; demand: number };
  weather: Weather;
  multiplier: number;
  /** True when the three factors asked for more than the cap allows. */
  capped: boolean;
  surge: Paise;
  itemTotal: Paise;
  workerShare: Paise;
  platformShare: Paise;
  coopFundShare: Paise;
  gst: Paise;
  total: Paise;
  quotedAt: IsoDateTime;
}

export interface CreateBookingRequest {
  customerId: Id;
  serviceItemId: Id;
  address: BookingAddress;
  notes?: string;
  scheduledFor?: IsoDateTime;
}

/** A booking as the API returns it: the record the apps share, its reference, and its history. */
export const PAYMENT_METHODS = ['upi', 'card', 'wallet', 'cash'] as const;
export type PaymentMethodId = (typeof PAYMENT_METHODS)[number];

/** How the customer paid for a finished job. Recorded on the booking; it does not change its status. */
export interface BookingPaymentRecord {
  method: PaymentMethodId;
  /** What the customer was charged: the item total plus GST. */
  amount: Paise;
  transactionId?: string;
  paidAt: IsoDateTime;
}

export interface PaymentRequest {
  customerId: Id;
  method: PaymentMethodId;
  transactionId?: string;
}

export interface BookingRecord {
  booking: Booking;
  /** `BKG-01423`, what people quote on the phone. */
  reference: string;
  customerName: string;
  workerName?: string;
  /** The assigned worker, as the customer sees them. */
  worker?: PublicWorkerSummary;
  payment?: BookingPaymentRecord;
  timeline: BookingEvent[];
}

export interface CreateBookingResult {
  record: BookingRecord;
  fare: FareQuote;
}

export interface BookingListResult {
  records: BookingRecord[];
  /** Everyone the records mention, so a list never has to look a name up. */
  customers: User[];
}

export interface TransitionRequest {
  to: BookingStatus;
  actor: BookingActor;
  /** Required to move to IN_PROGRESS: the code the customer reads out at the door. */
  startCode?: string;
  /** Required for a cancellation. */
  reason?: string;
}

export interface WorkerEarnings {
  workerId: Id;
  /** Credited to the worker and not yet released to their bank. */
  balance: Paise;
  /** What this worker has put into the cooperative fund, over their lifetime. */
  fundContributed: Paise;
  /** Every WORKER_PAYOUT credit, oldest first. */
  payouts: LedgerEntry[];
  /** Every PAYOUT_RELEASE row: the transfers that sent payouts to the bank. */
  releases: LedgerEntry[];
  /** Each payout's booking's sub-category and customer, for the Earnings rows. */
  bookingFacts: Record<Id, { serviceCategoryId: Id; customerId: Id }>;
  customers: User[];
}

export interface CoopFundSummary {
  balance: Paise;
  memberCount: number;
  /**
   * The fund's ledger, summarised: one contribution row per month plus every
   * disbursement. Forty thousand rows would be a lot to send to a phone for a chart.
   */
  ledger: LedgerEntry[];
  proposals: Proposal[];
}

export interface VoteRequest {
  workerId: Id;
  direction: 'FOR' | 'AGAINST';
}

export interface AdminOverview {
  now: IsoDateTime;
  workers: { total: number; online: number; onJob: number; connected: number };
  bookings: { today: number; live: number; broadcasting: number; completedToday: number };
  money: { grossToday: Paise; fundBalance: Paise; fundToday: Paise };
}

export type WorkerDetail = AdminWorker;

/** An administrator's verification decision about a worker. */
export interface KycDecisionRequest {
  status: 'VERIFIED' | 'REJECTED';
  adminId: Id;
  reason?: string;
}

/** A dispatch as the Broadcast Inspector shows it: every round, and how it ended. */
export interface BroadcastRecord {
  bookingId: Id;
  rounds: DispatchRoundPayload[];
  resolution?: DispatchResolvedPayload;
}

/**
 * What the admin portal needs to catch up with the server on connect: everything that
 * has changed since the server booted. The portal already holds the seeded dataset
 * itself; this is only the difference.
 */
export interface AdminLiveSnapshot {
  /** How far the server moved the seed's timestamps at boot; subtract it to read server times on the seed's clock. */
  shiftMs: number;
  seededAt: IsoDateTime;
  workers: Array<Pick<AdminWorker, 'id' | 'isOnline' | 'isOnJob' | 'location' | 'jobsThisWeek' | 'kycStatus'>>;
  /** Bookings created or moved since boot, in the portal's shape. */
  bookings: AdminBooking[];
  /** Ledger rows posted since boot. */
  ledgerEntries: LedgerEntry[];
  broadcasts: BroadcastRecord[];
  fundBalance: Paise;
}

/** The first members waiting for verification, for the worker app's demo sign-in. */
export interface KycQueueEntry {
  workerId: Id;
  name: string;
  phone: string;
  category: AdminWorker['category'];
}
