import {
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  type Id,
  type LedgerEntry,
  type Paise,
} from '@sahayo/shared';
import { splitAmount } from '@sahayo/shared/seed/ledger';
import { state, type StoredBooking } from '../store';

/**
 * The append-only ledger. There is no function here that edits or deletes an entry,
 * and there must never be one: a correction is a new row pointing back.
 */

let entrySeq = 0;
const entryId = (): Id => `led_${Date.now().toString(36)}_${(entrySeq += 1).toString(36)}`;

function append(entry: Omit<LedgerEntry, 'id'>): LedgerEntry {
  const full: LedgerEntry = { id: entryId(), ...entry };
  state().ledgerEntries.push(full);
  return full;
}

/**
 * Posts a finished booking's split: the worker's payout, the platform's fee and the
 * cooperative fund's contribution, summing to the gross exactly.
 *
 * Idempotent on `referenceKey` — the ledger's own handle — so a completion delivered
 * twice cannot pay the worker twice. Returns the three rows either way.
 */
export function appendSplit(booking: StoredBooking): LedgerEntry[] {
  const keys = {
    payout: `${booking.id}:worker-payout`,
    fee: `${booking.id}:platform-fee`,
    fund: `${booking.id}:coop-fund`,
  };
  const existing = state().ledgerEntries.filter((entry) => entry.bookingId === booking.id);
  if (existing.some((entry) => entry.referenceKey === keys.payout)) {
    return existing.filter((entry) => Object.values(keys).includes(entry.referenceKey ?? ''));
  }

  const split = splitAmount(booking.amount);
  const createdAt = booking.completedAt ?? new Date().toISOString();
  return [
    append({
      type: LedgerEntryType.WORKER_PAYOUT,
      account: LedgerAccount.WORKER,
      direction: LedgerDirection.CREDIT,
      amount: split.worker,
      subjectId: booking.workerId,
      bookingId: booking.id,
      description: `Payout to ${booking.workerName ?? 'worker'} for ${booking.reference}`,
      referenceKey: keys.payout,
      createdAt,
    }),
    append({
      type: LedgerEntryType.PLATFORM_FEE,
      account: LedgerAccount.PLATFORM,
      direction: LedgerDirection.CREDIT,
      amount: split.platform,
      bookingId: booking.id,
      description: `Platform fee on ${booking.reference}`,
      referenceKey: keys.fee,
      createdAt,
    }),
    append({
      type: LedgerEntryType.COOP_FUND_CONTRIBUTION,
      account: LedgerAccount.COOP_FUND,
      direction: LedgerDirection.CREDIT,
      amount: split.coopFund,
      bookingId: booking.id,
      description: `Cooperative fund share of ${booking.reference}`,
      referenceKey: keys.fund,
      createdAt,
    }),
  ];
}

/** Rows posted since the server booted. */
export function appendedSinceBoot(): LedgerEntry[] {
  return state().ledgerEntries.slice(state().seededLedgerLength);
}

/** Every row posted against one booking. */
export function entriesForBooking(bookingId: Id): LedgerEntry[] {
  return state().ledgerEntries.filter((entry) => entry.bookingId === bookingId);
}

/** Every row about one worker: payouts, releases to their bank, and reversals. */
export function entriesForWorker(workerId: Id): LedgerEntry[] {
  return state().ledgerEntries.filter((entry) => entry.subjectId === workerId);
}

/** What the platform holds for a worker: payouts credited, less what has gone to their bank or been reversed. */
export function balanceForWorker(workerId: Id): Paise {
  return entriesForWorker(workerId).reduce(
    (sum, entry) => sum + (entry.direction === LedgerDirection.CREDIT ? entry.amount : -entry.amount),
    0,
  );
}

export function coopFundTotal(): Paise {
  let total = 0;
  for (const entry of state().ledgerEntries) {
    if (entry.account !== LedgerAccount.COOP_FUND) continue;
    total += entry.direction === LedgerDirection.CREDIT ? entry.amount : -entry.amount;
  }
  return total;
}

/** The fund share of every booking a worker finished. */
export function fundContributedBy(workerId: Id): Paise {
  const bookingIds = new Set(
    [...state().bookings.values()].filter((booking) => booking.workerId === workerId).map((booking) => booking.id),
  );
  return state()
    .ledgerEntries.filter((entry) => entry.type === LedgerEntryType.COOP_FUND_CONTRIBUTION && entry.bookingId && bookingIds.has(entry.bookingId))
    .reduce((sum, entry) => sum + entry.amount, 0);
}

/**
 * The fund's ledger summarised for a phone: one contribution row per calendar month,
 * dated at that month's last contribution, plus every disbursement as it is. The
 * balance it adds up to is exactly `coopFundTotal()`.
 */
export function fundLedgerByMonth(): LedgerEntry[] {
  const months = new Map<string, LedgerEntry>();
  const out: LedgerEntry[] = [];
  for (const entry of state().ledgerEntries) {
    if (entry.account !== LedgerAccount.COOP_FUND) continue;
    if (entry.type !== LedgerEntryType.COOP_FUND_CONTRIBUTION) {
      out.push(entry);
      continue;
    }
    const key = entry.createdAt.slice(0, 7);
    const month = months.get(key);
    const signed = entry.direction === LedgerDirection.CREDIT ? entry.amount : -entry.amount;
    if (!month) {
      months.set(key, { ...entry, id: `fund_month_${key}`, amount: signed, description: 'monthly_contributions', referenceKey: `fund:month:${key}` });
    } else {
      month.amount += signed;
      if (entry.createdAt > month.createdAt) month.createdAt = entry.createdAt;
    }
  }
  return [...out, ...months.values()].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/** Fund contributions posted since `sinceIso`. */
export function fundContributionsSince(sinceIso: string): Paise {
  return state()
    .ledgerEntries.filter((entry) => entry.type === LedgerEntryType.COOP_FUND_CONTRIBUTION && entry.createdAt >= sinceIso)
    .reduce((sum, entry) => sum + entry.amount, 0);
}
