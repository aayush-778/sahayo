import {
  COOP_FUND_SHARE,
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  PLATFORM_SHARE,
  ProposalStatus,
  WORKER_SHARE,
  type AdminBooking,
  type AdminWorker,
  type LedgerEntry,
  type Paise,
} from '../index';
import { DAY_MS, SEED_NOW, SEEDS, createRng, isoAgo } from './rng';
import { compareIso } from './clock';
import { BOOKING_WINDOW_DAYS, isCompletedBooking } from './bookings';
import { FUND_PROGRAMMES } from './fund-programmes';

/** How many reversing entries the seed includes, so the append-only UI has real ones. */
export const SEEDED_REVERSAL_COUNT = 6;

/** The carried-over history starts at this fraction of the window's daily contribution rate. */
const CARRIED_OVER_STARTING_RATE = 0.15;

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

/** The three shares of a booking as fractions summing to 1. */
export interface SplitShares {
  worker: number;
  platform: number;
  coopFund: number;
}

/**
 * The split every seeded booking was paid at. Settings can change the split for
 * bookings paid from then on; nothing already in the ledger is re-split.
 */
export const DEFAULT_SPLIT_SHARES: SplitShares = {
  worker: WORKER_SHARE,
  platform: PLATFORM_SHARE,
  coopFund: COOP_FUND_SHARE,
};

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
export function splitAmount(
  gross: Paise,
  shares: SplitShares = DEFAULT_SPLIT_SHARES,
): {
  worker: Paise;
  platform: Paise;
  coopFund: Paise;
} {
  const worker = Math.round(gross * shares.worker);
  const platform = Math.round(gross * shares.platform);
  const coopFund = gross - worker - platform;
  return { worker, platform, coopFund };
}

/** A Stripe-shaped payment trace, which is what support quotes when chasing a payout. */
function traceId(rng: ReturnType<typeof createRng>): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  /*
   * Four characters per draw rather than one: 62^4 fits comfortably inside a single
   * 32-bit draw, and the ledger mints some thirty thousand trace ids.
   */
  let out = 'tr_';
  for (let draw = 0; draw < 4; draw += 1) {
    let value = rng.int(0, 62 ** 4 - 1);
    for (let i = 0; i < 4; i += 1) {
      out += alphabet[value % 62];
      value = Math.floor(value / 62);
    }
  }
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
      createdAt: new Date(Date.parse(payout.createdAt) + DAY_MS).toISOString(),
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
   * The 90 days of bookings above are the visible slice of a platform that has been
   * running for well over a year — workers joined up to 760 days ago and carry lifetime
   * contribution figures on their profiles. What they contributed before the window is
   * derived, not invented: the sum of every worker's lifetime contribution, less what
   * the window's bookings already account for, so the fund and the worker profiles
   * reconcile by construction.
   *
   * It is posted as one row per calendar month, and the months follow a daily rate that
   * climbs steadily and arrives at the window's own daily rate on the day the window
   * opens. Both halves of that matter on the twelve-month chart. A single lump drew a
   * flat line that jumped by lakhs in one month; a ramp that ended below the window's
   * rate drew a step where the bookings begin; and a monthly row dated inside the
   * window's first month counted that month twice. The month the window opens in gets
   * a row only for its days before the window, so it adds up to one ordinary month.
   */
  const lifetimeContributed = workers.reduce((sum, worker) => sum + worker.fundContributed, 0);
  const windowContributed = entries
    .filter((entry) => entry.type === LedgerEntryType.COOP_FUND_CONTRIBUTION)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const carriedOver = Math.max(0, lifetimeContributed - windowContributed);
  entries.push(...carriedOverContributions(rng, carriedOver, windowContributed / BOOKING_WINDOW_DAYS));

  /*
   * What the fund has spent: one row per programme the members voted through, for
   * exactly the amount they approved, dated just after the vote closed. These come from
   * FUND_PROGRAMMES, the same list the proposals are built from, so the fund page's
   * past decisions and its ledger can never disagree about what was paid for.
   */
  for (const programme of FUND_PROGRAMMES) {
    if (programme.status !== ProposalStatus.PASSED || programme.disbursedDaysAgo === undefined) {
      continue;
    }
    entries.push({
      id: rng.uuid(),
      type: LedgerEntryType.COOP_FUND_DISBURSEMENT,
      account: LedgerAccount.COOP_FUND,
      direction: LedgerDirection.DEBIT,
      amount: programme.amountRupees * 100,
      description: `Paid for "${programme.title}", as the members voted.`,
      referenceKey: `coop-fund:programme:${programme.key}`,
      createdAt: isoAgo(programme.disbursedDaysAgo),
    });
  }

  /* Oldest first, so the ledger reads as a chronological record. */
  return entries.sort((a, b) => compareIso(a.createdAt, b.createdAt));
}

/**
 * Monthly contribution rows for the fund's history before the booking window.
 *
 * The daily rate rises linearly from CARRIED_OVER_STARTING_RATE of `windowDailyRate` to
 * `windowDailyRate` itself, over however many days it takes for the rows to total
 * `total` exactly. Each row is dated mid-month, or mid-way through the part of the month
 * before the window opens, and the last row takes the rounding remainder.
 */
function carriedOverContributions(
  rng: ReturnType<typeof createRng>,
  total: Paise,
  windowDailyRate: number,
): LedgerEntry[] {
  if (total <= 0 || windowDailyRate <= 0) return [];

  const startRate = windowDailyRate * CARRIED_OVER_STARTING_RATE;
  /* The area under a straight ramp is its length times its average height. */
  const days = Math.max(1, Math.round((2 * total) / (startRate + windowDailyRate)));
  const windowStart = SEED_NOW.getTime() - BOOKING_WINDOW_DAYS * DAY_MS;
  const firstDay = windowStart - days * DAY_MS;
  const rateOn = (dayIndex: number): number =>
    startRate + ((windowDailyRate - startRate) * (dayIndex + 0.5)) / days;

  /* Sum the ramp into calendar months, keeping each month's first and last day. */
  const months: Array<{ key: string; from: number; to: number; weight: number }> = [];
  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const time = firstDay + dayIndex * DAY_MS;
    const key = new Date(time).toISOString().slice(0, 7);
    const last = months[months.length - 1];
    if (last && last.key === key) {
      last.to = time;
      last.weight += rateOn(dayIndex);
    } else {
      months.push({ key, from: time, to: time, weight: rateOn(dayIndex) });
    }
  }

  const weightTotal = months.reduce((sum, month) => sum + month.weight, 0);
  let allocated = 0;
  return months.map((month, index) => {
    const isLast = index === months.length - 1;
    const amount = isLast ? total - allocated : Math.floor((total * month.weight) / weightTotal);
    allocated += amount;
    const createdAt = new Date(Math.round((month.from + month.to) / 2)).toISOString();
    const label = new Date(month.from).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return {
      id: rng.uuid(),
      type: LedgerEntryType.COOP_FUND_CONTRIBUTION,
      account: LedgerAccount.COOP_FUND,
      direction: LedgerDirection.CREDIT,
      amount,
      description: `Member contributions for ${label}, carried over from the earlier register.`,
      referenceKey: `coop-fund:carried-over:${index}`,
      createdAt,
    };
  });
}
