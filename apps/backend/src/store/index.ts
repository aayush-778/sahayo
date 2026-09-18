import type {
  AdminBooking,
  AdminCustomer,
  AdminWorker,
  BookingAddress,
  BookingEvent,
  BookingFare,
  BookingPaymentRecord,
  Id,
  IsoDateTime,
  LedgerEntry,
  Proposal,
  User,
} from '@sahayo/shared';
import { seedState } from './seed';

/**
 * The backend's whole state, in memory.
 *
 * Typed JavaScript maps seeded from the canonical seed in @sahayo/shared — the same
 * records the admin portal and the mobile apps show. There is no database, by
 * decision: nothing the demo does needs one.
 *
 * NOTHING OUTSIDE src/repositories READS OR WRITES THIS. Every access goes through a
 * repository function (`findCandidates`, `bookings.transition`, `appendSplit`), and
 * those function bodies are the only code a real database would replace.
 */

/**
 * A booking as the server keeps it: the admin portal's denormalised row, plus what the
 * mobile apps' `Booking` carries that the row does not. Its event history lives in
 * `bookingEvents`, not on the record.
 */
export interface StoredBooking extends Omit<AdminBooking, 'timeline'> {
  /** The sub-category (or legacy catalogue item) the job was booked under. */
  serviceCategoryId: Id;
  /** The priced item, for bookings made through the API. */
  serviceItemId?: Id;
  address: BookingAddress;
  notes?: string;
  scheduledFor?: IsoDateTime;
  fare?: BookingFare;
  cancellationReason?: string;
  /** Set when the customer pays for the finished job. Paying records; it does not move the status. */
  payment?: BookingPaymentRecord;
  updatedAt: IsoDateTime;
}

/** A conversation between a customer and a worker about one booking. */
export interface StoredChat {
  id: Id;
  bookingId: Id;
  customerId: Id;
  workerId: Id;
  messages: Array<{ id: Id; from: 'CUSTOMER' | 'WORKER'; text: string; sentAt: IsoDateTime }>;
}

export interface ServerState {
  /** The instant the seed was placed at: boot time. */
  seededAt: IsoDateTime;
  /** How far the seed's fixed SEED_NOW was moved to reach `seededAt`, in milliseconds. */
  shiftMs: number;
  /** Everyone who can sign in, by user id. */
  users: Map<Id, User>;
  /** User id → worker id, for workers. */
  workerIdByUserId: Map<Id, Id>;
  workers: Map<Id, AdminWorker>;
  customers: Map<Id, AdminCustomer>;
  bookings: Map<Id, StoredBooking>;
  /** Each booking's history, oldest first. Appended to, never rewritten. */
  bookingEvents: Map<Id, BookingEvent[]>;
  /** Append-only. */
  ledgerEntries: LedgerEntry[];
  proposals: Map<Id, Proposal>;
  /** Empty at boot: the worker app's seeded conversations are still its own mocks. */
  chats: Map<Id, StoredChat>;
  /** Workers waiting for verification, in the order the admin portal's queue lists them. */
  kycQueueWorkerIds: Id[];
  /** Bookings created or moved since boot: what the admin portal has to catch up on. */
  changedBookingIds: Set<Id>;
  /** How many ledger rows the seed held, so rows posted since boot can be told apart. */
  seededLedgerLength: number;
}

let current: ServerState | undefined;

/** The live state, seeded on first use. Repositories call this; nothing else should. */
export function state(): ServerState {
  current ??= seedState(Date.now());
  return current;
}

/** Throws the state away and seeds it again, at `now`. For tests, and a future "reset demo". */
export function resetState(now: number = Date.now()): ServerState {
  current = seedState(now);
  return current;
}
