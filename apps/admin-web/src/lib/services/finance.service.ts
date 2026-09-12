import {
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  type LedgerEntry,
  type Paise,
} from '@sahayo/shared';
import { SEED_NOW, splitAmount } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';
import { appendEntries, listLedger, type LedgerFilter } from './ledger.service';

/** Where an entry stands, derived from the rows that point at it. */
export type LedgerRowStatus =
  /** An ordinary movement nothing has corrected. */
  | 'POSTED'
  /** A later row reverses this one. The row itself is unchanged. */
  | 'REVERSED'
  /** This row exists to reverse another. */
  | 'REVERSAL'
  /** A worker payout still sitting in the worker's platform balance. */
  | 'AWAITING_RELEASE'
  /** A worker payout that a release row has sent to the bank. */
  | 'RELEASED'
  /** This row is the release itself. */
  | 'RELEASE';

/**
 * A ledger entry with everything the table needs to show beside it.
 *
 * The entry is carried untouched. Every other field is derived from the rest of the
 * ledger — who reversed it, what released it — which is the only way an append-only
 * record can have a status at all: nothing about the original row is written again.
 */
export interface LedgerRow {
  entry: LedgerEntry;
  bookingReference?: string;
  /** The person or account the money moved for, in words. */
  partyName: string;
  status: LedgerRowStatus;
  /** Set when a later row reverses this one. */
  reversedById?: string;
  /** Set when a release row has sent this payout to the bank. */
  releasedById?: string;
  /** Plus for money arriving in the account the row touches, minus for leaving. */
  sign: 1 | -1;
}

const ACCOUNT_NAME: Record<string, string> = {
  [LedgerAccount.PLATFORM]: 'Platform',
  [LedgerAccount.COOP_FUND]: 'Cooperative fund',
  [LedgerAccount.CUSTOMER]: 'Customer',
  [LedgerAccount.WORKER]: 'Worker',
};

/**
 * Builds table rows for a set of entries.
 *
 * Links are resolved against the WHOLE ledger, not the filtered set, so a row still
 * says "Reversed by #…" when the reversal itself is filtered out of view.
 */
function toRows(entries: LedgerEntry[]): LedgerRow[] {
  const { ledger, bookings, workers } = adminState();
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const workerNameById = new Map(workers.map((worker) => [worker.id, worker.name]));

  const reversedBy = new Map<string, string>();
  const releasedBy = new Map<string, string>();
  for (const candidate of ledger) {
    if (candidate.reversalOf) reversedBy.set(candidate.reversalOf, candidate.id);
    if (candidate.releaseOf) releasedBy.set(candidate.releaseOf, candidate.id);
  }

  return entries.map((entry) => {
    const booking = entry.bookingId ? bookingById.get(entry.bookingId) : undefined;

    let partyName = ACCOUNT_NAME[entry.account] ?? entry.account;
    if (entry.account === LedgerAccount.WORKER && entry.subjectId) {
      partyName = workerNameById.get(entry.subjectId) ?? partyName;
    } else if (entry.account === LedgerAccount.CUSTOMER && booking) {
      partyName = booking.customerName;
    }

    let status: LedgerRowStatus = 'POSTED';
    if (entry.reversalOf) status = 'REVERSAL';
    else if (entry.releaseOf) status = 'RELEASE';
    else if (reversedBy.has(entry.id)) status = 'REVERSED';
    else if (entry.type === LedgerEntryType.WORKER_PAYOUT) {
      status = releasedBy.has(entry.id) ? 'RELEASED' : 'AWAITING_RELEASE';
    }

    return {
      entry,
      bookingReference: booking?.reference,
      partyName,
      status,
      reversedById: reversedBy.get(entry.id),
      releasedById: releasedBy.get(entry.id),
      sign: entry.direction === LedgerDirection.CREDIT ? 1 : -1,
    };
  });
}

/** The ledger as table rows, filtered exactly as `listLedger` filters. */
export async function listLedgerRows(filter: LedgerFilter = {}): Promise<LedgerRow[]> {
  const entries = await listLedger(filter);
  return toRows(entries);
}

/**
 * Issues a reversal: a NEW entry that cancels an existing one.
 *
 * The original row is not touched in any way. The reversal carries the same account,
 * amount, party and booking, the opposite direction, and `reversalOf` pointing back —
 * so the pair nets to zero and each can be found from the other.
 *
 * Refused, with a reason, when the entry is already reversed (a second reversal would
 * cancel it twice), when the entry is itself a reversal (stacking corrections hides
 * what happened), and when a payout has already been released to a bank, where money
 * has actually left and a ledger row alone would misstate that.
 */
