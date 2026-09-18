import {
  BookingEventKind,
  BookingStatus,
  WORKER_CATEGORY_BY_CATEGORY_ID,
  WORKER_CATEGORY_LABEL,
  type Booking,
  type BookingActor,
  type BookingAddress,
  type BookingEvent,
  type AdminBooking,
  type BookingFare,
  type BookingPaymentRecord,
  type BookingRecord,
  type Id,
} from '@sahayo/shared';
import { publicSummary } from './workers';
import { ZONES } from '@sahayo/shared/seed/zones';
import { EVENT_KIND_FOR, assertTransition } from '../domain/booking-machine';
import { state, type StoredBooking } from '../store';

/** The zone a new booking's admin row sits in: the nearest zone centre to its address. */
function zoneFor(point: { lat: number; lng: number }): Id {
  const distance2 = (zone: (typeof ZONES)[number]): number =>
    (zone.centroid.lat - point.lat) ** 2 + ((zone.centroid.lng - point.lng) * Math.cos((point.lat * Math.PI) / 180)) ** 2;
  return [...ZONES].sort((a, b) => distance2(a) - distance2(b))[0]?.id ?? 'zone-rajendra-nagar';
}

let eventSeq = 0;
const eventId = (bookingId: Id): Id => `${bookingId}-ev${(eventSeq += 1)}`;

export function findById(bookingId: Id): StoredBooking | undefined {
  return state().bookings.get(bookingId);
}

export function eventsFor(bookingId: Id): BookingEvent[] {
  return state().bookingEvents.get(bookingId) ?? [];
}

/** The booking as the mobile apps' shared `Booking` type describes it. */
export function toBooking(stored: StoredBooking): Booking {
  return {
    id: stored.id,
    customerId: stored.customerId,
    ...(stored.workerId ? { workerId: stored.workerId } : {}),
    serviceCategoryId: stored.serviceCategoryId,
    status: stored.status,
    address: stored.address,
    ...(stored.notes ? { notes: stored.notes } : {}),
    ...(stored.scheduledFor ? { scheduledFor: stored.scheduledFor } : {}),
    ...(stored.fare ? { fare: stored.fare } : {}),
    ...(stored.cancellationReason ? { cancellationReason: stored.cancellationReason } : {}),
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  };
}

export function toRecord(stored: StoredBooking): BookingRecord {
  const worker = stored.workerId ? publicSummary(stored.workerId) : undefined;
  return {
    booking: toBooking(stored),
    reference: stored.reference,
    customerName: stored.customerName,
    ...(stored.workerName ? { workerName: stored.workerName } : {}),
    ...(worker ? { worker } : {}),
    ...(stored.payment ? { payment: stored.payment } : {}),
    timeline: eventsFor(stored.id),
  };
}

/** The booking as the admin portal's rows describe it. */
export function toAdminBooking(stored: StoredBooking): AdminBooking {
  const { serviceCategoryId: _s, serviceItemId: _i, address: _a, notes: _n, scheduledFor: _f, fare: _fare, cancellationReason: _c, payment: _p, updatedAt: _u, ...row } = stored;
  return { ...row, timeline: eventsFor(stored.id) };
}

/** Bookings created or moved since the server booted. */
export function changedSinceBoot(): StoredBooking[] {
  return [...state().changedBookingIds].map((id) => state().bookings.get(id)).filter((booking): booking is StoredBooking => Boolean(booking));
}

/** Records the customer's payment for a finished job. Paying twice is refused by the caller, not here. */
export function recordPayment(bookingId: Id, payment: BookingPaymentRecord): StoredBooking {
  const current = findById(bookingId);
  if (!current) throw new Error(`No booking ${bookingId}`);
  const next: StoredBooking = { ...current, payment, updatedAt: payment.paidAt };
  state().bookings.set(bookingId, next);
  state().changedBookingIds.add(bookingId);
  appendEvent(bookingId, {
    kind: BookingEventKind.PAID,
    at: payment.paidAt,
    detail: `Customer paid by ${payment.method.toUpperCase()}.`,
    actor: { role: 'CUSTOMER', id: current.customerId },
  });
  return next;
}

/** Appends one event to a booking's history. History is only ever appended to. */
export function appendEvent(bookingId: Id, event: Omit<BookingEvent, 'id' | 'at'> & { at?: string }): BookingEvent {
  const full: BookingEvent = { id: eventId(bookingId), at: event.at ?? new Date().toISOString(), ...event };
  const events = state().bookingEvents.get(bookingId) ?? [];
  events.push(full);
  state().bookingEvents.set(bookingId, events);
  return full;
}

