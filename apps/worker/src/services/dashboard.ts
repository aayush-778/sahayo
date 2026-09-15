import { useMemo } from 'react';
import type { Booking, LedgerEntry, Paise } from '@sahayo/shared';

import { useSessionStore } from '../store/session';
import { COMPLETED_STATUSES, PENDING_STATUSES } from './bookings';

/**
 * The dashboard's Today's Overview figures, derived from the session ledger and
 * bookings — never stored, so accepting or completing a job moves them at once.
 */

export interface TodayOverview {
  /** Bookings taken for today, in hand or already done. Cancellations excluded. */
  jobsToday: number;
  /** Worker payouts credited today, in integer paise. */
  earningsToday: Paise;
  /**
   * Every job this worker has finished. Counted from payout credits, one per
   * finished job, so older jobs outside the recent booking list are included.
   */
  totalCompleted: number;
}

function sameDay(iso: string, now: Date): boolean {
  const at = new Date(iso);
  return at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth() && at.getDate() === now.getDate();
}

function isForToday(booking: Booking, now: Date): boolean {
  if (!PENDING_STATUSES.has(booking.status) && !COMPLETED_STATUSES.has(booking.status)) return false;
  return sameDay(booking.scheduledFor ?? booking.createdAt, now);
}

function overviewOf(bookings: Booking[], earnings: LedgerEntry[], now: Date): TodayOverview {
  return {
    jobsToday: bookings.filter((booking) => isForToday(booking, now)).length,
    earningsToday: earnings.filter((entry) => sameDay(entry.createdAt, now)).reduce((sum, entry) => sum + entry.amount, 0),
    totalCompleted: earnings.length,
  };
}

export function useTodayOverview(): TodayOverview {
  const bookings = useSessionStore((state) => state.bookings);
  const earnings = useSessionStore((state) => state.earnings);
  return useMemo(() => overviewOf(bookings, earnings, new Date()), [bookings, earnings]);
}

export function getTodayOverview(): TodayOverview {
  const { bookings, earnings } = useSessionStore.getState();
  return overviewOf(bookings, earnings, new Date());
}
