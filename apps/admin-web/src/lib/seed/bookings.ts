import {
  BookingEventKind,
  BookingStatus,
  WORKER_CATEGORIES,
  type AdminBooking,
  type AdminWorker,
  type BookingEvent,
} from '@sahayo/shared';
import { createNameFactory } from './names';
import { SEEDS, SEED_NOW, createRng, isoAgo } from './rng';
import { ZONE_IDS, getZone } from './zones';

/**
 * About 12,000 jobs over the 90-day window, roughly 133 a day.
 *
 * Sized to agree with the workers' own figures. At the earlier 900, the cohort's
 * lifetime job counts and this week's job counts implied about thirteen times more
 * work than the bookings showed, so the same platform looked busy on a worker's profile
 * and nearly idle in the booking log — and the fund's growth chart showed monthly
 * contributions collapsing the moment the booking window began.
 */
export const BOOKING_COUNT = 12000;
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
  /*
    * The live tail is deliberately tiny — about five open jobs.
    *
    * Every live booking is pinned to "now", so the tail lands entirely on today
    * and inflates today's count against every other day. At a dozen it pushed
    * "jobs booked today" to three times the daily average, which reads as a bug
    * rather than as a busy morning.
    *
    * Five is also enough: the dispatch page has a "Simulate incoming request"
    * action, so the queue is meant to be filled on stage rather than pre-stuffed.
    */
  { status: BookingStatus.IN_PROGRESS, weight: 0.07 },
  { status: BookingStatus.ACCEPTED, weight: 0.05 },
  { status: BookingStatus.BROADCAST, weight: 0.03 },
  { status: BookingStatus.REQUESTED, weight: 0.02 },
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

const STATUSES = STATUS_WEIGHTS.map((s) => s.status);
const STATUS_WEIGHT_VALUES = STATUS_WEIGHTS.map((s) => s.weight);

/*
 * When in the day people book, by hour in India Standard Time, from 07:00 to 20:00.
 *
 * Inside the service hours set in Settings (07:00 to 21:00), with a morning peak before
 * work and a second one in the early evening, the way household jobs are actually
 * booked. An earlier version counted minutes back from SEED_NOW and put every booking
 * between 2 and 11 in the morning, which the analytics heatmap made plain.
 */
const BOOKING_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;
const BOOKING_HOUR_WEIGHTS = [3, 6, 8, 8, 7, 6, 5, 5, 6, 7, 8, 7, 5, 3] as const;

/** SEED_NOW is 16:00 IST, so an IST hour is this many minutes from it. */
const SEED_NOW_IST_HOUR = 16;

/**
 * A day and time for a past job: days back from SEED_NOW, and minutes from SEED_NOW's
 * time of day.
 *
 * Every day, today included, draws from the same hourly pattern. A time today that has
 * not come yet (after 16:00) belongs to a day that has not finished, so that booking is
 * moved to another day in the window instead. Today therefore holds exactly the share of
 * a day that has happened, and the rolling 24-hour count reads as one ordinary day.
 */
function pastBookingTime(rng: ReturnType<typeof createRng>): { daysAgo: number; minuteOfDay: number } {
  let daysAgo = rng.int(0, BOOKING_WINDOW_DAYS - 1);
  const hour = rng.weighted(BOOKING_HOURS, BOOKING_HOUR_WEIGHTS);
  if (daysAgo === 0 && hour >= SEED_NOW_IST_HOUR) daysAgo = rng.int(1, BOOKING_WINDOW_DAYS - 1);
  return { daysAgo, minuteOfDay: (hour - SEED_NOW_IST_HOUR) * 60 + rng.int(0, 59) };
}

