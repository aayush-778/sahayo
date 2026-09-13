import {
  BookingEventKind,
  BookingStatus,
  type AdminBooking,
  type AdminCustomer,
  type AdminWorker,
  type BookingEvent,
  type Dispute,
  type LedgerEntry,
  type Paise,
} from '@sahayo/shared';
import { CURRENT_ADMIN } from '@/lib/nav/session';
import { DAY_MS, SEED_NOW, isCompletedBooking } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';
import { compareIso } from '@/lib/dates';
import { postedSplit, routeFor, type TimelineNode } from './disputes.service';

/** Statuses a job is still moving through. */
export const LIVE_STATUSES: ReadonlySet<string> = new Set([
  BookingStatus.REQUESTED,
  BookingStatus.BROADCAST,
  BookingStatus.ACCEPTED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
]);

/** Statuses where the job ended without being done. */
export const CANCELLED_STATUSES: ReadonlySet<string> = new Set([
  BookingStatus.CANCELLED_BY_CUSTOMER,
  BookingStatus.CANCELLED_BY_WORKER,
  BookingStatus.EXPIRED_NO_ACCEPT,
]);

/** The groups the booking log filters by, which is how an operator thinks about status. */
export type BookingStatusGroup = 'LIVE' | 'FINISHED' | 'CANCELLED' | 'DISPUTED';

export function statusGroupOf(booking: AdminBooking, disputedIds?: ReadonlySet<string>): BookingStatusGroup {
  if (booking.status === BookingStatus.DISPUTED || disputedIds?.has(booking.id)) return 'DISPUTED';
  if (LIVE_STATUSES.has(booking.status)) return 'LIVE';
  if (CANCELLED_STATUSES.has(booking.status)) return 'CANCELLED';
  return 'FINISHED';
}

export type BookingPeriod = '24H' | '7D' | '30D' | '90D';

function periodStart(period: BookingPeriod | undefined): string | undefined {
  if (!period) return undefined;
  const days = period === '24H' ? 1 : period === '7D' ? 7 : period === '30D' ? 30 : 90;
  return new Date(SEED_NOW.getTime() - days * DAY_MS).toISOString();
}

export interface BookingFilter {
  /** Matches the booking reference, the customer or the worker. */
  search?: string;
  status?: BookingStatus;
  statusGroup?: BookingStatusGroup;
  zoneId?: string;
  workerId?: string;
  customerId?: string;
  /** A trade label as bookings carry it, e.g. "Plumber". */
  category?: string;
  period?: BookingPeriod;
  /** Inclusive lower bound on `createdAt`, as an ISO string. */
  since?: string;
}

