import {
  BookingStatus,
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  type Id,
  type LedgerEntry,
} from '@sahayo/shared';

import type { Settlement } from '../types';
import { mockBookings } from './bookings';
import { mockCustomers } from './customers';
import { DEMO_WORKER_ID } from './partner';
import { dayOfMonthsAgo } from './time';

/**
 * Three months of this worker's earnings, as WORKER_PAYOUT ledger credits.
 *
 * Two sources, and both are real ledger rows. Every completed or settled
 * booking in `bookings.ts` contributes its worker share, linked by bookingId.
 * Older jobs that are not in the fifteen-row booking list fill out the three
 * months; they carry no bookingId, because pointing at a booking that does not
 * exist is exactly what the integrity check refuses.
 *
 * Which entries have been paid out is recorded in `mockSettlements`, not on the
 * entry: `LedgerEntry` has no settlement field, and adding one would be the
 * drift `satisfies` is there to catch.
 */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const payout = (id: string, amount: number, createdAt: string, bookingId?: Id): LedgerEntry => ({
  id,
  type: LedgerEntryType.WORKER_PAYOUT,
  account: LedgerAccount.WORKER,
  direction: LedgerDirection.CREDIT,
  amount,
  subjectId: DEMO_WORKER_ID,
  bookingId,
  referenceKey: `payout:${bookingId ?? id}`,
  createdAt,
});

/** The sub-category each earning was for, for the transaction row label. */
export const subCategoryByEntryId: Record<Id, Id> = {};

/**
 * The customer each earning came from, for the transaction row's name and
 * initials. An index beside the ledger, like the sub-category, because
 * `LedgerEntry` has no customer field.
 */
export const customerByEntryId: Record<Id, Id> = {};

const finished = mockBookings.filter(
  (booking) => booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.SETTLED,
);

const fromBookings = finished.map((booking) => {
  const id = `earn_${booking.id}`;
  subCategoryByEntryId[id] = booking.serviceCategoryId;
  customerByEntryId[id] = booking.customerId;
  return payout(id, booking.fare?.workerShare ?? 0, booking.updatedAt, booking.id);
});

/** Older jobs: [monthsAgo, day of month, worker share in paise, sub-category]. */
const HISTORY: [number, number, number, Id][] = [
  [0, 2, 26910, 'sub_basic_electrical'],
  [0, 5, 80910, 'sub_motors_pumps'],
  [1, 3, 17910, 'sub_basic_electrical'],
  [1, 6, 116910, 'sub_wiring_installation'],
  [1, 9, 31410, 'sub_basic_electrical'],
  [1, 12, 58410, 'sub_power_backup_solar'],
  [1, 16, 22410, 'sub_basic_electrical'],
  [1, 19, 67410, 'sub_motors_pumps'],
  [1, 23, 40410, 'sub_power_backup_solar'],
  [1, 27, 26910, 'sub_basic_electrical'],
  [2, 2, 134910, 'sub_wiring_installation'],
  [2, 7, 31410, 'sub_basic_electrical'],
  [2, 11, 49410, 'sub_power_backup_solar'],
  [2, 15, 17910, 'sub_basic_electrical'],
  [2, 20, 80910, 'sub_motors_pumps'],
  [2, 24, 22410, 'sub_basic_electrical'],
  [2, 28, 58410, 'sub_power_backup_solar'],
];

const fromHistory = HISTORY.map(([monthsAgo, day, amount, subCategoryId], index) => {
  const id = `earn_hist_${String(index + 1).padStart(2, '0')}`;
  subCategoryByEntryId[id] = subCategoryId;
  customerByEntryId[id] = mockCustomers[index % mockCustomers.length].id;
  return payout(id, amount, dayOfMonthsAgo(monthsAgo, day));
});

export const mockEarnings = [...fromBookings, ...fromHistory].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
) satisfies LedgerEntry[];

/**
 * Payouts for bookings still COMPLETED — the work is done and the money is
 * earned, but it has not been transferred. These, and only these, make up the
 * unsettled balance the Earnings screen offers to settle.
 *
 * Deciding by booking status rather than by calendar month matters: a SETTLED
 * booking from last week must not reappear as money still owed just because
 * it happened to fall in the current month.
 */
const awaitingPayout = new Set(
  finished.filter((booking) => booking.status === BookingStatus.COMPLETED).map((booking) => `earn_${booking.id}`),
);

function monthsAgoOf(iso: string): number {
  const at = new Date(iso);
  const now = new Date();
  return (now.getFullYear() - at.getFullYear()) * 12 + (now.getMonth() - at.getMonth());
}

/** One transfer per month for everything paid out in it. */
function settlementFor(monthsAgo: number, reference: string): Settlement | null {
  const entries = mockEarnings.filter(
    (entry) => monthsAgoOf(entry.createdAt) === monthsAgo && !awaitingPayout.has(entry.id),
  );
  if (entries.length === 0) return null;

  const latest = Math.max(...entries.map((entry) => new Date(entry.createdAt).getTime()));
  const settledAt =
    monthsAgo >= 1
      ? dayOfMonthsAgo(monthsAgo - 1, 1, 10)
      : new Date(Math.min(latest + 2 * HOUR, Date.now() - 5 * MINUTE)).toISOString();

  return {
    id: `stl_m${monthsAgo}`,
    amount: entries.reduce((sum, entry) => sum + entry.amount, 0),
    entryIds: entries.map((entry) => entry.id),
    settledAt,
    reference,
    method: 'upi',
  };
}

export const mockSettlements: Settlement[] = [
  settlementFor(0, 'UTR6230518844'),
  settlementFor(1, 'UTR6118402937'),
  settlementFor(2, 'UTR5907731285'),
].filter((entry): entry is Settlement => entry !== null);