/** The status a job is in when its timeline is cut off at the event it last reached. */
const STATUS_AT_EVENT: Partial<Record<string, AdminBooking['status']>> = {
  [BookingEventKind.REQUESTED]: BookingStatus.REQUESTED,
  [BookingEventKind.BROADCAST]: BookingStatus.BROADCAST,
  [BookingEventKind.PINGED]: BookingStatus.BROADCAST,
  [BookingEventKind.ACCEPTED]: BookingStatus.ACCEPTED,
  [BookingEventKind.STARTED]: BookingStatus.IN_PROGRESS,
  [BookingEventKind.COMPLETED]: BookingStatus.COMPLETED,
};

export function isCompletedBooking(booking: AdminBooking): boolean {
  return COMPLETED_STATUSES.has(booking.status);
}

/** Human-readable category label, from the worker's trade. */
function categoryLabel(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

/**
 * The bookings, spread over the 90 days ending at SEED_NOW.
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

  /*
   * A pool of repeat customers, so the same household books more than once — about six
   * times in 90 days on average, which is a regular household rather than a business.
   */
  const customers = Array.from({ length: 2000 }, () => ({
    id: rng.uuid(),
    name: nextCustomerName(),
  }));

  /* Only verified workers can hold a booking — the same rule as the seed above. */
  const assignableWorkers = workers.filter((worker) => worker.kycStatus === 'VERIFIED');
  const workerWeights = assignableWorkers.map((worker) => worker.jobsThisWeek + 1);

  for (let index = 0; index < BOOKING_COUNT; index += 1) {
    const drawnStatus = rng.weighted(STATUSES, STATUS_WEIGHT_VALUES);

    const isAssigned = ASSIGNED_STATUSES.has(drawnStatus);
    /*
     * Weighted by how much work each worker is getting this week, so a worker's booking
     * history agrees with the jobs-this-week figure on their profile. Uniform assignment
     * gave an under-allocated worker as many recent jobs as the busiest one.
     */
    const drawnWorker = isAssigned ? rng.weighted(assignableWorkers, workerWeights) : undefined;
    const customer = rng.pick(customers);

    /*
     * A live booking must be recent: a REQUESTED row from 60 days ago is not a
     * plausible state, and the dispatch queue would show it as waiting forever.
     */
    const isLive =
      drawnStatus === BookingStatus.REQUESTED ||
      drawnStatus === BookingStatus.BROADCAST ||
      drawnStatus === BookingStatus.ACCEPTED ||
      drawnStatus === BookingStatus.IN_PROGRESS;
    const past = isLive ? undefined : pastBookingTime(rng);
    const daysAgo = past ? past.daysAgo : 0;
    /*
     * Negative minutes run backwards from SEED_NOW, and the timeline builder adds
     * minutes as the job progresses. Both branches keep enough headroom that the
     * last event of the longest timeline still lands in the past: a live booking
     * whose "started" event is in the future would show a negative age in the
     * dispatch queue's seconds-since-broadcast counter.
     */
    const minuteOfDay = past ? past.minuteOfDay : -rng.int(80, 180);

    /* A booking sits in its worker's zone; an unassigned one sits in any zone. */
    const zoneId = drawnWorker ? drawnWorker.zoneId : rng.pick(ZONE_IDS);
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
    const fullTimeline = buildTimeline(rng, drawnStatus, daysAgo, minuteOfDay, drawnWorker?.name);

    /*
     * A job requested this afternoon has not had time to finish. Its timeline is cut at
     * the present, and it takes the status of the last thing that has happened — offered
     * out, accepted or under way — so the day's bookings run right up to SEED_NOW without
     * any event landing in the future. Before this, today's jobs were squeezed into the
     * morning, and the rolling 24-hour count read far above the daily average.
     */
    const cutoff = SEED_NOW.toISOString();
    const timeline = fullTimeline.filter((event) => event.at <= cutoff);
    const truncated = timeline.length < fullTimeline.length;
    const lastKind = timeline[timeline.length - 1]?.kind;
    const status = truncated ? (lastKind ? STATUS_AT_EVENT[lastKind] : undefined) ?? BookingStatus.REQUESTED : drawnStatus;
    const worker = ASSIGNED_STATUSES.has(status) ? drawnWorker : undefined;

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
