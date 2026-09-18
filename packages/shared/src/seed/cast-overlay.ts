import {
  BookingEventKind,
  BookingStatus,
  CustomerStatus,
  CustomerType,
  DisputeAuthor,
  KycStatus,
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  WORKER_CATEGORY_BY_CATEGORY_ID,
  WORKER_CATEGORY_LABEL,
  WorkerAvailability,
  subCategoriesByCategoryId,
  type AdminBooking,
  type AdminCustomer,
  type AdminWorker,
  type Booking,
  type BookingEvent,
  type GeoPoint,
  type LedgerEntry,
  type User,
  type WorkerCategory,
} from '../index';
import {
  buildCustomerCastBookings,
  buildWorkerCastBookings,
  castCustomers,
  castPlaces,
  castWorkers,
  createAnchoredClock,
  demoPartner,
  type CastWorker,
} from './cast';
import { DAY_MS, SEED_NOW, compareIso } from './clock';
import { RELEASE_AFTER_DAYS, splitAmount } from './ledger';
import { unusedName } from './names';
import { ZONES } from './zones';
import type { SeedDataset } from './index';

/**
 * Lays the demo cast over the generated dataset.
 *
 * The mobile apps are demonstrated with named people — Ramesh Kumar on the customer's
 * map, Suresh Yadav signed in on the worker's phone — and the admin portal with 140
 * generated members and 12,000 generated jobs. For all three to show one platform,
 * the named people have to BE records in the generated data, under the ids the apps
 * already use. This module makes them so, in two passes.
 *
 * Workers, before any booking is generated. Each cast worker takes over a generated
 * member with the same verification status — and, where the cohort allows, the same
 * trade and the same online state — keeping the cast's id, name, phone, trades,
 * position and availability and the member's ratings, job counts, earnings and equity
 * inputs. No seeded stream reads a worker's identity, trade or zone, so everything
 * generated afterwards draws exactly the numbers it always drew; the member's jobs
 * simply follow them to their new name and zone.
 *
 * Customers and hand-written bookings, after the dataset is built. The dispute and
 * ledger builders sample from bookings in an order that depends on their status and
 * age, so changing a booking before them would reshuffle which jobs are disputed.
 * Instead each cast customer takes over a generated household, and each hand-written
 * booking takes over a generated booking of the same kind — finished, live or called
 * off — that nobody disputed, nobody reversed, and whose payout is on the same side of
 * the release cutoff. Its ledger rows are rewritten to its own amount and date, and
 * the fund's carried-over history absorbs the difference, so the fund's balance is
 * unchanged to the paisa.
 *
 * Deterministic: every choice is a pure function of the generated data.
 */

