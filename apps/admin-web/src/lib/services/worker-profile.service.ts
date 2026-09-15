import type { AdminBooking, KycSubmission, Paise } from '@sahayo/shared';
import { splitAmount } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';
import type { Period } from './ledger.service';
import { DAY_MS, SEED_NOW } from '@/lib/dates';
import { compareIso } from '@/lib/dates';

/** One row of a worker's earnings table: a booking and where its money went. */
export interface WorkerEarning {
  bookingId: string;
  reference: string;
  completedAt: string;
  category: string;
  customerName: string;
  /** What the customer paid. */
  gross: Paise;
  /** The three parts, which sum to `gross` exactly. */
  workerShare: Paise;
  platformShare: Paise;
  coopFundShare: Paise;
}

/** The ISO cutoff a period starts at, or undefined for ALL. */
function periodStart(period: Period): string | undefined {
  if (period === 'ALL') return undefined;
  const days = period === '7D' ? 7 : period === '30D' ? 30 : 90;
  return new Date(SEED_NOW.getTime() - days * DAY_MS).toISOString();
}

/**
 * A worker's earnings, one row per completed booking.
 *
 * The split is recomputed with `splitAmount` rather than read back from the
 * ledger, so the three figures on a row are guaranteed to sum to that row's gross
 * — the same guarantee the finance hub makes. Reading three ledger entries per row
 * would also show a reversed payout as if it had been paid.
 */
export async function getWorkerEarnings(
  workerId: string,
  period: Period = '30D',
): Promise<WorkerEarning[]> {
  const { bookings } = adminState();
  const since = periodStart(period);

  const rows = bookings
    .filter((booking) => {
      if (booking.workerId !== workerId) return false;
      if (!booking.completedAt) return false;
      if (since && booking.completedAt < since) return false;
      return true;
    })
    .map((booking) => {
      const split = splitAmount(booking.amount);
      return {
        bookingId: booking.id,
        reference: booking.reference,
        completedAt: booking.completedAt as string,
        category: booking.category,
        customerName: booking.customerName,
        gross: booking.amount,
        workerShare: split.worker,
        platformShare: split.platform,
        coopFundShare: split.coopFund,
      };
    });

  /* Newest first: an earnings statement is read from the most recent job. */
  return respond(rows.sort((a, b) => compareIso(b.completedAt, a.completedAt)));
}

/** A worker's bookings, newest first, for the profile's Bookings tab. */
export async function getWorkerBookings(workerId: string, limit = 25): Promise<AdminBooking[]> {
  const { bookings } = adminState();
  const rows = bookings
    .filter((booking) => booking.workerId === workerId)
    .sort((a, b) => compareIso(b.createdAt, a.createdAt))
    .slice(0, limit);
  return respond(rows);
}

/**
 * A worker's submitted documents.
 *
 * Returns the submission records as they are — which never contain an Aadhaar
 * number. `aadhaarRef` is an opaque handle and `aadhaarLast4` is the only part of
 * the number that exists anywhere in this codebase. The Documents tab renders the
 * masked form from those four digits and reveals nothing without going through
 * `revealAadhaar`, which logs first.
 */
export async function getWorkerDocuments(workerId: string): Promise<KycSubmission[]> {
  const { kycQueue } = adminState();
  const rows = kycQueue
    .filter((submission) => submission.workerId === workerId)
    .sort((a, b) => compareIso(b.submittedAt, a.submittedAt));
  return respond(rows);
}

/** Totals for the header of the Earnings tab. */
export interface WorkerEarningsSummary {
  gross: Paise;
  workerShare: Paise;
  platformShare: Paise;
  coopFundShare: Paise;
  bookingCount: number;
}

/**
 * Sums a set of earnings rows.
 *
 * A pure function over rows the caller already has, not a second service call:
 * fetching the same bookings twice would cost two round trips and let the header
 * disagree with the table under it.
 */
export function summariseEarnings(rows: WorkerEarning[]): WorkerEarningsSummary {
  return rows.reduce<WorkerEarningsSummary>(
    (acc, row) => ({
      gross: acc.gross + row.gross,
      workerShare: acc.workerShare + row.workerShare,
      platformShare: acc.platformShare + row.platformShare,
      coopFundShare: acc.coopFundShare + row.coopFundShare,
      bookingCount: acc.bookingCount + 1,
    }),
    { gross: 0, workerShare: 0, platformShare: 0, coopFundShare: 0, bookingCount: 0 },
  );
}
