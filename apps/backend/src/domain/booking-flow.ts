import {
  BookingStatus,
  DEFAULT_RADIUS_M,
  GST_RATE,
  KycStatus,
  ServerEvent,
  START_CODE_LENGTH,
  startCodeFor,
  type BookingRecord,
  type CreateBookingRequest,
  type CreateBookingResult,
  type FareQuote,
  type KycDecisionRequest,
  type PaymentRequest,
  type QuoteRequest,
  type TransitionRequest,
} from '@sahayo/shared';
import type { Dispatcher } from '../dispatch/dispatcher';
import { haversineM } from '../lib/geo';
import { HttpError, notFound } from '../lib/http';
import { quoteFare } from '../pricing/fare';
import { weatherProvider } from '../pricing/weather';
import * as bookings from '../repositories/bookings';
import * as catalogue from '../repositories/catalogue';
import * as ledger from '../repositories/ledger';
import * as users from '../repositories/users';
import * as workers from '../repositories/workers';
import { emitBookingUpdated, emitToAdmins, emitToBookingRoom, emitToWorker, joinBookingRoom } from '../sockets/realtime';
import { IllegalTransitionError, ON_JOB_STATUSES } from './booking-machine';

/**
 * What happens to a booking, in one place: pricing it, creating it, dispatching it, and
 * every move after that with its consequences — the ledger split on completion, a
 * worker marked busy or free, the booking's room told.
 *
 * Routes and socket handlers call these and nothing lower, so the rules cannot differ
 * between the REST path and the realtime one.
 */

const OPEN_REQUEST_STATUSES = new Set([BookingStatus.REQUESTED, BookingStatus.BROADCAST]);

/** Prices a job at a point, now or ahead of time. */
export async function quote(request: QuoteRequest): Promise<FareQuote> {
  const item = catalogue.findItem(request.serviceItemId);
  if (!item) throw notFound('service item', request.serviceItemId);
  const categoryId = catalogue.workerTypeFor(item.id);
  if (!categoryId) throw new HttpError(422, 'UNKNOWN_WORKER_TYPE', `${item.name} is not under any worker type, so it cannot be priced or offered.`);
  if (item.mode === 'quote') {
    throw new HttpError(422, 'NEEDS_SURVEY', `${item.name} is priced after a free survey, not booked at a fixed price. Schedule a survey instead.`);
  }

  const freeWorkers = workers.findCandidates(request.point.lat, request.point.lng, DEFAULT_RADIUS_M, categoryId).length;
  const openRequests = bookings
    .listByStatus(OPEN_REQUEST_STATUSES)
    .filter((booking) => haversineM(booking.location, request.point) <= DEFAULT_RADIUS_M).length;

  return quoteFare({
    item,
    scheduled: Boolean(request.scheduledFor),
    weather: await weatherProvider.current(request.point),
    openRequests,
    freeWorkers,
  });
}

/** Creates a booking at the server's price, tells its room, and starts dispatching it. */
export async function createBooking(request: CreateBookingRequest, dispatcher: Dispatcher): Promise<CreateBookingResult> {
  const customer = users.findCustomer(request.customerId);
  if (!customer) throw notFound('customer', request.customerId);
  if (customer.status === 'SUSPENDED') {
    throw new HttpError(403, 'CUSTOMER_SUSPENDED', 'This account is suspended and cannot book. The cooperative office can explain why.');
  }

  if (request.scheduledFor && Date.parse(request.scheduledFor) <= Date.now()) {
    throw new HttpError(422, 'SLOT_IN_PAST', 'That time has already passed. Pick a later slot.');
  }

  /* The client's idea of the price is never trusted: the server prices every booking itself. */
  const fare = await quote({ serviceItemId: request.serviceItemId, point: request.address.point, scheduledFor: request.scheduledFor });
  const item = catalogue.findItem(request.serviceItemId)!;
  const stored = bookings.create({
    customerId: customer.id,
    customerName: customer.name,
    serviceItemId: item.id,
    serviceCategoryId: item.subCategoryId,
    workerTypeId: catalogue.workerTypeFor(item.id)!,
    address: request.address,
    notes: request.notes,
    scheduledFor: request.scheduledFor,
    fare: { total: fare.itemTotal, workerShare: fare.workerShare, platformShare: fare.platformShare, coopFundShare: fare.coopFundShare },
  });

  joinBookingRoom([customer.id], stored.id);
  emitBookingUpdated(stored);
  dispatcher.start(stored.id);
  return { record: bookings.toRecord(bookings.findById(stored.id)!), fare };
}

/**
 * Applies one move requested over REST, with every check the machine does not know
 * about: that the actor is the booking's own worker or customer, that the start code
 * is right, and that accepting goes through the dispatcher rather than around it.
 */
