import {
  LedgerAccount,
  LedgerEntryType,
  type LedgerEntry,
  type Paise,
  type SplitSummary,
} from '@sahayo/shared';
import { DAY_MS, SEED_NOW, isCompletedBooking } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';

/** The periods the finance page and the dashboard chart offer. */
export type Period = '7D' | '30D' | '90D' | 'ALL';

export type Granularity = 'DAY' | 'MONTH' | 'YEAR';

export interface LedgerFilter {
  /** Matches the entry id, the booking reference, the description or the trace. */
  search?: string;
  type?: LedgerEntryType;
  account?: LedgerAccount;
  bookingId?: string;
  period?: Period;
  /** Restricts to reversing entries, for auditing corrections. */
  reversalsOnly?: boolean;
}

/** The ISO cutoff a period starts at, or undefined for ALL. */
function periodStart(period: Period | undefined): string | undefined {
  if (!period || period === 'ALL') return undefined;
  const days = period === '7D' ? 7 : period === '30D' ? 30 : 90;
  return new Date(SEED_NOW.getTime() - days * DAY_MS).toISOString();
}

export async function listLedger(filter: LedgerFilter = {}): Promise<LedgerEntry[]> {
  const { ledger, bookings } = adminState();
  const needle = filter.search?.trim().toLowerCase();
  const since = periodStart(filter.period);

  /* Booking references are searchable, so map ids to references once. */
  const referenceById = new Map(bookings.map((booking) => [booking.id, booking.reference]));

  const matched = ledger.filter((entry) => {
    if (filter.type && entry.type !== filter.type) return false;
    if (filter.account && entry.account !== filter.account) return false;
    if (filter.bookingId && entry.bookingId !== filter.bookingId) return false;
    if (since && entry.createdAt < since) return false;
    if (filter.reversalsOnly && !entry.reversalOf) return false;
    if (needle) {
      const reference = entry.bookingId ? referenceById.get(entry.bookingId) ?? '' : '';
      const haystack =
        `${entry.id} ${reference} ${entry.description ?? ''} ${entry.traceId ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  /* Newest first: an auditor opens the ledger at the most recent movement. */
  return respond([...matched].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function getLedgerEntry(entryId: string): Promise<LedgerEntry | undefined> {
  const { ledger } = adminState();
  return respond(ledger.find((entry) => entry.id === entryId));
}

/**
 * The entry that reverses `entryId`, if one exists.
 *
 * The original row shows "Reversed by #yyyy" and the reversal shows "Reversal of
 * #xxxx", so the link reads correctly from either direction. Neither row is
 * modified to create that link — it is derived from `reversalOf`.
 */
export async function getReversalOf(entryId: string): Promise<LedgerEntry | undefined> {
  const { ledger } = adminState();
  return respond(ledger.find((entry) => entry.reversalOf === entryId));
}

/**
 * The three-way split of a period's gross.
 *
 * Derived from completed bookings rather than by summing ledger rows, then
 * checked against them. The three parts sum to the gross EXACTLY, to the paisa —
 * see `splitAmount`, which gives the rounding remainder to the cooperative fund
 * rather than rounding all three independently.
 */
export async function getSplitSummary(period: Period = '30D'): Promise<SplitSummary> {
  const { bookings } = adminState();
  const since = periodStart(period);

  const completed = bookings.filter(
    (booking) => isCompletedBooking(booking) && (!since || booking.createdAt >= since),
  );

  /*
   * Index the ledger by booking once, rather than scanning it per booking. With
   * 718 completed bookings against 2,160 entries the naive nested loop is 1.5
   * million comparisons on every period change, which is exactly the kind of cost
   * that looks fine in a prototype and then stalls the page when the real ledger
   * has a year of rows in it.
   */
  const postedByBooking = new Map<string, { worker: Paise; platform: Paise; coopFund: Paise }>();
  for (const entry of adminState().ledger) {
    if (!entry.bookingId) continue;
    /* Reversals are corrections, not part of the original split. */
    if (entry.reversalOf) continue;

    const posted =
      postedByBooking.get(entry.bookingId) ?? { worker: 0, platform: 0, coopFund: 0 };
    if (entry.type === LedgerEntryType.WORKER_PAYOUT) posted.worker += entry.amount;
    else if (entry.type === LedgerEntryType.PLATFORM_FEE) posted.platform += entry.amount;
    else if (entry.type === LedgerEntryType.COOP_FUND_CONTRIBUTION) {
      posted.coopFund += entry.amount;
    }
    postedByBooking.set(entry.bookingId, posted);
  }

  const summary = completed.reduce<SplitSummary>(
    (acc, booking) => {
      const posted = postedByBooking.get(booking.id) ?? { worker: 0, platform: 0, coopFund: 0 };
      return {
        gross: acc.gross + booking.amount,
        worker: acc.worker + posted.worker,
        platform: acc.platform + posted.platform,
        coopFund: acc.coopFund + posted.coopFund,
        bookingCount: acc.bookingCount + 1,
      };
    },
    { gross: 0, worker: 0, platform: 0, coopFund: 0, bookingCount: 0 },
  );

  return respond(summary);
}

export interface RevenuePoint {
  /** Bucket key: `2026-09-12`, `2026-09` or `2026`. */
  bucket: string;
  /** Display label for the axis, already formatted. */
  label: string;
  platform: Paise;
  coopFund: Paise;
}

/**
 * Platform revenue against cooperative fund growth, bucketed.
 *
 * Returns the full series for every granularity. The dashboard's Day/Month/Year
 * toggle re-aggregates this client-side through pure functions rather than
 * refetching, so switching is instant and works offline — which is a demo
 * requirement, not an optimisation.
 */
export async function getRevenueSeries(
  granularity: Granularity = 'MONTH',
): Promise<RevenuePoint[]> {
  const { ledger } = adminState();
  const buckets = new Map<string, RevenuePoint>();

  for (const entry of ledger) {
    if (entry.reversalOf) continue;
    /*
     * Booking-derived movements only. The fund's opening balance and its
     * historical programme spending are real ledger rows, but they are not
     * growth from platform activity — including them drew a 36-lakh cliff in the
     * first bucket and flattened every month after it into a straight line.
     */
    if (!entry.bookingId) continue;

    const isPlatform = entry.type === LedgerEntryType.PLATFORM_FEE;
    const isFund = entry.type === LedgerEntryType.COOP_FUND_CONTRIBUTION;
    if (!isPlatform && !isFund) continue;

    const bucket = bucketKey(entry.createdAt, granularity);
    const existing = buckets.get(bucket) ?? {
      bucket,
      label: bucketLabel(bucket, granularity),
      platform: 0,
      coopFund: 0,
    };

    if (isPlatform) existing.platform += entry.amount;
    else existing.coopFund += entry.amount;

    buckets.set(bucket, existing);
  }

  /* Chronological: a growth chart reads left to right. */
  return respond([...buckets.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)));
}

function bucketKey(iso: string, granularity: Granularity): string {
  if (granularity === 'YEAR') return iso.slice(0, 4);
  if (granularity === 'MONTH') return iso.slice(0, 7);
  return iso.slice(0, 10);
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function bucketLabel(bucket: string, granularity: Granularity): string {
  if (granularity === 'YEAR') return bucket;
  const monthIndex = Number(bucket.slice(5, 7)) - 1;
  const month = MONTH_NAMES[monthIndex] ?? '';
  if (granularity === 'MONTH') return month;
  return `${Number(bucket.slice(8, 10))} ${month}`;
}

/**
 * Appends entries to the ledger.
 *
 * The only way money moves in this product. There is no counterpart that edits or
 * deletes a row, and there must never be one — a dispute refund, a released
 * payout and a loan disbursement all arrive here as new entries. Callers that
 * reverse an existing row set `reversalOf` on the new entry and leave the
 * original untouched.
 */
export async function appendEntries(entries: LedgerEntry[]): Promise<LedgerEntry[]> {
  const state = adminState();
  state.appendLedgerEntries(entries);
  return respond(entries);
}
