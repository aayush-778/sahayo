import { create } from 'zustand';
import { BookingStatus, type Booking, type Id, type LedgerEntry } from '@sahayo/shared';

import {
  customerByEntryId,
  mockBookings,
  mockEarnings,
  mockFundLedger,
  mockMyVotes,
  mockProposals,
  mockRatings,
  mockSettlements,
  mockSupportRequests,
  mockThreads,
  subCategoryByEntryId,
} from '../mocks';
import type {
  ChatThread,
  CustomerRating,
  DeclineRecord,
  JobRequest,
  JobTimeline,
  Proposal,
  Rating,
  Settlement,
  SupportRequest,
  VoteChoice,
} from '../types';

/**
 * Everything the partner can change during a session.
 *
 * Seeded from src/mocks, held in memory, and reset on sign-out. Accepting a
 * job, completing one, settling earnings, voting and messaging all write here
 * — through src/services — so that a tap on one screen shows up on every
 * other: an accepted offer leaves the feed and appears in Bookings, a finished
 * job's pay appears in Earnings and its 5% appears in the fund.
 *
 * In memory rather than persisted, deliberately: the demo is given more than
 * once, and each run should start from the same known state. Phase 5 replaces
 * the seed with the server's copy.
 */
export interface SessionState {
  /** Offers open right now. Dealt live by the dispatcher in services/jobs.ts, never seeded. */
  jobRequests: JobRequest[];
  /** How many offers have been dealt this session — gives each a unique id. */
  offerSeq: number;
  /** When the last offer arrived, in epoch milliseconds; null before the first. */
  lastOfferAt: number | null;
  bookings: Booking[];
  earnings: LedgerEntry[];
  subCategoryByEntryId: Record<Id, Id>;
  /** Which customer each payout came from, for the Earnings rows. */
  customerByEntryId: Record<Id, Id>;
  settlements: Settlement[];
  fundLedger: LedgerEntry[];
  proposals: Proposal[];
  /** This worker's own votes, keyed by proposal. One each, never changed. */
  votes: Record<Id, VoteChoice>;
  threads: ChatThread[];
  /** The last instant this worker opened each thread, for unread counts. */
  readUpTo: Record<Id, string>;
  ratings: Rating[];
  /** Offers turned down, with the reason — what Phase 5 feeds back to dispatch. */
  declines: DeclineRecord[];
  /**
   * Each booking's start code, which the customer's app shows and reads out at
   * the door. Held here only so the prototype can check it; in Phase 5 the
   * server checks it and the worker app never sees the code.
   */
  startCodes: Record<Id, string>;
  /** When each booking reached each status. */
  timelines: Record<Id, JobTimeline>;
  /** This worker's ratings of customers. */
  customerRatings: CustomerRating[];
  /** Tool loans and emergency claims this worker has asked the fund for. */
  supportRequests: SupportRequest[];
  /** Threads whose demo customer is "typing" a reply. */
  typing: Record<Id, boolean>;
}

/** Plain JSON records, so a JSON round trip is a safe deep copy on Hermes. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hashOf(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

/**
 * A booking's 4-digit start code, derived from its id.
 *
 * Derived rather than random so it is the same on every run of the demo — a
 * presenter can learn the code for the job they always show.
 */
export function startCodeFor(bookingId: Id): string {
  return String(1000 + (hashOf(bookingId) % 9000));
}

const MINUTE = 60_000;

/**
 * A plausible timeline for a seeded booking: the moment it reached its current
 * status, and for a finished job, when the work started — 35 to 90 minutes
 * earlier, varied by id so the durations are not all identical.
 */
function seedTimeline(booking: Booking): JobTimeline {
  const timeline: JobTimeline = {};
  if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.SETTLED) {
    const minutes = 35 + (hashOf(booking.id) % 55);
    timeline.IN_PROGRESS = new Date(new Date(booking.updatedAt).getTime() - minutes * MINUTE).toISOString();
    timeline.COMPLETED = booking.updatedAt;
    return timeline;
  }
  timeline[booking.status] = booking.updatedAt;
  return timeline;
}

function seed(): SessionState {
  return {
    jobRequests: [],
    offerSeq: 0,
    lastOfferAt: null,
    bookings: clone(mockBookings),
    earnings: clone(mockEarnings),
    subCategoryByEntryId: clone(subCategoryByEntryId),
    customerByEntryId: clone(customerByEntryId),
    settlements: clone(mockSettlements),
    fundLedger: clone(mockFundLedger),
    proposals: clone(mockProposals),
    votes: { ...mockMyVotes },
    threads: clone(mockThreads),
    readUpTo: {},
    ratings: clone(mockRatings),
    declines: [],
    startCodes: Object.fromEntries(mockBookings.map((booking) => [booking.id, startCodeFor(booking.id)])),
    timelines: Object.fromEntries(mockBookings.map((booking) => [booking.id, seedTimeline(booking)])),
    customerRatings: [],
    supportRequests: clone(mockSupportRequests),
    typing: {},
  };
}

export const useSessionStore = create<SessionState>()(() => seed());

/** Back to the seeded state. Called on sign-out and by the demo reset. */
export function reseedSession(): void {
  useSessionStore.setState(seed(), true);
}