export function applyTransition(bookingId: string, request: TransitionRequest, dispatcher: Dispatcher): BookingRecord {
  const booking = bookings.findById(bookingId);
  if (!booking) throw notFound('booking', bookingId);
  const { actor, to } = request;

  if (actor.role === 'SYSTEM') throw new HttpError(403, 'SYSTEM_ONLY', 'Only the server itself acts as SYSTEM.');
  if (to === BookingStatus.ACCEPTED) {
    throw new HttpError(409, 'ACCEPT_OVER_SOCKET', 'Offers are accepted with gig:accept on the socket, where the first accept wins. Not over REST.');
  }
  if (actor.role === 'WORKER' && actor.id !== booking.workerId) {
    throw new HttpError(403, 'NOT_YOUR_BOOKING', `Worker ${actor.id ?? '(none)'} is not assigned to ${booking.reference}.`);
  }
  if (actor.role === 'CUSTOMER' && actor.id !== booking.customerId) {
    throw new HttpError(403, 'NOT_YOUR_BOOKING', `${booking.reference} belongs to another customer.`);
  }
  if (to === BookingStatus.IN_PROGRESS && booking.status === BookingStatus.ARRIVED) {
    if (!request.startCode || request.startCode.length !== START_CODE_LENGTH) {
      throw new HttpError(422, 'START_CODE_REQUIRED', 'Ask the customer for the four-digit start code shown in their app, then try again.');
    }
    if (request.startCode !== startCodeFor(booking.id)) {
      throw new HttpError(422, 'WRONG_START_CODE', 'That start code does not match. Ask the customer to read it out again from their app.');
    }
  }

  let next;
  try {
    next = bookings.transition(bookingId, to, actor, {
      ...(request.reason ? { cancellationReason: request.reason } : {}),
      detail: describe(to, booking.workerName, request.reason),
    });
  } catch (error) {
    if (error instanceof IllegalTransitionError) throw new HttpError(409, 'ILLEGAL_TRANSITION', error.message);
    throw error;
  }

  /* Consequences. */
  if (next.workerId) {
    if (ON_JOB_STATUSES.has(to)) workers.setOnJob(next.workerId, true);
    else workers.setOnJob(next.workerId, false);
  }
  if (to === BookingStatus.CANCELLED_BY_CUSTOMER || to === BookingStatus.EXPIRED_NO_ACCEPT) dispatcher.withdraw(bookingId);
  if (to === BookingStatus.COMPLETED) {
    const rows = ledger.appendSplit(next);
    const fundRow = rows.find((row) => row.type === 'COOP_FUND_CONTRIBUTION');
    const balance = ledger.coopFundTotal();
    /* The finale: the admin portal's Finance page gets the three rows, and the fund total moves. */
    emitToAdmins(ServerEvent.LEDGER_APPENDED, { bookingId, reference: next.reference, entries: rows, fundBalance: balance, at: new Date().toISOString() });
    if (fundRow) {
      const payload = { cooperativeId: COOPERATIVE_ID, balance, delta: fundRow.amount, bookingId, at: fundRow.createdAt };
      emitToBookingRoom(bookingId, ServerEvent.COOP_FUND_UPDATED, payload);
      emitToAdmins(ServerEvent.COOP_FUND_UPDATED, payload);
    }
  }
  emitBookingUpdated(next);
  return bookings.toRecord(next);
}

/**
 * The customer pays for a finished job. Recorded on the booking, with a PAID event; the
 * status stays COMPLETED, because SETTLED means the worker's payout has been released.
 * The ledger split was already posted when the job completed.
 */
export function recordPayment(bookingId: string, request: PaymentRequest): BookingRecord {
  const booking = bookings.findById(bookingId);
  if (!booking) throw notFound('booking', bookingId);
  if (booking.customerId !== request.customerId) {
    throw new HttpError(403, 'NOT_YOUR_BOOKING', `${booking.reference} belongs to another customer.`);
  }
  if (booking.status !== BookingStatus.COMPLETED && booking.status !== BookingStatus.SETTLED) {
    throw new HttpError(409, 'NOT_FINISHED', `${booking.reference} is ${booking.status}. A job is paid for once the worker has completed it.`);
  }
  if (booking.payment) {
    throw new HttpError(409, 'ALREADY_PAID', `${booking.reference} was already paid by ${booking.payment.method.toUpperCase()}. Nothing more is owed.`);
  }
  const itemTotal = booking.fare?.total ?? booking.amount;
  const paid = bookings.recordPayment(bookingId, {
    method: request.method,
    amount: itemTotal + Math.round(itemTotal * GST_RATE),
    ...(request.transactionId ? { transactionId: request.transactionId } : {}),
    paidAt: new Date().toISOString(),
  });
  emitBookingUpdated(paid);
  return bookings.toRecord(paid);
}

/** An administrator's verification decision, pushed to the worker's app the moment it is made. */
export function decideKyc(workerId: string, request: KycDecisionRequest) {
  if (!workers.findById(workerId)) throw notFound('worker', workerId);
  const status = request.status === 'VERIFIED' ? KycStatus.VERIFIED : KycStatus.REJECTED;
  const worker = workers.setKycStatus(workerId, status);
  const payload = { workerId, kycStatus: status, at: new Date().toISOString() };
  emitToWorker(workerId, ServerEvent.WORKER_KYC_UPDATED, payload);
  emitToAdmins(ServerEvent.WORKER_KYC_UPDATED, payload);
  return worker;
}

/** Every worker in this demo belongs to the one cooperative the fund is kept for. */
const COOPERATIVE_ID = 'coop_patna_central';

function describe(to: BookingStatus, workerName: string | undefined, reason: string | undefined): string {
  const who = workerName ?? 'The worker';
  switch (to) {
    case BookingStatus.EN_ROUTE:
      return `${who} set off for the job.`;
    case BookingStatus.ARRIVED:
      return `${who} arrived.`;
    case BookingStatus.IN_PROGRESS:
      return `${who} arrived and started the job with the customer's start code.`;
    case BookingStatus.COMPLETED:
      return 'Job completed. Payment split and posted to the ledger.';
    case BookingStatus.SETTLED:
      return 'Payout released to the worker.';
    case BookingStatus.CANCELLED_BY_CUSTOMER:
      return `Customer cancelled${reason ? `: ${reason}` : '.'}`;
    case BookingStatus.CANCELLED_BY_WORKER:
      return `Worker cancelled after accepting${reason ? `: ${reason}` : '.'}`;
    case BookingStatus.DISPUTED:
      return `A dispute was raised${reason ? `: ${reason}` : '.'}`;
    default:
      return `Moved to ${to}.`;
  }
}