/* ------------------------------------------------------------------ */
/* shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** `+919431012845` as the portal writes it: `+91 94310 12845`. */
function displayPhone(e164: string): string {
  const digits = e164.replace(/^\+91/, '');
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** The zone a point falls in — the smallest zone box containing it, else the nearest centroid. */
function zoneFor(point: GeoPoint): string {
  const containing = ZONES.filter(
    (zone) =>
      point.lat >= zone.bounds.south &&
      point.lat <= zone.bounds.north &&
      point.lng >= zone.bounds.west &&
      point.lng <= zone.bounds.east,
  ).sort(
    (a, b) =>
      (a.bounds.north - a.bounds.south) * (a.bounds.east - a.bounds.west) -
      (b.bounds.north - b.bounds.south) * (b.bounds.east - b.bounds.west),
  );
  if (containing[0]) return containing[0].id;
  const squared = (zone: (typeof ZONES)[number]): number =>
    (zone.centroid.lat - point.lat) ** 2 + ((zone.centroid.lng - point.lng) * Math.cos((point.lat * Math.PI) / 180)) ** 2;
  return [...ZONES].sort((a, b) => squared(a) - squared(b))[0]!.id;
}

function tradeOf(worker: CastWorker): WorkerCategory {
  const trade = WORKER_CATEGORY_BY_CATEGORY_ID[worker.profile.serviceCategoryIds[0] ?? ''];
  if (!trade) throw new Error(`cast worker ${worker.profile.id} has no known primary worker type`);
  return trade;
}

/** Every name the cast holds. A generated worker or customer may not share one. */
const CAST_NAMES: ReadonlySet<string> = new Set([
  ...castWorkers.map((worker) => worker.user.name),
  ...castCustomers.map((customer) => customer.name),
]);

/* ------------------------------------------------------------------ */
/* pass 1: workers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Gives 49 generated members the cast's identities, and renames any other member whose
 * name the cast has claimed. Returns a new array; the input is not modified.
 */
export function layCastOverWorkers(generated: AdminWorker[]): AdminWorker[] {
  const workers = generated.map((worker) => ({ ...worker }));
  const claimed = new Set<number>();

  for (const cast of castWorkers) {
    const trade = tradeOf(cast);
    const online = cast.profile.availability !== WorkerAvailability.OFFLINE;
    if (online && cast.profile.kycStatus !== KycStatus.VERIFIED) {
      throw new Error(`cast worker ${cast.profile.id} is online without being verified`);
    }

    /* Same verification always; then same trade and online state, then either, then neither. */
    const open = workers
      .map((worker, index) => ({ worker, index }))
      .filter(({ worker, index }) => !claimed.has(index) && worker.kycStatus === cast.profile.kycStatus);
    /*
     * The worker app's partner takes over a member with almost no work this week. He is
     * who a live offer reaches on stage, and a quiet member being offered the job ahead
     * of busier, nearer ones is the claim the demo exists to show.
     */
    const isDemoPartner = cast.profile.id === demoPartner.profile.id;
    const preference = [
      ...(isDemoPartner ? [({ worker }: { worker: AdminWorker }) => worker.jobsThisWeek <= 2 && worker.isOnline === online] : []),
      ({ worker }: { worker: AdminWorker }) => worker.category === trade && worker.isOnline === online,
      ({ worker }: { worker: AdminWorker }) => worker.isOnline === online,
      ({ worker }: { worker: AdminWorker }) => worker.category === trade,
      () => true,
    ];
    const target = preference.map((accept) => open.find(accept)).find(Boolean);
    if (!target) throw new Error(`no generated member left for cast worker ${cast.profile.id}`);
    claimed.add(target.index);

    const location = cast.profile.lastLocation;
    if (!location) throw new Error(`cast worker ${cast.profile.id} has no lastLocation`);

    workers[target.index] = {
      ...target.worker,
      id: cast.profile.id,
      name: cast.user.name,
      phone: displayPhone(cast.user.phone),
      category: trade,
      serviceCategoryIds: [...cast.profile.serviceCategoryIds],
      zoneId: zoneFor(location),
      location,
      isOnline: online,
      isOnJob: cast.profile.availability === WorkerAvailability.ON_JOB,
    };
  }

  const taken = new Set([...CAST_NAMES, ...workers.map((worker) => worker.name)]);
  workers.forEach((worker, index) => {
    if (claimed.has(index) || !CAST_NAMES.has(worker.name)) return;
    const name = unusedName(taken, worker.id);
    taken.add(name);
    workers[index] = { ...worker, name };
  });

  return workers;
}

/* ------------------------------------------------------------------ */
/* pass 2: customers and hand-written bookings                         */
/* ------------------------------------------------------------------ */

/** A new email for a renamed account, keeping the number the old one carried. */
function emailFor(name: string, previous: string | undefined): string | undefined {
  if (!previous) return undefined;
  const [given = 'customer', surname = ''] = name.split(' ');
  const digits = /(\d+)@/.exec(previous)?.[1] ?? '';
  return `${given}.${surname}${digits}@example.in`.toLowerCase();
}

const LIVE: ReadonlySet<string> = new Set([
  BookingStatus.REQUESTED,
  BookingStatus.BROADCAST,
  BookingStatus.ACCEPTED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
]);
const FINISHED: ReadonlySet<string> = new Set([BookingStatus.COMPLETED, BookingStatus.SETTLED]);

type Kind = 'LIVE' | 'FINISHED' | 'ENDED';
const kindOf = (status: string): Kind => (LIVE.has(status) ? 'LIVE' : FINISHED.has(status) ? 'FINISHED' : 'ENDED');

const MINUTE = 60_000;
const plus = (iso: string, minutes: number): string => new Date(Date.parse(iso) + minutes * MINUTE).toISOString();

/** The worker type a sub-category sits under, for a booking with no worker to take a trade from. */
function tradeOfService(serviceCategoryId: string): WorkerCategory | undefined {
  for (const [categoryId, subs] of Object.entries(subCategoriesByCategoryId)) {
    if (subs.some((sub) => sub.id === serviceCategoryId)) return WORKER_CATEGORY_BY_CATEGORY_ID[categoryId];
  }
  return undefined;
}

/**
 * The admin-side timeline for a hand-written booking, from the facts the booking
 * itself carries: when it was made, when it was scheduled for, when it last changed,
 * and the status it reached. Nothing lands after SEED_NOW.
 */
function timelineFor(booking: Booking, workerName: string | undefined): BookingEvent[] {
  const events: BookingEvent[] = [];
  const push = (kind: BookingEvent['kind'], at: string, detail: string, extra: Partial<BookingEvent> = {}): void => {
    events.push({ id: `${booking.id}-${kind.toLowerCase()}`, kind, at, detail, ...extra });
  };
  const created = booking.createdAt;
  const status = booking.status;

  push(BookingEventKind.REQUESTED, created, 'Customer requested this job.');
  push(BookingEventKind.BROADCAST, plus(created, 1), 'Request sent out to available workers nearby.');
  push(BookingEventKind.PINGED, plus(created, 2), 'Offered to 6 workers, ranked by equity score.', { workersPinged: 6 });

  if (!booking.workerId) {
    if (status === BookingStatus.CANCELLED_BY_WORKER) {
      push(BookingEventKind.CANCELLED, booking.updatedAt, 'The worker who took the job had to cancel it.');
    } else if (kindOf(status) === 'ENDED') {
      push(BookingEventKind.CANCELLED, booking.updatedAt, 'Customer cancelled before a worker accepted.');
    }
    return events;
  }

  const accepted = plus(created, 6);
  push(BookingEventKind.ACCEPTED, accepted, `${workerName ?? 'A worker'} accepted, ranked 1 of 6 on equity score.`, { equityRank: 1 });

  if (status === BookingStatus.CANCELLED_BY_CUSTOMER || status === BookingStatus.CANCELLED_BY_WORKER) {
    const at = booking.updatedAt > accepted ? booking.updatedAt : plus(accepted, 30);
    push(
      BookingEventKind.CANCELLED,
      at,
      status === BookingStatus.CANCELLED_BY_WORKER ? 'Worker cancelled after accepting.' : 'Customer cancelled after a worker accepted.',
    );
    return events;
  }
  if (status === BookingStatus.ACCEPTED || status === BookingStatus.EN_ROUTE || status === BookingStatus.ARRIVED) {
    return events;
  }

  const started = booking.scheduledFor && booking.scheduledFor > accepted ? booking.scheduledFor : plus(created, 45);
  if (status === BookingStatus.IN_PROGRESS) {
    push(BookingEventKind.STARTED, booking.updatedAt > accepted ? booking.updatedAt : started, 'Worker arrived and started the job.');
    return events;
  }

  push(BookingEventKind.STARTED, started, 'Worker arrived and started the job.');
  const completed = booking.updatedAt > plus(started, 20) ? booking.updatedAt : plus(started, 60);
  push(BookingEventKind.COMPLETED, completed, 'Job completed and confirmed by the customer.');
  push(BookingEventKind.PAID, plus(completed, 2), 'Payment split and posted to the ledger.');
  return events;
}

function fundBalance(ledger: LedgerEntry[]): number {
  return ledger
    .filter((entry) => entry.account === LedgerAccount.COOP_FUND)
    .reduce((sum, entry) => sum + (entry.direction === LedgerDirection.CREDIT ? entry.amount : -entry.amount), 0);
}

/**
 * Gives 13 generated households the cast customers' identities, renames any other
 * customer whose name the cast has claimed, and lays the 22 hand-written bookings over
 * generated ones. Returns a new dataset; the input is not modified.
 */
export function layCastOverDataset(generated: SeedDataset): SeedDataset {
  const workersById = new Map(generated.workers.map((worker) => [worker.id, worker]));
  const fundBefore = fundBalance(generated.ledger);

  /*
   * Copy on write: a record that changes is replaced by a new object, and everything
   * else is shared with the input. Copying all 41,000 ledger rows to change seventy
   * cost more than building the ledger did.
   */
  let customers: AdminCustomer[] = generated.customers;
  let bookings: AdminBooking[] = generated.bookings;
  let disputes = generated.disputes;
  const ledger: LedgerEntry[] = [...generated.ledger];

  const disputedBookings = new Set(disputes.map((dispute) => dispute.bookingId));
  const disputedCustomers = new Set(disputes.map((dispute) => dispute.customerId));
  const bookingCount = new Map<string, number>();
  for (const booking of bookings) bookingCount.set(booking.customerId, (bookingCount.get(booking.customerId) ?? 0) + 1);

  /* --- customers -------------------------------------------------- */

  const rename = new Map<string, { id: string; name: string }>();
  const claimedCustomers = new Set<string>();
  for (const cast of castCustomers) {
    const target = customers.find(
      (customer) =>
        !claimedCustomers.has(customer.id) &&
        customer.type === CustomerType.HOUSEHOLD &&
        customer.status === CustomerStatus.ACTIVE &&
        !disputedCustomers.has(customer.id) &&
        (bookingCount.get(customer.id) ?? 0) >= 3,
    );
    if (!target) throw new Error(`no generated household left for cast customer ${cast.id}`);
    claimedCustomers.add(target.id);
    rename.set(target.id, { id: cast.id, name: cast.name });
  }

  const taken = new Set([...CAST_NAMES, ...customers.map((customer) => customer.name), ...generated.workers.map((w) => w.name)]);
  for (const customer of customers) {
    if (claimedCustomers.has(customer.id) || !CAST_NAMES.has(customer.name)) continue;
    const name = unusedName(taken, customer.id);
    taken.add(name);
    rename.set(customer.id, { id: customer.id, name });
  }

  const castById = new Map<string, User>(castCustomers.map((customer) => [customer.id, customer]));
  customers = customers.map((customer) => {
    const next = rename.get(customer.id);
    if (!next) return customer;
    const cast = castById.get(next.id);
    return {
      ...customer,
      id: next.id,
      name: next.name,
      ...(cast ? { phone: displayPhone(cast.phone) } : {}),
      ...(customer.email ? { email: emailFor(next.name, customer.email) } : {}),
    };
  });
  bookings = bookings.map((booking) => {
    const next = rename.get(booking.customerId);
    return next ? { ...booking, customerId: next.id, customerName: next.name } : booking;
  });
  disputes = disputes.map((dispute) => {
    const next = rename.get(dispute.customerId);
    if (!next) return dispute;
    return {
      ...dispute,
      customerId: next.id,
      customerName: next.name,
      messages: dispute.messages.map((message) =>
        message.author === DisputeAuthor.CUSTOMER ? { ...message, authorName: next.name } : message,
      ),
    };
  });

  /* The demo customer lives where the customer app says they do. */
  const demo = castCustomers[0]!;
  const home = castPlaces.demoCustomerHome;
  customers = customers.map((customer) =>
    customer.id === demo.id
      ? { ...customer, zoneId: zoneFor(home.point), address: [home.line1, home.line2].filter(Boolean).join(', ') }
      : customer,
  );

  /* --- hand-written bookings -------------------------------------- */

  const clock = createAnchoredClock(SEED_NOW);
  const customerCast = buildCustomerCastBookings(clock);
  const handWritten: Booking[] = [
    ...customerCast.live,
    ...customerCast.scheduled,
    ...customerCast.past,
    ...customerCast.cancelled,
    ...buildWorkerCastBookings(clock),
  ];

  /* Bookings with a reversed payout. A handful of rows point back, so collect those ids first. */
  const reversedRowIds = new Set<string>();
  for (const entry of ledger) if (entry.reversalOf) reversedRowIds.add(entry.reversalOf);
  const reversed = new Set<string>();
  for (const entry of ledger) if (entry.bookingId && reversedRowIds.has(entry.id)) reversed.add(entry.bookingId);
  const releaseCutoff = new Date(SEED_NOW.getTime() - RELEASE_AFTER_DAYS * DAY_MS).toISOString();
  const customerIds = new Set(customers.map((customer) => customer.id));
  const claimedBookings = new Set<string>();
  /** Each generated booking a hand-written one was laid over, and what replaced it. */
  const laid = new Map<string, { next: AdminBooking; finished: boolean }>();

  bookings = [...bookings];
  const bookingIndex = new Map(bookings.map((booking, index) => [booking.id, index]));
  /* Read once rather than once per hand-written booking: the search below visits thousands of rows each time. */
  const createdMs = bookings.map((booking) => Date.parse(booking.createdAt));
  const byKind: Record<Kind, number[]> = { LIVE: [], FINISHED: [], ENDED: [] };
  bookings.forEach((booking, index) => {
    if (disputedBookings.has(booking.id) || reversed.has(booking.id)) return;
    byKind[kindOf(booking.status)].push(index);
  });

  for (const cast of handWritten) {
    if (!customerIds.has(cast.customerId)) throw new Error(`${cast.id}: customer ${cast.customerId} is not in the dataset`);
    const worker = cast.workerId ? workersById.get(cast.workerId) : undefined;
    if (cast.workerId && !worker) throw new Error(`${cast.id}: worker ${cast.workerId} is not in the dataset`);

    const trade = worker?.category ?? tradeOfService(cast.serviceCategoryId);
    const timeline = timelineFor(cast, worker?.name);
    if (timeline.some((event) => event.at > SEED_NOW.toISOString())) {
      throw new Error(`${cast.id}: its timeline runs past SEED_NOW`);
    }
    const completedAt = timeline.find((event) => event.kind === BookingEventKind.COMPLETED)?.at;
    const kind = kindOf(cast.status);
    const released = completedAt ? completedAt < releaseCutoff : false;

    /*
     * A generated booking of the same kind, untouched by disputes and reversals, whose
     * owner keeps other bookings — of the same trade if one exists, and the one made
     * closest in time, so period totals barely move. One pass, keeping the best so far.
     */
    const castAt = Date.parse(cast.createdAt);
    const tradeLabel = trade ? WORKER_CATEGORY_LABEL[trade] : undefined;
    let target: AdminBooking | undefined;
    let targetScore = Infinity;
    for (const index of byKind[kind]) {
      const booking = bookings[index]!;
      if (claimedBookings.has(booking.id)) continue;
      if ((bookingCount.get(booking.customerId) ?? 0) < 2) continue;
      if (kind === 'FINISHED' && ((booking.completedAt ?? booking.createdAt) < releaseCutoff) !== released) continue;
      /* A different trade ranks behind every same-trade booking, however close in time. */
      const score = Math.abs(createdMs[index]! - castAt) + (tradeLabel && booking.category !== tradeLabel ? 1e15 : 0);
      if (score < targetScore) {
        target = booking;
        targetScore = score;
      }
    }
    if (!target) throw new Error(`${cast.id}: no generated ${kind.toLowerCase()} booking left to lay it over`);
    claimedBookings.add(target.id);
    bookingCount.set(target.customerId, (bookingCount.get(target.customerId) ?? 1) - 1);

    const customer = castById.get(cast.customerId)!;
    const amount = cast.fare?.total ?? target.amount;
    const next: AdminBooking = {
      ...target,
      id: cast.id,
      customerId: cast.customerId,
      customerName: customer.name,
      workerId: worker?.id,
      workerName: worker?.name,
      category: trade ? WORKER_CATEGORY_LABEL[trade] : target.category,
      zoneId: zoneFor(cast.address.point),
      location: cast.address.point,
      status: cast.status,
      amount,
      createdAt: cast.createdAt,
      acceptedAt: timeline.find((event) => event.kind === BookingEventKind.ACCEPTED)?.at,
      completedAt,
      timeline,
    };
    bookings[bookingIndex.get(target.id)!] = next;
    claimedBookings.add(next.id);
    laid.set(target.id, { next, finished: kind === 'FINISHED' });
  }

  /*
   * A finished job's ledger rows follow it: new booking, worker, amount and date, in
   * one pass over the ledger. Rows whose date changed are re-inserted in order below.
   */
  const moved: LedgerEntry[] = [];
  let fundDelta = 0;
  for (let rowIndex = 0; rowIndex < ledger.length; rowIndex += 1) {
    const original = ledger[rowIndex]!;
    const entry = original.bookingId ? laid.get(original.bookingId) : undefined;
    if (!entry) continue;
    const { next, finished } = entry;
    if (!finished) throw new Error(`${next.id}: laid over ${original.bookingId}, which has ledger rows but did not finish`);
    const completedAt = next.completedAt!;
    const split = splitAmount(next.amount);
    const row: LedgerEntry = { ...original, bookingId: next.id };
    ledger[rowIndex] = row;
    moved.push(row);
    if (row.type === LedgerEntryType.WORKER_PAYOUT) {
      row.amount = split.worker;
      row.subjectId = next.workerId;
      row.description = `Payout to ${next.workerName ?? 'worker'} for ${next.reference}`;
      row.referenceKey = `${next.id}:worker-payout`;
      row.createdAt = completedAt;
    } else if (row.type === LedgerEntryType.PLATFORM_FEE) {
      row.amount = split.platform;
      row.referenceKey = `${next.id}:platform-fee`;
      row.createdAt = completedAt;
    } else if (row.type === LedgerEntryType.COOP_FUND_CONTRIBUTION) {
      fundDelta += split.coopFund - row.amount;
      row.amount = split.coopFund;
      row.referenceKey = `${next.id}:coop-fund`;
      row.createdAt = completedAt;
    } else if (row.type === LedgerEntryType.PAYOUT_RELEASE) {
      row.amount = split.worker;
      row.subjectId = next.workerId;
      row.createdAt = new Date(Date.parse(completedAt) + DAY_MS).toISOString();
    }
  }


  /*
   * The hand-written amounts moved the window's fund contributions by `fundDelta`. The
   * carried-over history is by construction "lifetime contributions less the window",
   * so the latest carried-over month absorbs the difference and the balance stays put.
   */
  if (fundDelta !== 0) {
    let lastIndex = -1;
    ledger.forEach((entry, index) => {
      if (!entry.referenceKey?.startsWith('coop-fund:carried-over:')) return;
      if (lastIndex < 0 || compareIso(entry.createdAt, ledger[lastIndex]!.createdAt) >= 0) lastIndex = index;
    });
    const last = ledger[lastIndex];
    if (!last || last.amount - fundDelta <= 0) throw new Error('carried-over fund history cannot absorb the cast bookings');
    ledger[lastIndex] = { ...last, amount: last.amount - fundDelta };
  }

  /* Oldest first still: the moved rows come out and go back in at their new dates, after any row dated the same. */
  const movedSet = new Set(moved);
  const ordered = ledger.filter((entry) => !movedSet.has(entry));
  for (const row of [...moved].sort((a, b) => compareIso(a.createdAt, b.createdAt))) {
    let low = 0;
    let high = ordered.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (compareIso(ordered[middle]!.createdAt, row.createdAt) <= 0) low = middle + 1;
      else high = middle;
    }
    ordered.splice(low, 0, row);
  }

  const result: SeedDataset = { ...generated, customers, bookings, disputes, ledger: ordered };
  assertCastOverlay(result, fundBefore);
  return result;
}

