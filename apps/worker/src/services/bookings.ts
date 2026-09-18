import { useMemo } from 'react';
import { BookingStatus, type Booking, type BookingRecord, type Id, type LedgerEntry, type User } from '@sahayo/shared';

import { DEMO_COOPERATIVE_ID, DEMO_WORKER_ID } from '../mocks';
import { ApiRequestError, api, isServerBacked, liveWorkerId, refreshEarningsAndFund } from '../realtime';
import { timelineFromEvents } from '../realtime/mappers';
import { findCustomer } from './people';
import { useSessionStore } from '../store/session';
import type { BookingTab, DeclineRecord, JobRequest, JobTimeline } from '../types';

/**
 * This worker's bookings, and moving an accepted job through to completion.
 *
 * The state machine is @sahayo/shared's:
 *   ACCEPTED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED
 * and every move is checked against it here, not on the screen, so a stale
 * screen can never push a booking two steps or backwards.
 */

/** Accepted work still to do. Named for the dashboard's "jobs in hand". */
export const PENDING_STATUSES = new Set<Booking['status']>([
  BookingStatus.ACCEPTED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
]);

export const COMPLETED_STATUSES = new Set<Booking['status']>([BookingStatus.COMPLETED, BookingStatus.SETTLED]);

export const CANCELLED_STATUSES = new Set<Booking['status']>([
  BookingStatus.CANCELLED_BY_CUSTOMER,
  BookingStatus.CANCELLED_BY_WORKER,
  BookingStatus.EXPIRED_NO_ACCEPT,
  BookingStatus.DISPUTED,
]);

export interface BookingView {
  booking: Booking;
  customer?: User;
}

export function useBooking(id: Id | undefined): BookingView | undefined {
  const bookings = useSessionStore((state) => state.bookings);
  return useMemo(() => {
    const booking = bookings.find((entry) => entry.id === id);
    return booking ? { booking, customer: findCustomer(booking.customerId) } : undefined;
  }, [bookings, id]);
}

/** The job in hand right now, if any — past ACCEPTED and not yet finished. */
export function useActiveJob(): BookingView | undefined {
  const bookings = useSessionStore((state) => state.bookings);
  return useMemo(() => {
    const active = bookings.find(
      (b) =>
        b.status === BookingStatus.EN_ROUTE ||
        b.status === BookingStatus.ARRIVED ||
        b.status === BookingStatus.IN_PROGRESS,
    );
    return active ? { booking: active, customer: findCustomer(active.customerId) } : undefined;
  }, [bookings]);
}

// --- The Bookings tab ----------------------------------------------------------

export const BOOKING_TABS: readonly BookingTab[] = ['all', 'pending', 'ongoing', 'completed', 'cancelled'];

/** One card on the Bookings tab. Offers and rejections sit beside bookings. */
export type BoardItem =
  | { kind: 'request'; key: string; request: JobRequest }
  | { kind: 'booking'; key: string; booking: Booking; customer?: User }
  | { kind: 'declined'; key: string; record: DeclineRecord };

const time = (iso: string | undefined) => (iso ? new Date(iso).getTime() : 0);

/** The job furthest along comes first: the one needing attention now. */
const ONGOING_RANK: Partial<Record<Booking['status'], number>> = {
  [BookingStatus.IN_PROGRESS]: 0,
  [BookingStatus.ARRIVED]: 1,
  [BookingStatus.EN_ROUTE]: 2,
  [BookingStatus.ACCEPTED]: 3,
};

function requestItem(request: JobRequest): BoardItem {
  return { kind: 'request', key: request.id, request };
}

function bookingItem(booking: Booking): BoardItem {
  return { kind: 'booking', key: booking.id, booking, customer: findCustomer(booking.customerId) };
}

function declinedItem(record: DeclineRecord): BoardItem {
  return { kind: 'declined', key: `declined_${record.requestId}`, record };
}

/**
 * Every tab's cards, from one pass over the session.
 *
 * The tabs partition the data rather than hand-picking it, so the counts
 * always add up: All is exactly the other four, in the order a worker acts on
 * them — offers waiting for an answer, then work in hand, then history.
 */
