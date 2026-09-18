import {
  CATEGORY_ID_BY_WORKER_CATEGORY,
  UserRole,
  subCategoriesByCategoryId,
  workerCategoryFromLabel,
  type AdminBooking,
  type Booking,
  type BookingEvent,
  type User,
} from '@sahayo/shared';
import { SEED_NOW, buildSeedDataset, splitAmount } from '@sahayo/shared/seed';
import {
  buildCustomerCastBookings,
  buildWorkerCastBookings,
  castCustomers,
  castWorkers,
  createAnchoredClock,
} from '@sahayo/shared/seed/cast';
import type { ServerState, StoredBooking } from './index';

/**
 * Builds the server's state from the canonical seed, placed at `now`.
 *
 * The seed is anchored at a fixed SEED_NOW so it is identical on every machine. The
 * server moves every timestamp by the same amount so that SEED_NOW lands on boot time:
 * "today" on the dashboard is the real today, and a booking created a minute after
 * boot sits among today's seeded jobs rather than three days after all of them.
 */
export function seedState(now: number): ServerState {
  const dataset = buildSeedDataset();
  const shiftMs = now - SEED_NOW.getTime();
  const shift = (iso: string): string => new Date(Date.parse(iso) + shiftMs).toISOString();
  const shiftOptional = (iso: string | undefined): string | undefined => (iso ? shift(iso) : undefined);

  /* --- people ------------------------------------------------------ */

  const users = new Map<string, User>();
  const workerIdByUserId = new Map<string, string>();
  const castWorkerById = new Map(castWorkers.map((cast) => [cast.profile.id, cast]));
  const castCustomerById = new Map(castCustomers.map((cast) => [cast.id, cast]));
  const e164 = (display: string): string => `+${display.replace(/\D/g, '')}`;

  const workers = new Map(
    dataset.workers.map((worker) => [worker.id, { ...worker, joinedAt: shift(worker.joinedAt) }]),
  );
  for (const worker of workers.values()) {
    const cast = castWorkerById.get(worker.id);
    const user: User = cast
      ? { ...cast.user }
      : {
          id: `usr_${worker.id}`,
          phone: e164(worker.phone),
          name: worker.name,
          role: UserRole.WORKER,
          locale: 'hi-IN',
          createdAt: worker.joinedAt,
          updatedAt: worker.joinedAt,
        };
    users.set(user.id, user);
    workerIdByUserId.set(user.id, worker.id);
  }

  const customers = new Map(
    dataset.customers.map((customer) => [
      customer.id,
      {
        ...customer,
        joinedAt: shift(customer.joinedAt),
        ...(customer.suspension ? { suspension: { ...customer.suspension, suspendedAt: shift(customer.suspension.suspendedAt) } } : {}),
      },
    ]),
  );
  for (const customer of customers.values()) {
    const cast = castCustomerById.get(customer.id);
    users.set(
      customer.id,
      cast
        ? { ...cast }
        : {
            id: customer.id,
            phone: e164(customer.phone),
            name: customer.name,
            ...(customer.email ? { email: customer.email } : {}),
            role: UserRole.CUSTOMER,
            locale: 'hi-IN',
            createdAt: customer.joinedAt,
            updatedAt: customer.joinedAt,
          },
    );
  }

  /* --- bookings ------------------------------------------------------ */

  /* What the mobile apps' hand-written bookings carry that the admin row does not. */
  const clock = createAnchoredClock(SEED_NOW);
  const customerCast = buildCustomerCastBookings(clock);
  const castBookingById = new Map<string, Booking>(
    [...customerCast.live, ...customerCast.scheduled, ...customerCast.past, ...customerCast.cancelled, ...buildWorkerCastBookings(clock)].map(
      (booking) => [booking.id, booking],
    ),
  );

  const bookings = new Map<string, StoredBooking>();
  const bookingEvents = new Map<string, BookingEvent[]>();
  for (const row of dataset.bookings) {
    const timeline = row.timeline.map((event) => ({ ...event, at: shift(event.at) }));
    const cast = castBookingById.get(row.id);
    const { timeline: _timeline, ...rest } = row;
    const stored: StoredBooking = {
      ...rest,
      createdAt: shift(row.createdAt),
      acceptedAt: shiftOptional(row.acceptedAt),
      completedAt: shiftOptional(row.completedAt),
      serviceCategoryId: cast?.serviceCategoryId ?? serviceCategoryFor(row),
      address: cast?.address ?? addressFor(row),
      ...(cast?.notes ? { notes: cast.notes } : {}),
      ...(cast?.scheduledFor ? { scheduledFor: shift(cast.scheduledFor) } : {}),
      ...(cast?.cancellationReason ? { cancellationReason: cast.cancellationReason } : {}),
      fare: cast ? cast.fare : fareFor(row.amount),
      updatedAt: timeline[timeline.length - 1]?.at ?? shift(row.createdAt),
    };
    bookings.set(row.id, stored);
    bookingEvents.set(row.id, timeline);
  }

  /* --- money and votes ---------------------------------------------------- */

  const ledgerEntries = dataset.ledger.map((entry) => ({ ...entry, createdAt: shift(entry.createdAt) }));

  const proposals = new Map(
    dataset.proposals.map((proposal) => [
      proposal.id,
      {
        ...proposal,
        openedAt: shift(proposal.openedAt),
        closesAt: shift(proposal.closesAt),
        comments: proposal.comments.map((comment) => ({ ...comment, createdAt: shift(comment.createdAt) })),
        ballots: proposal.ballots.map((ballot) => ({ ...ballot, castAt: shift(ballot.castAt) })),
      },
    ]),
  );

  return {
    seededAt: new Date(now).toISOString(),
    shiftMs,
    users,
    workerIdByUserId,
    workers,
    customers,
    bookings,
    bookingEvents,
    ledgerEntries,
    proposals,
    chats: new Map(),
    /* Oldest submission first, the order the admin portal's verification queue lists them. */
    kycQueueWorkerIds: [...dataset.kycQueue]
      .sort((a, b) => (a.submittedAt < b.submittedAt ? -1 : a.submittedAt > b.submittedAt ? 1 : 0))
      .map((submission) => submission.workerId),
    changedBookingIds: new Set(),
    seededLedgerLength: ledgerEntries.length,
  };
}