export async function issueReversal(entryId: string, reason: string): Promise<LedgerEntry> {
  const state = adminState();
  const original = state.ledger.find((entry) => entry.id === entryId);
  if (!original) throw new Error(`No ledger entry with id ${entryId}.`);

  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error('Write down why this is being reversed. Auditors read this reason.');
  }
  if (original.reversalOf) {
    throw new Error(
      'This row is already a reversal. To correct it, issue a fresh entry rather than reversing a reversal.',
    );
  }
  if (state.ledger.some((entry) => entry.reversalOf === original.id)) {
    throw new Error(
      'This row has already been reversed, so reversing it again would cancel it twice.',
    );
  }
  if (state.ledger.some((entry) => entry.releaseOf === original.id)) {
    throw new Error(
      "This payout has already reached the worker's bank. Recover it with the worker first, then record the recovery.",
    );
  }

  const reversal: LedgerEntry = {
    id: `rev_${original.id}`,
    type: LedgerEntryType.ADJUSTMENT,
    account: original.account,
    direction:
      original.direction === LedgerDirection.CREDIT
        ? LedgerDirection.DEBIT
        : LedgerDirection.CREDIT,
    amount: original.amount,
    ...(original.subjectId ? { subjectId: original.subjectId } : {}),
    ...(original.bookingId ? { bookingId: original.bookingId } : {}),
    description: `Reversal: ${trimmed}`,
    referenceKey: `${original.id}:reversal`,
    reversalOf: original.id,
    createdAt: SEED_NOW.toISOString(),
  };

  await appendEntries([reversal]);
  return reversal;
}

/** A worker payout, with the release that sent it if there is one. */
export interface PayoutRow {
  payout: LedgerEntry;
  workerName: string;
  bookingReference?: string;
  released: boolean;
  release?: LedgerEntry;
}

/**
 * Worker payouts, pending or released.
 *
 * Reversed payouts are left out of both lists: a cancelled payout is neither owed nor
 * paid, and showing it as pending would invite someone to release it.
 */
export async function listPayouts(status: 'PENDING' | 'RELEASED'): Promise<PayoutRow[]> {
  const { ledger, workers, bookings } = adminState();
  const workerNameById = new Map(workers.map((worker) => [worker.id, worker.name]));
  const referenceById = new Map(bookings.map((booking) => [booking.id, booking.reference]));

  const reversed = new Set<string>();
  const releaseOf = new Map<string, LedgerEntry>();
  for (const entry of ledger) {
    if (entry.reversalOf) reversed.add(entry.reversalOf);
    if (entry.releaseOf) releaseOf.set(entry.releaseOf, entry);
  }

  const rows: PayoutRow[] = ledger
    .filter((entry) => entry.type === LedgerEntryType.WORKER_PAYOUT && !reversed.has(entry.id))
    .map((payout) => {
      const release = releaseOf.get(payout.id);
      return {
        payout,
        workerName: (payout.subjectId && workerNameById.get(payout.subjectId)) || 'Worker',
        bookingReference: payout.bookingId ? referenceById.get(payout.bookingId) : undefined,
        released: Boolean(release),
        ...(release ? { release } : {}),
      };
    })
    .filter((row) => (status === 'PENDING' ? !row.released : row.released));

  return respond(rows.sort((a, b) => b.payout.createdAt.localeCompare(a.payout.createdAt)));
}

/**
 * Releases a batch of payouts to the workers' banks.
 *
 * Appends one release row per payout, each with its own trace ID for chasing a
 * delayed transfer. Payouts already released or reversed are skipped and counted
 * rather than failing the batch: the batch was selected on screen, and the screen can
 * be a moment out of date.
 */
export async function releasePayouts(
  payoutIds: string[],
): Promise<{ released: LedgerEntry[]; skipped: number }> {
  const state = adminState();
  const byId = new Map(state.ledger.map((entry) => [entry.id, entry]));
  const alreadyReleased = new Set(
    state.ledger.filter((entry) => entry.releaseOf).map((entry) => entry.releaseOf as string),
  );
  const reversed = new Set(
    state.ledger.filter((entry) => entry.reversalOf).map((entry) => entry.reversalOf as string),
  );

  const at = SEED_NOW.toISOString();
  const released: LedgerEntry[] = [];
  let skipped = 0;

  for (const id of new Set(payoutIds)) {
    const payout = byId.get(id);
    if (
      !payout ||
      payout.type !== LedgerEntryType.WORKER_PAYOUT ||
      alreadyReleased.has(id) ||
      reversed.has(id)
    ) {
      skipped += 1;
      continue;
    }
    released.push({
      id: `rel_${payout.id}`,
      type: LedgerEntryType.PAYOUT_RELEASE,
      account: LedgerAccount.WORKER,
      direction: LedgerDirection.DEBIT,
      amount: payout.amount,
      ...(payout.subjectId ? { subjectId: payout.subjectId } : {}),
      ...(payout.bookingId ? { bookingId: payout.bookingId } : {}),
      description: "Released to the worker's bank account.",
      referenceKey: `${payout.id}:release`,
      /* Built from the payout id, so the same release always carries the same trace. */
      traceId: `tr_${payout.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 16).padEnd(16, '0')}`,
      releaseOf: payout.id,
      createdAt: at,
    });
  }

  if (released.length > 0) await appendEntries(released);
  return { released, skipped };
}

/**
 * The three parts of a gross amount, from the same function the ledger posts with.
 *
 * For the finance hub's worked example, so the example is computed rather than
 * written: if the split changes, the sentence changes with it.
 */
export function previewSplit(gross: Paise): { worker: Paise; platform: Paise; coopFund: Paise } {
  return splitAmount(gross);
}