function buildBoard(
  requests: JobRequest[],
  bookings: Booking[],
  declines: DeclineRecord[],
  includeRequests: boolean,
): Record<BookingTab, BoardItem[]> {
  const pending = includeRequests
    ? [...requests].sort((a, b) => time(b.booking.createdAt) - time(a.booking.createdAt)).map(requestItem)
    : [];

  const ongoing = bookings
    .filter((booking) => PENDING_STATUSES.has(booking.status))
    .sort(
      (a, b) =>
        (ONGOING_RANK[a.status] ?? 9) - (ONGOING_RANK[b.status] ?? 9) ||
        time(a.scheduledFor ?? a.createdAt) - time(b.scheduledFor ?? b.createdAt),
    )
    .map(bookingItem);

  const completed = bookings
    .filter((booking) => COMPLETED_STATUSES.has(booking.status))
    .sort((a, b) => time(b.updatedAt) - time(a.updatedAt))
    .map(bookingItem);

  const cancelled = [
    ...bookings
      .filter((booking) => CANCELLED_STATUSES.has(booking.status))
      .map((booking) => ({ at: time(booking.updatedAt), item: bookingItem(booking) })),
    ...declines.map((record) => ({ at: time(record.declinedAt), item: declinedItem(record) })),
  ]
    .sort((a, b) => b.at - a.at)
    .map((entry) => entry.item);

  return { all: [...pending, ...ongoing, ...completed, ...cancelled], pending, ongoing, completed, cancelled };
}

/**
 * @param includeRequests  false before approval: a partner the cooperative has
 *   not approved is not offered work, so Pending must not list offers.
 */
export function useBookingBoard(includeRequests: boolean): Record<BookingTab, BoardItem[]> {
  const requests = useSessionStore((state) => state.jobRequests);
  const bookings = useSessionStore((state) => state.bookings);
  const declines = useSessionStore((state) => state.declines);
  return useMemo(
    () => buildBoard(requests, bookings, declines, includeRequests),
    [requests, bookings, declines, includeRequests],
  );
}

export function getBookingBoard(includeRequests: boolean): Record<BookingTab, BoardItem[]> {
  const { jobRequests, bookings, declines } = useSessionStore.getState();
  return buildBoard(jobRequests, bookings, declines, includeRequests);
}

// --- The job in hand --------------------------------------------------------------

const NO_TIMELINE: JobTimeline = {};

export function useJobTimeline(id: Id | undefined): JobTimeline {
  return useSessionStore((state) => (id ? state.timelines[id] : undefined)) ?? NO_TIMELINE;
}

/**
 * The start code, for the demo hint only. The customer's app is where the code
 * really comes from; in Phase 5 this function goes away.
 */
export function useDemoStartCode(id: Id | undefined): string | undefined {
  return useSessionStore((state) => (id ? state.startCodes[id] : undefined));
}

export const START_CODE_LENGTH = 4;

export type TransitionResult = { ok: true } | { ok: false; reason: 'not_found' | 'wrong_status' };

/** The only moves a worker can make, and the status each is allowed from. */
const NEXT: Partial<Record<Booking['status'], Booking['status']>> = {
  [BookingStatus.ACCEPTED]: BookingStatus.EN_ROUTE,
  [BookingStatus.EN_ROUTE]: BookingStatus.ARRIVED,
  [BookingStatus.ARRIVED]: BookingStatus.IN_PROGRESS,
  [BookingStatus.IN_PROGRESS]: BookingStatus.COMPLETED,
};

function transition(bookingId: Id, from: Booking['status']): TransitionResult {
  const booking = useSessionStore.getState().bookings.find((entry) => entry.id === bookingId);
  if (!booking) return { ok: false, reason: 'not_found' };
  const to = NEXT[from];
  if (booking.status !== from || !to) return { ok: false, reason: 'wrong_status' };

  const now = new Date().toISOString();
  useSessionStore.setState((state) => ({
    bookings: state.bookings.map((entry) =>
      entry.id === bookingId ? { ...entry, status: to, updatedAt: now } : entry,
    ),
    timelines: { ...state.timelines, [bookingId]: { ...state.timelines[bookingId], [to]: now } },
  }));
  return { ok: true };
}

/**
 * One step, asked of the server: it checks the move against its state machine, checks
 * the start code, posts the ledger split on completion, and tells the booking's room.
 * The session takes the booking the server returns, not a locally guessed one.
 */
async function remoteTransition(
  bookingId: Id,
  to: Booking['status'],
  startCode?: string,
): Promise<TransitionResult | { ok: false; reason: 'wrong_code' | 'incomplete' }> {
  const workerId = liveWorkerId();
  if (!workerId) return { ok: false, reason: 'not_found' };
  try {
    const record = await api<BookingRecord>('POST', `/bookings/${encodeURIComponent(bookingId)}/transitions`, {
      to,
      actor: { role: 'WORKER', id: workerId },
      ...(startCode ? { startCode } : {}),
    });
    useSessionStore.setState((state) => ({
      bookings: state.bookings.map((entry) => (entry.id === bookingId ? record.booking : entry)),
      timelines: { ...state.timelines, [bookingId]: { ...state.timelines[bookingId], ...timelineFromEvents(record.timeline) } },
    }));
    return { ok: true };
  } catch (error) {
    const code = error instanceof ApiRequestError ? error.code : '';
    if (code === 'WRONG_START_CODE') return { ok: false, reason: 'wrong_code' };
    if (code === 'START_CODE_REQUIRED') return { ok: false, reason: 'incomplete' };
    if (error instanceof ApiRequestError && error.status === 404) return { ok: false, reason: 'not_found' };
    return { ok: false, reason: 'wrong_status' };
  }
}

