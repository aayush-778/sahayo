import {
  COOP_FUND_SHARE,
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  PLATFORM_SHARE,
  WORKER_SHARE,
  type AdminBooking,
  type AdminWorker,
  type LedgerEntry,
  type Paise,
} from '@sahayo/shared';
import { DAY_MS, SEED_NOW, SEEDS, createRng, isoAgo } from './rng';
import { BOOKING_WINDOW_DAYS, isCompletedBooking } from './bookings';

/** How many reversing entries the seed includes, so the append-only UI has real ones. */
export const SEEDED_REVERSAL_COUNT = 6;

/** Payouts older than this have already been released to the worker's bank. */
export const RELEASE_AFTER_DAYS = 3;

/*
 * The three shares must sum to exactly 1, or a split silently loses money. This
 * is checked once at module load rather than per call: it is a property of the
 * constants, and if it is wrong every figure in the finance hub is wrong, so
 * failing loudly at startup beats a quiet rounding drift nobody notices.
 */
if (Math.abs(WORKER_SHARE + PLATFORM_SHARE + COOP_FUND_SHARE - 1) > 1e-9) {
  throw new Error(
    'WORKER_SHARE + PLATFORM_SHARE + COOP_FUND_SHARE must equal 1. ' +
      `Got ${WORKER_SHARE} + ${PLATFORM_SHARE} + ${COOP_FUND_SHARE}.`,
  );
}

/**
 * Splits a gross amount three ways, in paise, summing to the gross EXACTLY.
 *
 * The shares come from constants.ts and are never written as literals here, so
 * the portal can never tell a worker a different number than the mobile app does.
 *
 * The last part absorbs the rounding rather than being rounded itself. Rounding
 * all three independently loses or gains a paisa on most amounts — and "every
 * period's three figures sum exactly to the gross, to the paisa" is a hard
 * requirement of the finance page, not an approximation. The cooperative fund
 * takes the remainder because it is the smallest share, so a one-paisa
 * adjustment is proportionally least visible there.
 */
export function splitAmount(gross: Paise): {
  worker: Paise;
  platform: Paise;
  coopFund: Paise;
} {
  const worker = Math.round(gross * WORKER_SHARE);
  const platform = Math.round(gross * PLATFORM_SHARE);
  const coopFund = gross - worker - platform;
  return { worker, platform, coopFund };
}

/** A Stripe-shaped payment trace, which is what support quotes when chasing a payout. */
function traceId(rng: ReturnType<typeof createRng>): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = 'tr_';
  for (let i = 0; i < 16; i += 1) out += alphabet[rng.int(0, alphabet.length - 1)];
  return out;
}

/**
 * The append-only ledger.
 *
 * Every completed booking produces exactly three entries whose amounts sum to
 * its gross: the worker's payout, the platform's fee, and the cooperative fund's
 * contribution. Nothing else posts on a completed booking, so the finance page's
 * totals are a pure function of this list.
 *
 * `SEEDED_REVERSAL_COUNT` reversing entries are appended at the end, each
 * pointing at an earlier row through `reversalOf`. The originals are untouched:
 * a correction is a new row, always. See the ledger rule in CLAUDE.md.
 */