/** A generated booking's sub-category: the first under its trade's worker type. */
function serviceCategoryFor(row: AdminBooking): string {
  const trade = workerCategoryFromLabel(row.category);
  const categoryId = trade ? CATEGORY_ID_BY_WORKER_CATEGORY[trade] : 'cat_electricians';
  const subs = subCategoriesByCategoryId[categoryId as keyof typeof subCategoriesByCategoryId] ?? [];
  return subs[0]?.id ?? categoryId;
}

/** Each zone's postal code, for the street address generated bookings do not carry. */
const PINCODE_BY_ZONE: Record<string, string> = {
  'zone-boring-road': '800001',
  'zone-kankarbagh': '800020',
  'zone-bailey-road': '800014',
  'zone-rajendra-nagar': '800016',
  'zone-danapur': '801503',
  'zone-patliputra': '800013',
  'zone-ashok-rajpath': '800004',
  'zone-bihta': '801103',
  'zone-phulwari-sharif': '801505',
  'zone-gandhi-maidan': '800001',
  'zone-patna-city': '800008',
  'zone-khagaul': '801105',
};

function addressFor(row: AdminBooking): StoredBooking['address'] {
  const locality = row.zoneId.replace(/^zone-/, '').split('-').map((word) => word[0]!.toUpperCase() + word.slice(1)).join(' ');
  return {
    line1: `Near ${row.reference}, ${locality}`,
    city: 'Patna',
    state: 'Bihar',
    pincode: PINCODE_BY_ZONE[row.zoneId] ?? '800001',
    point: row.location,
  };
}

/** The split a generated booking was paid at: the same `splitAmount` its ledger rows were. */
function fareFor(amount: number): StoredBooking['fare'] {
  const split = splitAmount(amount);
  return { total: amount, workerShare: split.worker, platformShare: split.platform, coopFundShare: split.coopFund };
}