function nextReference(): string {
  let highest = 0;
  for (const booking of state().bookings.values()) {
    const n = Number(booking.reference.slice(4));
    if (n > highest) highest = n;
  }
  return `BKG-${String(highest + 1).padStart(5, '0')}`;
}

export interface CreateBookingInput {
  customerId: Id;
  customerName: string;
  serviceItemId: Id;
  serviceCategoryId: Id;
  workerTypeId: Id;
  address: BookingAddress;
  notes?: string;
  scheduledFor?: string;
  fare: BookingFare;
}

/**
 * The id of the next booking made on this server: `bkg_live_01`, `_02`, and so on.
 *
 * Counted rather than drawn from the clock and a random suffix, because the id decides
 * the booking's start code (`startCodeFor`), and a demo rehearsed with one code and given
 * with another is a demo where the code has to be read off a screen mid-sentence. After
 * `demo:reset` the first booking is `bkg_live_01` again, with the code that goes with it.
 */
function nextBookingId(): Id {
  const bookings = state().bookings;
  for (let n = bookings.size + 1; ; n += 1) {
    const id = `bkg_live_${String(n).padStart(2, '0')}`;
    if (!bookings.has(id)) return id;
  }
}

/** A new booking in REQUESTED, with its first event. */
export function create(input: CreateBookingInput): StoredBooking {
  const now = new Date().toISOString();
  const id = nextBookingId();
  const trade = WORKER_CATEGORY_BY_CATEGORY_ID[input.workerTypeId];
  const stored: StoredBooking = {
    id,
    reference: nextReference(),
    customerId: input.customerId,
    customerName: input.customerName,
    category: trade ? WORKER_CATEGORY_LABEL[trade] : 'Service',
    zoneId: zoneFor(input.address.point),
    location: input.address.point,
    status: BookingStatus.REQUESTED,
    amount: input.fare.total,
    createdAt: now,
    serviceCategoryId: input.serviceCategoryId,
    serviceItemId: input.serviceItemId,
    address: input.address,
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}),
    fare: input.fare,
    updatedAt: now,
  };
  state().bookings.set(id, stored);
  state().changedBookingIds.add(id);
  appendEvent(id, {
    kind: BookingEventKind.REQUESTED,
    at: now,
    detail: 'Customer requested this job.',
    actor: { role: 'CUSTOMER', id: input.customerId },
    status: BookingStatus.REQUESTED,
  });
  return stored;
}

export interface TransitionExtra {
  /** Set when moving to ACCEPTED. */
  worker?: { id: Id; name: string };
  cancellationReason?: string;
  detail?: string;
  equityRank?: number;
}

/**
 * Moves a booking to `to`, checked against the state machine, and records who did it
 * and when. Throws IllegalTransitionError for a move the machine does not allow.
 */
export function transition(bookingId: Id, to: BookingStatus, actor: BookingActor, extra: TransitionExtra = {}): StoredBooking {
  const current = findById(bookingId);
  if (!current) throw new Error(`No booking ${bookingId}`);
  assertTransition(current.status, to, actor.role);

  const at = new Date().toISOString();
  const next: StoredBooking = {
    ...current,
    status: to,
    updatedAt: at,
    ...(extra.worker ? { workerId: extra.worker.id, workerName: extra.worker.name } : {}),
    ...(to === BookingStatus.ACCEPTED ? { acceptedAt: at } : {}),
    ...(to === BookingStatus.COMPLETED ? { completedAt: at } : {}),
    ...(extra.cancellationReason ? { cancellationReason: extra.cancellationReason } : {}),
  };
  state().bookings.set(bookingId, next);
  state().changedBookingIds.add(bookingId);
  appendEvent(bookingId, {
    kind: EVENT_KIND_FOR[to],
    at,
    detail: extra.detail ?? `Moved from ${current.status} to ${to}.`,
    actor,
    status: to,
    ...(extra.equityRank ? { equityRank: extra.equityRank } : {}),
  });
  return next;
}

export function listForCustomer(customerId: Id): StoredBooking[] {
  return [...state().bookings.values()]
    .filter((booking) => booking.customerId === customerId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function listForWorker(workerId: Id): StoredBooking[] {
  return [...state().bookings.values()]
    .filter((booking) => booking.workerId === workerId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Bookings in any of `statuses`. */
export function listByStatus(statuses: ReadonlySet<BookingStatus>): StoredBooking[] {
  return [...state().bookings.values()].filter((booking) => statuses.has(booking.status));
}

export function list(): StoredBooking[] {
  return [...state().bookings.values()];
}
