import {
  BookingEventKind,
  BookingStatus,
  WORKER_CATEGORIES,
  type AdminBooking,
  type AdminWorker,
  type BookingEvent,
} from '@sahayo/shared';
import { createNameFactory } from './names';
import { SEEDS, createRng, isoAgo } from './rng';
import { ZONE_IDS, getZone } from './zones';

export const BOOKING_COUNT = 900;
export const BOOKING_WINDOW_DAYS = 90;

/**
 * How bookings are distributed across the lifecycle.
 *
 * Heavily weighted to completed, because 90 days of history should look like 90
 * days of a working platform rather than a snapshot of a busy minute. The live
 * statuses are the tail that gives the dispatch queue something to show.
 */
const STATUS_WEIGHTS: ReadonlyArray<{ status: AdminBooking['status']; weight: number }> = [
  { status: BookingStatus.COMPLETED, weight: 68 },
  { status: BookingStatus.SETTLED, weight: 12 },
  { status: BookingStatus.CANCELLED_BY_CUSTOMER, weight: 6 },
  { status: BookingStatus.CANCELLED_BY_WORKER, weight: 3 },
  { status: BookingStatus.EXPIRED_NO_ACCEPT, weight: 2 },
  { status: BookingStatus.IN_PROGRESS, weight: 4 },
  { status: BookingStatus.ACCEPTED, weight: 3 },
  { status: BookingStatus.BROADCAST, weight: 1 },
  { status: BookingStatus.REQUESTED, weight: 1 },
];

/** Statuses where the job ran to the end and money therefore moved. */
const COMPLETED_STATUSES: ReadonlySet<AdminBooking['status']> = new Set([
  BookingStatus.COMPLETED,
  BookingStatus.SETTLED,
]);

/** Statuses where a worker had accepted, so a worker is attached to the row. */
const ASSIGNED_STATUSES: ReadonlySet<AdminBooking['status']> = new Set([
  BookingStatus.ACCEPTED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
  BookingStatus.SETTLED,
  BookingStatus.CANCELLED_BY_WORKER,
  BookingStatus.DISPUTED,
]);

export function isCompletedBooking(booking: AdminBooking): boolean {
  return COMPLETED_STATUSES.has(booking.status);
}