export function buildLedger(bookings: AdminBooking[], workers: AdminWorker[]): LedgerEntry[] {
  const rng = createRng(SEEDS.ledger);
  const entries: LedgerEntry[] = [];

  const completed = bookings.filter(isCompletedBooking);

  for (const booking of completed) {
    const split = splitAmount(booking.amount);
    /* Posted when the job was paid, not when it was requested. */
    const createdAt = booking.completedAt ?? booking.createdAt;

    entries.push({
      id: rng.uuid(),
      type: LedgerEntryType.WORKER_PAYOUT,
      account: LedgerAccount.WORKER,
      direction: LedgerDirection.CREDIT,
      amount: split.worker,
      subjectId: booking.workerId,
      bookingId: booking.id,
      description: `Payout to ${booking.workerName ?? 'worker'} for ${booking.reference}`,
      referenceKey: `${booking.id}:worker-payout`,
      traceId: traceId(rng),
      createdAt,
    });

    entries.push({
      id: rng.uuid(),
      type: LedgerEntryType.PLATFORM_FEE,
      account: LedgerAccount.PLATFORM,
      direction: LedgerDirection.CREDIT,
      amount: split.platform,
      bookingId: booking.id,
      description: `Platform fee on ${booking.reference}`,
      referenceKey: `${booking.id}:platform-fee`,
      traceId: traceId(rng),
      createdAt,
    });

    entries.push({
      id: rng.uuid(),
      type: LedgerEntryType.COOP_FUND_CONTRIBUTION,
      account: LedgerAccount.COOP_FUND,
      direction: LedgerDirection.CREDIT,
      amount: split.coopFund,
      bookingId: booking.id,
      description: `Cooperative fund share of ${booking.reference}`,
      referenceKey: `${booking.id}:coop-fund`,
      traceId: traceId(rng),
      createdAt,
    });
  }

  /*
   * Releases to the bank.
   *
   * A worker's payout is credited to their platform balance when the job is paid,
   * and sent to their bank in a later batch. Payouts older than
   * RELEASE_AFTER_DAYS have already gone; newer ones are still pending, which is
   * what gives the Payouts tab a real queue to release. The release is its own row
   * pointing back through `releaseOf` — the payout row itself never changes.
   */
  const releaseCutoff = new Date(
    SEED_NOW.getTime() - RELEASE_AFTER_DAYS * DAY_MS,
  ).toISOString();
  const releases: LedgerEntry[] = [];
  for (const payout of entries) {
    if (payout.type !== LedgerEntryType.WORKER_PAYOUT) continue;
    if (payout.createdAt >= releaseCutoff) continue;
    releases.push({
      id: rng.uuid(),
      type: LedgerEntryType.PAYOUT_RELEASE,
      account: LedgerAccount.WORKER,
      direction: LedgerDirection.DEBIT,
      amount: payout.amount,
      subjectId: payout.subjectId,
      bookingId: payout.bookingId,
      description: "Released to the worker's bank account.",
      referenceKey: `${payout.id}:release`,
      traceId: traceId(rng),
      releaseOf: payout.id,
      /* Batches go out the morning after a job is paid. */
      createdAt: new Date(new Date(payout.createdAt).getTime() + DAY_MS).toISOString(),
    });
  }
  entries.push(...releases);

  /*
   * Reversals. Drawn from worker payouts specifically, because a reversed payout
   * is the case an auditor actually asks about — it is the one where a real
   * person is owed money and the correction has to be traceable.
   *
   * Only payouts that have not been released yet. Reversing money that has already
   * reached a bank account is a recovery, not a correction, and the seed should not
   * pretend it is a routine one.
   */
  const released = new Set(releases.map((release) => release.releaseOf));
  const payouts = entries.filter(
    (entry) => entry.type === LedgerEntryType.WORKER_PAYOUT && !released.has(entry.id),
  );
  for (const original of rng.sample(payouts, SEEDED_REVERSAL_COUNT)) {
    entries.push({
      id: rng.uuid(),
      type: LedgerEntryType.ADJUSTMENT,
      account: original.account,
      /* The opposite direction of the row it reverses, at the same amount. */
      direction:
        original.direction === LedgerDirection.CREDIT
          ? LedgerDirection.DEBIT
          : LedgerDirection.CREDIT,
      amount: original.amount,
      subjectId: original.subjectId,
      bookingId: original.bookingId,
      description: 'Reversal: payout issued against the wrong booking reference.',
      referenceKey: `${original.id}:reversal`,
      traceId: traceId(rng),
      reversalOf: original.id,
      createdAt: original.createdAt,
    });
  }

  /*
   * The fund's history before this window.
   *
   * The 90 days of bookings above are the visible slice of a platform that has
   * been running for two years — workers joined up to 760 days ago and carry
   * lifetime contribution figures on their profiles. Without these entries the
   * fund would show about ₹62,000 while the worker profiles added up to
   * ₹37,00,000, and the two screens would contradict each other in front of
   * anyone who looked at both.
   *
   * So the opening balance is derived, not invented: it is the sum of what every
   * worker has contributed over their lifetime, less what the window's bookings
   * already account for. The figures reconcile by construction.
   */
  const lifetimeContributed = workers.reduce((sum, worker) => sum + worker.fundContributed, 0);
  const windowContributed = entries
    .filter((entry) => entry.type === LedgerEntryType.COOP_FUND_CONTRIBUTION)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const openingBalance = Math.max(0, lifetimeContributed - windowContributed);

  entries.push({
    id: rng.uuid(),
    type: LedgerEntryType.COOP_FUND_CONTRIBUTION,
    account: LedgerAccount.COOP_FUND,
    direction: LedgerDirection.CREDIT,
    amount: openingBalance,
    description: 'Opening balance: cooperative fund contributions before this period.',
    referenceKey: 'coop-fund:opening-balance',
    createdAt: isoAgo(BOOKING_WINDOW_DAYS + 1),
  });

  /*
   * And what the fund has already spent.
   *
   * A fund that only ever took money in would be a savings account, not a
   * cooperative — the whole claim is that members decide what it pays for, and
   * the Past Decisions list has to have something true to show. These are the
   * programmes the membership has funded, each dated before the window.
   */
  for (const programme of HISTORICAL_DISBURSEMENTS) {
    entries.push({
      id: rng.uuid(),
      type: LedgerEntryType.COOP_FUND_DISBURSEMENT,
      account: LedgerAccount.COOP_FUND,
      direction: LedgerDirection.DEBIT,
      amount: Math.round(openingBalance * programme.share),
      description: programme.description,
      referenceKey: `coop-fund:${programme.key}`,
      createdAt: isoAgo(programme.daysAgo),
    });
  }

  /* Oldest first, so the ledger reads as a chronological record. */
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * What the fund has paid for, as a share of the opening balance.
 *
 * Shares rather than fixed amounts so the history scales with the platform: if
 * the worker cohort grows, the fund's past spending grows with its past income
 * instead of becoming a rounding error. They total 0.30, leaving the fund holding
 * roughly 70% of what it has ever collected — enough to cover the micro-loan
 * queue with headroom, which is the state the loan page needs to be demonstrable.
 */
const HISTORICAL_DISBURSEMENTS: ReadonlyArray<{
  key: string;
  description: string;
  share: number;
  daysAgo: number;
}> = [
  {
    key: 'health-insurance-premium',
    description: 'Group health insurance premium, first year.',
    share: 0.12,
    daysAgo: 280,
  },
  {
    key: 'monsoon-gear',
    description: 'Monsoon gear for everyone working outdoors.',
    share: 0.05,
    daysAgo: 210,
  },
  {
    key: 'accident-claims',
    description: 'Accident cover claims paid to four members.',
    share: 0.04,
    daysAgo: 160,
  },
  {
    key: 'tool-loans',
    description: 'Tool replacement loans, since repaid.',
    share: 0.05,
    daysAgo: 120,
  },
  {
    key: 'training-bursaries',
    description: 'Trade certificate fees for eleven members.',
    share: 0.04,
    daysAgo: 95,
  },
];