export async function startTrip(bookingId: Id): Promise<TransitionResult> {
  if (isServerBacked()) return (await remoteTransition(bookingId, BookingStatus.EN_ROUTE)) as TransitionResult;
  return transition(bookingId, BookingStatus.ACCEPTED);
}

export async function markArrived(bookingId: Id): Promise<TransitionResult> {
  if (isServerBacked()) return (await remoteTransition(bookingId, BookingStatus.ARRIVED)) as TransitionResult;
  return transition(bookingId, BookingStatus.EN_ROUTE);
}

export type StartWorkResult = TransitionResult | { ok: false; reason: 'incomplete' | 'wrong_code' };

/**
 * Starts the work — only with the customer's start code.
 *
 * The code is what stops a job being marked started, and then completed and
 * paid, without the worker ever reaching the door: only the customer holds it.
 */
export async function startWork(bookingId: Id, code: string): Promise<StartWorkResult> {
  const { bookings, startCodes } = useSessionStore.getState();
  const booking = bookings.find((entry) => entry.id === bookingId);
  if (!booking) return { ok: false, reason: 'not_found' };
  if (booking.status !== BookingStatus.ARRIVED) return { ok: false, reason: 'wrong_status' };

  const digits = code.replace(/\D/g, '');
  if (digits.length !== START_CODE_LENGTH) return { ok: false, reason: 'incomplete' };
  // Connected, the server holds the code and is the one that checks it.
  if (isServerBacked()) return remoteTransition(bookingId, BookingStatus.IN_PROGRESS, digits);
  if (digits !== startCodes[bookingId]) return { ok: false, reason: 'wrong_code' };
  return transition(bookingId, BookingStatus.ARRIVED);
}

/**
 * Completes a job, and books the money it earned.
 *
 * Two ledger rows appear alongside the status change: the worker's share as an
 * unsettled WORKER_PAYOUT, so it shows up in Earnings ready to settle, and the
 * cooperative's share as a COOP_FUND_CONTRIBUTION, so the fund balance moves.
 * The cooperative model, working in one tap.
 */
export async function completeJob(bookingId: Id): Promise<TransitionResult> {
  if (isServerBacked()) {
    const remote = (await remoteTransition(bookingId, BookingStatus.COMPLETED)) as TransitionResult;
    // The payout and the fund's share are the server's ledger rows, read back rather than written here.
    const workerId = liveWorkerId();
    if (remote.ok && workerId) await refreshEarningsAndFund(workerId).catch(() => undefined);
    return remote;
  }

  const result = transition(bookingId, BookingStatus.IN_PROGRESS);
  if (!result.ok) return result;

  const booking = useSessionStore.getState().bookings.find((entry) => entry.id === bookingId);
  const fare = booking?.fare;
  if (!booking || !fare) return result;

  const now = new Date().toISOString();
  const payout: LedgerEntry = {
    id: `earn_${booking.id}`,
    type: 'WORKER_PAYOUT',
    account: 'WORKER',
    direction: 'CREDIT',
    amount: fare.workerShare,
    subjectId: DEMO_WORKER_ID,
    bookingId: booking.id,
    referenceKey: `payout:${booking.id}`,
    createdAt: now,
  };
  const contribution: LedgerEntry = {
    id: `fund_${booking.id}`,
    type: 'COOP_FUND_CONTRIBUTION',
    account: 'COOP_FUND',
    direction: 'CREDIT',
    amount: fare.coopFundShare,
    cooperativeId: DEMO_COOPERATIVE_ID,
    bookingId: booking.id,
    description: 'job_contribution',
    referenceKey: `fund:${booking.id}`,
    createdAt: now,
  };

  // Keyed on referenceKey, the ledger's own idempotency handle, so completing
  // the same job twice cannot pay the worker twice.
  useSessionStore.setState((state) => ({
    earnings: state.earnings.some((e) => e.referenceKey === payout.referenceKey)
      ? state.earnings
      : [payout, ...state.earnings],
    subCategoryByEntryId: { ...state.subCategoryByEntryId, [payout.id]: booking.serviceCategoryId },
    customerByEntryId: { ...state.customerByEntryId, [payout.id]: booking.customerId },
    fundLedger: state.fundLedger.some((e) => e.referenceKey === contribution.referenceKey)
      ? state.fundLedger
      : [...state.fundLedger, contribution],
  }));
  return result;
}