/** Human-readable category label, from the worker's trade. */
function categoryLabel(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

/**
 * The 900 bookings, spread over the 90 days ending at SEED_NOW.
 *
 * Takes the workers so that a booking's worker, zone and category are mutually
 * consistent: a Plumber booking is assigned to a plumber, and it sits in a zone
 * that plumber actually works. Inconsistency there would be visible the moment
 * anyone opened a worker's profile and read their booking list.
 */
export function buildBookings(workers: AdminWorker[]): AdminBooking[] {
  const rng = createRng(SEEDS.bookings);
  const nextCustomerName = createNameFactory(rng);
  const bookings: AdminBooking[] = [];

  /* A pool of repeat customers, so the same household books more than once. */
  const customers = Array.from({ length: 260 }, () => ({
    id: rng.uuid(),
    name: nextCustomerName(),
  }));

  /* Only verified workers can hold a booking — the same rule as the seed above. */
  const assignableWorkers = workers.filter((worker) => worker.kycStatus === 'VERIFIED');

  for (let index = 0; index < BOOKING_COUNT; index += 1) {
    const status = rng.weighted(
      STATUS_WEIGHTS.map((s) => s.status),
      STATUS_WEIGHTS.map((s) => s.weight),
    );

    const isAssigned = ASSIGNED_STATUSES.has(status);
    const worker = isAssigned ? rng.pick(assignableWorkers) : undefined;
    const customer = rng.pick(customers);

    /*
     * A live booking must be recent: a REQUESTED row from 60 days ago is not a
     * plausible state, and the dispatch queue would show it as waiting forever.
     */
    const isLive =
      status === BookingStatus.REQUESTED ||
      status === BookingStatus.BROADCAST ||
      status === BookingStatus.ACCEPTED ||
      status === BookingStatus.IN_PROGRESS;
    const daysAgo = isLive ? 0 : rng.int(1, BOOKING_WINDOW_DAYS - 1);
    /*
     * Negative minutes run backwards from SEED_NOW, and the timeline builder adds
     * minutes as the job progresses. Both branches keep enough headroom that the
     * last event of the longest timeline still lands in the past: a live booking
     * whose "started" event is in the future would show a negative age in the
     * dispatch queue's seconds-since-broadcast counter.
     */
    const minuteOfDay = isLive ? -rng.int(80, 180) : -rng.int(300, 14 * 60);

    /* A booking sits in its worker's zone; an unassigned one sits in any zone. */
    const zoneId = worker ? worker.zoneId : rng.pick(ZONE_IDS);
    const zone = getZone(zoneId);

    /*
     * Jittered around the zone centroid: this is the job's address, not the zone.
     * Rounded to five decimals, roughly a metre, which is finer than any map in
     * the product renders. Unrounded floats also left 12-digit runs in the
     * serialised state, which is noise in every Aadhaar-shaped grep the
     * compliance gates run.
     */
    const coord = (value: number): number =>
      Math.round((value + rng.float(-0.008, 0.008)) * 1e5) / 1e5;
    const location = zone
      ? { lat: coord(zone.centroid.lat), lng: coord(zone.centroid.lng) }
      : { lat: 25.6093, lng: 85.1104 };

    /* ₹250–₹3,200 gross, in paise. Money is never a float here. */
    const amount = rng.int(250, 3200) * 100;

    const createdAt = isoAgo(daysAgo, minuteOfDay);
    const timeline = buildTimeline(rng, status, daysAgo, minuteOfDay, worker?.name);

    const acceptedEvent = timeline.find((event) => event.kind === BookingEventKind.ACCEPTED);
    const completedEvent = timeline.find((event) => event.kind === BookingEventKind.COMPLETED);

    bookings.push({
      id: rng.uuid(),
      reference: `BKG-${String(index + 1).padStart(5, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      workerId: worker?.id,
      workerName: worker?.name,
      category: categoryLabel(worker ? worker.category : rng.pick(WORKER_CATEGORIES)),
      zoneId,
      location,
      status,
      amount,
      createdAt,
      acceptedAt: acceptedEvent?.at,
      completedAt: completedEvent?.at,
      timeline,
    });
  }

  return bookings;
}

/**
 * Reconstructs a booking's life as a list of events.
 *
 * The dispute queue in Phase 7 and the Broadcast Inspector in Phase 4 both read
 * this, and both make claims about *why* something happened — so BROADCAST and
 * PINGED are separate events, and the accepting worker's position in the equity
 * ranking is recorded on ACCEPTED rather than inferred later.
 */
function buildTimeline(
  rng: ReturnType<typeof createRng>,
  status: AdminBooking['status'],
  daysAgo: number,
  minuteOfDay: number,
  workerName: string | undefined,
): BookingEvent[] {
  const events: BookingEvent[] = [];
  let minute = minuteOfDay;

  const push = (
    kind: BookingEvent['kind'],
    detail: string,
    extra: Partial<BookingEvent> = {},
  ): void => {
    events.push({ id: rng.uuid(), kind, at: isoAgo(daysAgo, minute), detail, ...extra });
  };

  push(BookingEventKind.REQUESTED, 'Customer requested this job.');

  if (status === BookingStatus.REQUESTED) return events;

  minute += rng.int(1, 3);
  push(BookingEventKind.BROADCAST, 'Request sent out to available workers nearby.');

  minute += 1;
  const pinged = rng.int(4, 11);
  push(BookingEventKind.PINGED, `Offered to ${pinged} workers, ranked by equity score.`, {
    workersPinged: pinged,
  });

  if (status === BookingStatus.BROADCAST) return events;

  if (status === BookingStatus.EXPIRED_NO_ACCEPT) {
    minute += 30;
    push(BookingEventKind.CANCELLED, 'No worker accepted within the offer window.');
    return events;
  }

  if (status === BookingStatus.CANCELLED_BY_CUSTOMER) {
    minute += rng.int(2, 25);
    push(BookingEventKind.CANCELLED, 'Customer cancelled before a worker accepted.');
    return events;
  }

  minute += rng.int(1, 8);
  const equityRank = rng.int(1, 3);
  push(
    BookingEventKind.ACCEPTED,
    `${workerName ?? 'A worker'} accepted, ranked ${equityRank} of ${pinged} on equity score.`,
    { equityRank },
  );

  if (status === BookingStatus.ACCEPTED) return events;

  if (status === BookingStatus.CANCELLED_BY_WORKER) {
    minute += rng.int(5, 40);
    push(BookingEventKind.CANCELLED, 'Worker cancelled after accepting.');
    return events;
  }

  minute += rng.int(12, 55);
  push(BookingEventKind.STARTED, 'Worker arrived and started the job.');

  if (status === BookingStatus.IN_PROGRESS) return events;

  minute += rng.int(25, 180);
  push(BookingEventKind.COMPLETED, 'Job completed and confirmed by the customer.');

  minute += rng.int(1, 6);
  push(BookingEventKind.PAID, 'Payment split and posted to the ledger.');

  return events;
}
