import { COOP_FUND_SHARE, WORKER_SHARE, type Paise } from '@sahayo/shared';
import { DAY_MS, SEED_NOW } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';
import { getFundTotals } from './fund.service';

export interface DashboardSummary {
  /** The hero figure: what the cooperative fund holds right now. */
  fundBalance: Paise;
  /** Month-on-month change in the fund, as a signed percentage. */
  fundDeltaPercent: number;
  fundGoal: Paise;
  /** Members holding a share, which is every verified worker. */
  memberCount: number;
  /** The share of each booking that routes to the fund, as a percentage. */
  fundSharePercent: number;

  workerPayoutsThisWeek: Paise;
  workerPayoutsDeltaPercent: number;

  activeWorkers: number;
  totalWorkers: number;

  bookingsToday: number;
  /** Change against the average of the previous seven days, not against yesterday. */
  bookingsTodayDeltaPercent: number;
}

/** Percentage change from `previous` to `current`, guarding a zero base. */
function deltaPercent(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Every figure in the dashboard's top row, in one call.
 *
 * One call rather than five so the row appears together instead of popping in
 * card by card as separate 120–300ms delays resolve. Each number is computed
 * here, not in the page — a component that did its own arithmetic over the
 * collections would be a second definition of the same figure, free to disagree
 * with the finance hub.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { bookings, workers } = adminState();
  const fund = await getFundTotals();

  const now = SEED_NOW.getTime();
  const weekStart = new Date(now - 7 * DAY_MS).toISOString();
  const priorWeekStart = new Date(now - 14 * DAY_MS).toISOString();
  /*
    * Rolling 24-hour windows, not calendar dates. The seed timestamps bookings
    * through the evening, so a calendar-prefix comparison dropped most of
    * "yesterday" into the day before it and produced deltas in the thousands of
    * percent.
    */
  const dayStart = new Date(now - DAY_MS).toISOString();

  /*
   * Payouts are taken from the bookings that completed in the window rather than
   * by summing ledger rows, because a reversal would otherwise make the week look
   * poorer than the work actually done. The ledger is the record of movements;
   * this is the question "how much work did workers get paid for".
   */
  const paidInRange = (from: string, to?: string): Paise =>
    bookings
      .filter((booking) => {
        if (!booking.completedAt) return false;
        if (booking.completedAt < from) return false;
        if (to && booking.completedAt >= to) return false;
        return true;
      })
      .reduce((sum, booking) => sum + Math.round(booking.amount * WORKER_SHARE), 0);

  const thisWeek = paidInRange(weekStart);
  const priorWeek = paidInRange(priorWeekStart, weekStart);

  const bookingsToday = bookings.filter((booking) => booking.createdAt >= dayStart).length;

  /*
    * Compared against the previous seven days' daily average, not against
    * yesterday. At roughly ten bookings a day, one day against another is noise:
    * a quiet Tuesday against a busy Wednesday swings the figure by hundreds of
    * percent and says nothing. The weekly baseline is the comparison a reader can
    * act on.
    */
  const baselineDays = 7;
  const baselineStart = new Date(now - (baselineDays + 1) * DAY_MS).toISOString();
  const baselineCount = bookings.filter(
    (booking) => booking.createdAt >= baselineStart && booking.createdAt < dayStart,
  ).length;
  const baselinePerDay = baselineCount / baselineDays;

  /*
   * The fund's month-on-month movement. Contributed less disbursed this month,
   * against the balance it started the month with.
   */
  const netThisMonth = fund.contributedThisMonth - fund.disbursedThisMonth;
  const balanceAtMonthStart = fund.balance - netThisMonth;

  return respond({
    fundBalance: fund.balance,
    fundDeltaPercent: deltaPercent(fund.balance, balanceAtMonthStart),
    fundGoal: fund.communityGoal,
    memberCount: fund.memberCount,
    fundSharePercent: Math.round(COOP_FUND_SHARE * 100),

    workerPayoutsThisWeek: thisWeek,
    workerPayoutsDeltaPercent: deltaPercent(thisWeek, priorWeek),

    activeWorkers: workers.filter((worker) => worker.isOnline).length,
    totalWorkers: workers.length,

    bookingsToday,
    bookingsTodayDeltaPercent: deltaPercent(bookingsToday, baselinePerDay),
  });
}
