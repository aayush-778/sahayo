import { useMemo } from 'react';
import {
  BookingStatus,
  COOP_FUND_SHARE,
  WORKER_SHARE,
  type Booking,
  type Id,
  type LedgerEntry,
  type Paise,
  type User,
} from '@sahayo/shared';

import { findCustomer } from './people';
import { useSessionStore } from '../store/session';
import type { EarningsPeriod, Settlement } from '../types';

/**
 * Earnings: what has been earned, what has been paid out, and settling the rest.
 *
 * "Received since last settlement" is derived, never stored — it is every
 * payout credit not yet covered by a settlement. A stored balance would be one
 * more number free to disagree with the ledger it is supposed to summarise.
 */

export const EARNINGS_PERIODS: readonly EarningsPeriod[] = ['this_month', 'last_month', 'three_months'];

const time = (iso: string) => new Date(iso).getTime();
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function monthsAgoOf(iso: string, now: Date): number {
  const at = new Date(iso);
  return (now.getFullYear() - at.getFullYear()) * 12 + (now.getMonth() - at.getMonth());
}

function inPeriod(iso: string, period: EarningsPeriod, now: Date): boolean {
  const monthsAgo = monthsAgoOf(iso, now);
  if (period === 'this_month') return monthsAgo === 0;
  if (period === 'last_month') return monthsAgo === 1;
  return monthsAgo >= 0 && monthsAgo <= 2;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function settledIds(settlements: Settlement[]): Set<Id> {
  return new Set(settlements.flatMap((entry) => entry.entryIds));
}

/**
 * What one payout put into the cooperative fund.
 *
 * Exact for a job with a fare on record — the fare's own coopFundShare. Older
 * payouts carry only the worker's share, so the fund share is worked back from
 * it with the same ratios @sahayo/shared uses to split every fare.
 */
export function contributionFor(entry: LedgerEntry, bookings: Booking[]): Paise {
  const booking = entry.bookingId ? bookings.find((candidate) => candidate.id === entry.bookingId) : undefined;
  if (booking?.fare) return booking.fare.coopFundShare;
  return Math.round((entry.amount * COOP_FUND_SHARE) / WORKER_SHARE);
}

export interface EarningRow {
  entry: LedgerEntry;
  customer?: User;
  subCategoryId?: Id;
  settled: boolean;
}

export interface EarningsMonth {
  /** YYYY-MM, sortable. */
  key: string;
  year: number;
  /** 0-11. Localised at the render edge. */
  month: number;
  total: Paise;
  rows: EarningRow[];
}

export interface PeriodSummary {
  total: Paise;
  jobs: number;
  average: Paise;
  /** Earned in the period and not yet settled. */
  pending: Paise;
  months: EarningsMonth[];
}

function toRows(
  entries: LedgerEntry[],
  settlements: Settlement[],
  customers: Record<Id, Id>,
  subCategories: Record<Id, Id>,
): EarningRow[] {
  const paid = settledIds(settlements);
  return entries.map((entry) => ({
    entry,
    customer: findCustomer(customers[entry.id] ?? ''),
    subCategoryId: subCategories[entry.id],
    settled: paid.has(entry.id),
  }));
}

function summarise(
  period: EarningsPeriod,
  earnings: LedgerEntry[],
  settlements: Settlement[],
  customers: Record<Id, Id>,
  subCategories: Record<Id, Id>,
  now: Date,
): PeriodSummary {
  const entries = earnings
    .filter((entry) => inPeriod(entry.createdAt, period, now))
    .sort((a, b) => time(b.createdAt) - time(a.createdAt));
  const rows = toRows(entries, settlements, customers, subCategories);

  const months: EarningsMonth[] = [];
  for (const row of rows) {
    const at = new Date(row.entry.createdAt);
    const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}`;
    let month = months.find((candidate) => candidate.key === key);
    if (!month) {
      month = { key, year: at.getFullYear(), month: at.getMonth(), total: 0, rows: [] };
      months.push(month);
    }
    month.total += row.entry.amount;
    month.rows.push(row);
  }

  const total = rows.reduce((sum, row) => sum + row.entry.amount, 0);
  return {
    total,
    jobs: rows.length,
    average: rows.length ? Math.round(total / rows.length) : 0,
    pending: rows.filter((row) => !row.settled).reduce((sum, row) => sum + row.entry.amount, 0),
    months,
  };
}

export function useEarningsPeriod(period: EarningsPeriod): PeriodSummary {
  const earnings = useSessionStore((state) => state.earnings);
  const settlements = useSessionStore((state) => state.settlements);
  const customers = useSessionStore((state) => state.customerByEntryId);
  const subCategories = useSessionStore((state) => state.subCategoryByEntryId);
  return useMemo(
    () => summarise(period, earnings, settlements, customers, subCategories, new Date()),
    [period, earnings, settlements, customers, subCategories],
  );
}

export function getEarningsPeriod(period: EarningsPeriod): PeriodSummary {
  const state = useSessionStore.getState();
  return summarise(period, state.earnings, state.settlements, state.customerByEntryId, state.subCategoryByEntryId, new Date());
}

export interface PayoutState {
  /** Received since the last settlement: every payout not yet settled. */
  unsettled: Paise;
  unsettledCount: number;
  lastSettlement?: Settlement;
}

function payoutOf(earnings: LedgerEntry[], settlements: Settlement[]): PayoutState {
  const paid = settledIds(settlements);
  const due = earnings.filter((entry) => !paid.has(entry.id));
  const lastSettlement = [...settlements].sort((a, b) => time(b.settledAt) - time(a.settledAt))[0];
  return { unsettled: due.reduce((sum, entry) => sum + entry.amount, 0), unsettledCount: due.length, lastSettlement };
}

export function usePayoutState(): PayoutState {
  const earnings = useSessionStore((state) => state.earnings);
  const settlements = useSessionStore((state) => state.settlements);
  return useMemo(() => payoutOf(earnings, settlements), [earnings, settlements]);
}

export function getPayoutState(): PayoutState {
  const { earnings, settlements } = useSessionStore.getState();
  return payoutOf(earnings, settlements);
}

/** The jobs that make up "received since last settlement", newest first. */
export function useUnsettledRows(): EarningRow[] {
  const earnings = useSessionStore((state) => state.earnings);
  const settlements = useSessionStore((state) => state.settlements);
  const customers = useSessionStore((state) => state.customerByEntryId);
  const subCategories = useSessionStore((state) => state.subCategoryByEntryId);
  return useMemo(() => {
    const paid = settledIds(settlements);
    const due = earnings.filter((entry) => !paid.has(entry.id)).sort((a, b) => time(b.createdAt) - time(a.createdAt));
    return toRows(due, settlements, customers, subCategories);
  }, [earnings, settlements, customers, subCategories]);
}

export function useSettlementHistory(): Settlement[] {
  const settlements = useSessionStore((state) => state.settlements);
  return useMemo(() => [...settlements].sort((a, b) => time(b.settledAt) - time(a.settledAt)), [settlements]);
}

export interface DayTotal {
  /** YYYY-MM-DD. */
  key: string;
  /** 0 = Sunday. Localised at the render edge. */
  weekday: number;
  amount: Paise;
  isToday: boolean;
}

/** Earnings for each of the last seven days, oldest first, today last. */
export function useLastSevenDays(): DayTotal[] {
  const earnings = useSessionStore((state) => state.earnings);
  return useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index));
      return {
        key: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
        weekday: day.getDay(),
        amount: earnings
          .filter((entry) => sameDay(new Date(entry.createdAt), day))
          .reduce((sum, entry) => sum + entry.amount, 0),
        isToday: index === 6,
      };
    });
  }, [earnings]);
}

export type SettleResult = { ok: true; settlement: Settlement } | { ok: false; reason: 'nothing_to_settle' };

/** How long the mock bank transfer takes. Long enough to see it happen. */
export const SETTLEMENT_PROCESSING_MS = 1500;

/**
 * Pays out every unsettled earning in one transfer.
 *
 * After the processing delay the unsettled figure drops to zero and a
 * settlement row appears in history — both derived from the same ledger, so
 * there is no second number to forget. The jobs it covered move from
 * Completed to Paid out in Bookings.
 *
 * What is due is re-read after the delay, so a job completed while the
 * transfer was running is neither silently included nor lost.
 */
export async function settleEarnings(): Promise<SettleResult> {
  if (payoutOf(useSessionStore.getState().earnings, useSessionStore.getState().settlements).unsettledCount === 0) {
    return { ok: false, reason: 'nothing_to_settle' };
  }

  await pause(SETTLEMENT_PROCESSING_MS);

  const { earnings, settlements } = useSessionStore.getState();
  const paid = settledIds(settlements);
  const due = earnings.filter((entry) => !paid.has(entry.id));
  if (due.length === 0) return { ok: false, reason: 'nothing_to_settle' };

  const now = new Date();
  const settlement: Settlement = {
    id: `stl_${now.getTime().toString(36)}`,
    amount: due.reduce((sum, entry) => sum + entry.amount, 0),
    entryIds: due.map((entry) => entry.id),
    settledAt: now.toISOString(),
    reference: `UTR${String(now.getTime()).slice(-10)}`,
    method: 'upi',
  };
  const coveredBookings = new Set(due.map((entry) => entry.bookingId).filter((id): id is Id => Boolean(id)));

  useSessionStore.setState((state) => ({
    settlements: [settlement, ...state.settlements],
    bookings: state.bookings.map((booking) =>
      coveredBookings.has(booking.id) && booking.status === BookingStatus.COMPLETED
        ? { ...booking, status: BookingStatus.SETTLED }
        : booking,
    ),
    timelines: Object.fromEntries(
      Object.entries(state.timelines).map(([id, timeline]) =>
        coveredBookings.has(id) ? [id, { ...timeline, [BookingStatus.SETTLED]: settlement.settledAt }] : [id, timeline],
      ),
    ),
  }));
  return { ok: true, settlement };
}