/**
 * The claims this module makes, checked on every build. A seed change that breaks one
 * fails loudly at startup rather than showing two apps two different people.
 */
function assertCastOverlay(dataset: SeedDataset, fundBefore: number): void {
  const problems: string[] = [];
  const unique = (label: string, values: string[]): void => {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) problems.push(`${label}: duplicate ${value}`);
      seen.add(value);
    }
  };
  unique('worker id', dataset.workers.map((worker) => worker.id));
  unique('worker name', dataset.workers.map((worker) => worker.name));
  unique('customer id', dataset.customers.map((customer) => customer.id));
  unique('booking id', dataset.bookings.map((booking) => booking.id));

  const workers = new Map(dataset.workers.map((worker) => [worker.id, worker]));
  const customers = new Map(dataset.customers.map((customer) => [customer.id, customer]));
  for (const cast of castWorkers) {
    const worker = workers.get(cast.profile.id);
    if (!worker) problems.push(`cast worker ${cast.profile.id} missing`);
    else if (worker.name !== cast.user.name) problems.push(`cast worker ${cast.profile.id} is named ${worker.name}`);
  }
  for (const cast of castCustomers) {
    const customer = customers.get(cast.id);
    if (!customer) problems.push(`cast customer ${cast.id} missing`);
    else if (customer.name !== cast.name) problems.push(`cast customer ${cast.id} is named ${customer.name}`);
  }
  for (const booking of dataset.bookings) {
    if (!customers.has(booking.customerId)) problems.push(`${booking.id}: unknown customer ${booking.customerId}`);
    if (booking.workerId && workers.get(booking.workerId)?.name !== booking.workerName) {
      problems.push(`${booking.id}: worker ${booking.workerId} does not match its name`);
    }
  }
  const booked = new Set(dataset.bookings.map((booking) => booking.customerId));
  for (const customer of dataset.customers) {
    if (!booked.has(customer.id)) problems.push(`customer ${customer.id} has no bookings`);
  }
  for (const worker of dataset.workers) {
    if (worker.isOnline && worker.kycStatus !== KycStatus.VERIFIED) problems.push(`worker ${worker.id} is online but not verified`);
  }
  const fundAfter = fundBalance(dataset.ledger);
  if (fundAfter !== fundBefore) problems.push(`fund balance moved from ${fundBefore} to ${fundAfter}`);

  if (problems.length > 0) {
    throw new Error(`The demo cast does not sit cleanly on the seed:\n  - ${problems.slice(0, 20).join('\n  - ')}`);
  }
}