export async function listBookings(filter: BookingFilter = {}): Promise<AdminBooking[]> {
  const { bookings, disputes } = adminState();
  const needle = filter.search?.trim().toLowerCase();
  const since = filter.since ?? periodStart(filter.period);
  const disputedIds = filter.statusGroup ? new Set(disputes.map((dispute) => dispute.bookingId)) : undefined;

  const matched = bookings.filter((booking) => {
    if (filter.status && booking.status !== filter.status) return false;
    if (filter.statusGroup && statusGroupOf(booking, disputedIds) !== filter.statusGroup) return false;
    if (filter.zoneId && booking.zoneId !== filter.zoneId) return false;
    if (filter.workerId && booking.workerId !== filter.workerId) return false;
    if (filter.customerId && booking.customerId !== filter.customerId) return false;
    if (filter.category && booking.category !== filter.category) return false;
    if (since && booking.createdAt < since) return false;
    if (needle) {
      const haystack =
        `${booking.reference} ${booking.customerName} ${booking.workerName ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  /* Newest first: a booking log is read from the top. */
  return respond([...matched].sort((a, b) => compareIso(b.createdAt, a.createdAt)));
}

/** The trades bookings have been made for, alphabetically, for the filter. */
export async function listBookingCategories(): Promise<string[]> {
  const categories = new Set(adminState().bookings.map((booking) => booking.category));
  return respond([...categories].sort((a, b) => a.localeCompare(b)));
}

export async function getBooking(bookingId: string): Promise<AdminBooking | undefined> {
  const { bookings } = adminState();
  return respond(bookings.find((booking) => booking.id === bookingId));
}

/**
 * The booking's events, oldest first.
 *
 * Oldest first because this is read as a narrative — the dispute queue draws it
 * as a vertical timeline from the request down to the payment split, and the
 * Broadcast Inspector reads the same list to explain who was offered the job.
 */
export async function getBookingTimeline(bookingId: string): Promise<BookingEvent[]> {
  const { bookings } = adminState();
  const booking = bookings.find((candidate) => candidate.id === bookingId);
  return respond(booking ? [...booking.timeline].sort((a, b) => compareIso(a.at, b.at)) : []);
}

export interface BookingOverview {
  /** Booked in the rolling last 24 hours, the same window as the dashboard. */
  last24h: number;
  /** Change against the previous seven days' daily average. */
  last24hDeltaPercent: number;
  /** Jobs moving right now. */
  live: number;
  last30: {
    booked: number;
    /** Finished jobs as a share of jobs that ended, finished or not. */
    completionRate: number;
    cancelled: number;
    cancelledByCustomer: number;
    cancelledByWorker: number;
    unaccepted: number;
    /** What customers paid for finished jobs. */
    gross: Paise;
    averageValue: Paise;
  };
}

/** The figures above the booking log. */
export async function getBookingOverview(): Promise<BookingOverview> {
  const { bookings, disputes } = adminState();
  /* Grouped exactly as the log's status filter groups them, so a figure and its link agree. */
  const disputedIds = new Set(disputes.map((dispute) => dispute.bookingId));
  const now = SEED_NOW.getTime();
  const dayStart = new Date(now - DAY_MS).toISOString();
  const baselineStart = new Date(now - 8 * DAY_MS).toISOString();
  const monthStart = new Date(now - 30 * DAY_MS).toISOString();

  let last24h = 0;
  let baseline = 0;
  let live = 0;
  const month = { booked: 0, finished: 0, cancelled: 0, byCustomer: 0, byWorker: 0, unaccepted: 0, gross: 0 };

  for (const booking of bookings) {
    if (LIVE_STATUSES.has(booking.status)) live += 1;
    if (booking.createdAt >= dayStart) last24h += 1;
    else if (booking.createdAt >= baselineStart) baseline += 1;
    if (booking.createdAt < monthStart) continue;
    month.booked += 1;
    if (isCompletedBooking(booking)) {
      month.finished += 1;
      month.gross += booking.amount;
    } else if (statusGroupOf(booking, disputedIds) === 'CANCELLED') {
      month.cancelled += 1;
      if (booking.status === BookingStatus.CANCELLED_BY_CUSTOMER) month.byCustomer += 1;
      else if (booking.status === BookingStatus.CANCELLED_BY_WORKER) month.byWorker += 1;
      else month.unaccepted += 1;
    }
  }

  const baselinePerDay = baseline / 7;
  const ended = month.finished + month.cancelled;
  return respond({
    last24h,
    last24hDeltaPercent: baselinePerDay ? Math.round(((last24h - baselinePerDay) / baselinePerDay) * 1000) / 10 : 0,
    live,
    last30: {
      booked: month.booked,
      completionRate: ended ? month.finished / ended : 0,
      cancelled: month.cancelled,
      cancelledByCustomer: month.byCustomer,
      cancelledByWorker: month.byWorker,
      unaccepted: month.unaccepted,
      gross: month.gross,
      averageValue: month.finished ? Math.round(month.gross / month.finished) : 0,
    },
  });
}

export interface BookingDetail {
  booking: AdminBooking;
  zoneName: string;
  customer?: AdminCustomer;
  worker?: AdminWorker;
  /** The job's events with the drive and the payment split in place, oldest first. */
  timeline: TimelineNode[];
  /** Every ledger row that mentions this booking, oldest first. */
  ledger: LedgerEntry[];
  dispute?: Dispute;
  /** True while the job has not finished, been cancelled or been disputed. */
  cancellable: boolean;
}

/** One booking with everything that touches it. Undefined when no booking has that id. */
export async function getBookingDetail(bookingId: string): Promise<BookingDetail | undefined> {
  const state = adminState();
  const booking = state.bookings.find((candidate) => candidate.id === bookingId);
  if (!booking) return respond(undefined);

  const timeline: TimelineNode[] = [];
  for (const event of [...booking.timeline].sort((a, b) => compareIso(a.at, b.at))) {
    timeline.push({ kind: 'event', at: event.at, event, disputed: false });
    if (event.kind === BookingEventKind.ACCEPTED && booking.workerId) {
      timeline.push({ kind: 'route', at: event.at, ...routeFor(booking.id) });
    }
    if (event.kind === BookingEventKind.PAID) {
      timeline.push({ kind: 'split', at: event.at, ...postedSplit(booking.id) });
    }
  }

  return respond({
    booking,
    zoneName: state.zones.find((zone) => zone.id === booking.zoneId)?.name ?? 'Unknown zone',
    customer: state.customers.find((customer) => customer.id === booking.customerId),
    worker: booking.workerId ? state.workers.find((worker) => worker.id === booking.workerId) : undefined,
    timeline,
    ledger: state.ledger
      .filter((entry) => entry.bookingId === booking.id)
      .sort((a, b) => compareIso(a.createdAt, b.createdAt)),
    dispute: state.disputes.find((dispute) => dispute.bookingId === booking.id),
    cancellable: LIVE_STATUSES.has(booking.status),
  });
}

export type CancellationRequester = 'CUSTOMER' | 'WORKER';

/**
 * Cancels a job that has not finished, on someone's behalf.
 *
 * Support cancels because a customer or a worker asked, so the status records whose
 * request it was, and the timeline records that an administrator did it and why. No
 * money has moved on a live job, so nothing is posted to the ledger.
 */
export async function cancelBooking(
  bookingId: string,
  requestedBy: CancellationRequester,
  reason: string,
): Promise<AdminBooking> {
  const state = adminState();
  const booking = state.bookings.find((candidate) => candidate.id === bookingId);
  if (!booking) throw new Error('This booking no longer exists. Go back to the booking log and search again.');
  if (!LIVE_STATUSES.has(booking.status)) {
    throw new Error('Only a job that has not finished can be cancelled. Finished jobs are corrected through a dispute.');
  }
  const trimmed = reason.trim();
  if (trimmed.length < 10) {
    throw new Error('Write a reason of at least a sentence. Both the customer and the worker are shown it.');
  }

  const at = SEED_NOW.toISOString();
  const who = requestedBy === 'CUSTOMER' ? 'the customer' : 'the worker';
  state.updateBooking(bookingId, {
    status: requestedBy === 'CUSTOMER' ? BookingStatus.CANCELLED_BY_CUSTOMER : BookingStatus.CANCELLED_BY_WORKER,
    timeline: [
      ...booking.timeline,
      {
        id: `${bookingId}_cancelled_by_admin`,
        kind: BookingEventKind.CANCELLED,
        at,
        detail: `Cancelled by ${CURRENT_ADMIN.name} at the request of ${who}: ${trimmed}`,
      },
    ],
  });

  return respond(adminState().bookings.find((candidate) => candidate.id === bookingId) as AdminBooking);
}
