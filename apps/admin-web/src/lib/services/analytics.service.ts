import { WORKER_CATEGORIES, type WorkerCategory } from '@sahayo/shared';
import { DAY_MS, SEED_NOW } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';

/** A readable label for a category constant. */
export function categoryLabel(category: WorkerCategory | string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export interface CategorySlice {
  category: WorkerCategory | 'OTHER';
  label: string;
  count: number;
  /** Share of the total, 0–1. */
  share: number;
}

/**
 * Hires by category, with the tail collapsed.
 *
 * The top five categories are returned individually and the rest are folded into
 * a single OTHER slice. Eight slices is past the point where a donut stops being
 * readable, and the legend below it would turn into a list nobody reads.
 */
export async function getHiringByCategory(topN = 5): Promise<CategorySlice[]> {
  const { bookings } = adminState();

  const counts = new Map<string, number>();
  for (const booking of bookings) {
    const key = booking.category.toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = bookings.length || 1;
  const ranked = [...counts.entries()].sort(([, a], [, b]) => b - a);

  const head = ranked.slice(0, topN);
  const tailCount = ranked.slice(topN).reduce((sum, [, count]) => sum + count, 0);

  const slices: CategorySlice[] = head.map(([category, count]) => ({
    category: category as WorkerCategory,
    label: categoryLabel(category),
    count,
    share: Math.round((count / total) * 1000) / 1000,
  }));

  if (tailCount > 0) {
    slices.push({
      category: 'OTHER',
      label: 'Other',
      count: tailCount,
      share: Math.round((tailCount / total) * 1000) / 1000,
    });
  }

  return respond(slices);
}

/** The mix of trades across the worker cohort, rather than across bookings. */
export async function getCategoryMix(): Promise<CategorySlice[]> {
  const { workers } = adminState();
  const total = workers.length || 1;

  const slices: CategorySlice[] = WORKER_CATEGORIES.map((category) => {
    const count = workers.filter((worker) => worker.category === category).length;
    return {
      category,
      label: categoryLabel(category),
      count,
      share: Math.round((count / total) * 1000) / 1000,
    };
  });

  return respond(slices.sort((a, b) => b.count - a.count));
}

export interface CategoryJobCount {
  category: WorkerCategory;
  label: string;
  jobs: number;
}

/**
 * Jobs taken this week, by category.
 *
 * Read from the workers' own `jobsThisWeek` rather than from bookings, because
 * that is the field the equity dispatcher balances and the directory displays. If
 * this were computed from bookings instead, the dashboard's bar chart and the
 * Workers directory could disagree, and the directory is the one people trust.
 */
export async function getJobsThisWeekByCategory(): Promise<CategoryJobCount[]> {
  const { workers } = adminState();

  const counts = WORKER_CATEGORIES.map((category) => ({
    category,
    label: categoryLabel(category),
    jobs: workers
      .filter((worker) => worker.category === category)
      .reduce((sum, worker) => sum + worker.jobsThisWeek, 0),
  }));

  return respond(counts.sort((a, b) => b.jobs - a.jobs));
}

export interface HeadlineStats {
  activeWorkers: number;
  totalWorkers: number;
  bookingsToday: number;
  bookingsYesterday: number;
  /** Verified workers, which is also the fund's membership. */
  verifiedWorkers: number;
  pendingVerifications: number;
  /** Workers at or below the under-allocation threshold. */
  underAllocatedWorkers: number;
}

/**
 * The figures the dashboard's stat row reads.
 *
 * One call rather than six, so the row's cards appear together instead of
 * popping in one at a time as separate delays resolve.
 */
export async function getHeadlineStats(): Promise<HeadlineStats> {
  const { workers, bookings } = adminState();

  const todayStart = SEED_NOW.toISOString().slice(0, 10);
  const yesterdayStart = new Date(SEED_NOW.getTime() - DAY_MS).toISOString().slice(0, 10);

  return respond({
    activeWorkers: workers.filter((worker) => worker.isOnline).length,
    totalWorkers: workers.length,
    bookingsToday: bookings.filter((booking) => booking.createdAt.startsWith(todayStart)).length,
    bookingsYesterday: bookings.filter((booking) => booking.createdAt.startsWith(yesterdayStart))
      .length,
    verifiedWorkers: workers.filter((worker) => worker.kycStatus === 'VERIFIED').length,
    pendingVerifications: workers.filter((worker) => worker.kycStatus === 'PENDING').length,
    underAllocatedWorkers: workers.filter((worker) => worker.jobsThisWeek <= 2).length,
  });
}

/* --- The analytics report ------------------------------------------------ */

export type AnalyticsPeriod = '7D' | '30D' | '90D';

export interface WorkShare {
  /** Verified workers, the only ones dispatch can offer work to. */
  workerCount: number;
  jobs: number;
  /** Share of the period's jobs taken by the busiest fifth of workers, 0–1. */
  topFifthShare: number;
  /** Share taken by the quieter half, 0–1. */
  bottomHalfShare: number;
  workersWithNoJobs: number;
  /** Workers grouped by how many jobs they took, lowest group first. */
  distribution: Array<{ label: string; workers: number }>;
}

export interface CategoryPerformance {
  label: string;
  bookings: number;
  /** Signed percentage change against the previous period of the same length. Absent for 90 days. */
  deltaPercent?: number;
  finishRate: number;
  averageValue: number;
}

export interface ZonePerformance {
  zoneId: string;
  zoneName: string;
  bookings: number;
  finishRate: number;
  cancelled: number;
  averageValue: number;
  gross: number;
  availableWorkers: number;
  underserved: boolean;
}

export interface AnalyticsReport {
  period: AnalyticsPeriod;
  bookings: number;
  gross: number;
  workShare: WorkShare;
  /** Bookings by weekday (Monday first) and hour of day, India Standard Time. */
  demandGrid: number[][];
  peak: { weekday: number; hour: number; bookings: number };
  categories: CategoryPerformance[];
  zones: ZonePerformance[];
  /** The last 13 weeks, oldest first: households and businesses that booked. */
  weeklyCustomers: Array<{ label: string; households: number; businesses: number }>;
  /** Businesses' share of the period's customers and of what finished jobs cost. */
  businessShare: { customers: number; spend: number };
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const ENDED_UNFINISHED: ReadonlySet<string> = new Set(['CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_WORKER', 'EXPIRED_NO_ACCEPT']);
const isFinished = (status: string): boolean => status === 'COMPLETED' || status === 'SETTLED';

/**
 * Everything the Analytics page shows, for one period, in one call.
 *
 * Computed from the same bookings, workers and zones every other page reads, so a
 * figure here can be traced to the rows behind it. Where a period is compared with the
 * one before it, both are the same length; the 90-day view has no comparison because
 * the records do not reach back another 90 days.
 */
export async function getAnalyticsReport(period: AnalyticsPeriod): Promise<AnalyticsReport> {
  const { bookings, workers, zones } = adminState();
  const days = period === '7D' ? 7 : period === '30D' ? 30 : 90;
  const now = SEED_NOW.getTime();
  const start = new Date(now - days * DAY_MS).toISOString();
  const previousStart = new Date(now - 2 * days * DAY_MS).toISOString();
  const inPeriod = bookings.filter((booking) => booking.createdAt >= start);

  /* How evenly work is shared, among the workers dispatch can actually offer jobs to. */
  const verified = workers.filter((worker) => worker.kycStatus === 'VERIFIED');
  const jobsByWorker = new Map(verified.map((worker) => [worker.id, 0]));
  for (const booking of inPeriod) {
    if (booking.workerId && jobsByWorker.has(booking.workerId)) {
      jobsByWorker.set(booking.workerId, (jobsByWorker.get(booking.workerId) ?? 0) + 1);
    }
  }
  const counts = [...jobsByWorker.values()].sort((a, b) => b - a);
  const assigned = counts.reduce((sum, value) => sum + value, 0);
  const shareOf = (slice: number[]): number => (assigned ? slice.reduce((sum, value) => sum + value, 0) / assigned : 0);
  const maxJobs = counts[0] ?? 0;
  const width = Math.max(1, Math.ceil((maxJobs + 1) / 6));
  const distribution = Array.from({ length: Math.ceil((maxJobs + 1) / width) }, (_, index) => {
    const low = index * width;
    const high = low + width - 1;
    return {
      label: width === 1 ? String(low) : `${low}–${high}`,
      workers: counts.filter((value) => value >= low && value <= high).length,
    };
  });

  /* When jobs are booked, in India Standard Time. */
  const demandGrid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const booking of inPeriod) {
    const local = new Date(Date.parse(booking.createdAt) + IST_OFFSET_MS);
    const row = demandGrid[(local.getUTCDay() + 6) % 7] as number[];
    const hour = local.getUTCHours();
    row[hour] = (row[hour] ?? 0) + 1;
  }
  let peak = { weekday: 0, hour: 0, bookings: 0 };
  demandGrid.forEach((row, weekday) =>
    row.forEach((value, hour) => {
      if (value > peak.bookings) peak = { weekday, hour, bookings: value };
    }),
  );

  /* Trades, against the previous period of the same length. */
  const byCategory = new Map<string, { bookings: number; previous: number; finished: number; ended: number; value: number }>();
  for (const booking of bookings) {
    if (booking.createdAt < previousStart) continue;
    const row = byCategory.get(booking.category) ?? { bookings: 0, previous: 0, finished: 0, ended: 0, value: 0 };
    if (booking.createdAt >= start) {
      row.bookings += 1;
      if (isFinished(booking.status)) {
        row.finished += 1;
        row.ended += 1;
        row.value += booking.amount;
      } else if (ENDED_UNFINISHED.has(booking.status)) {
        row.ended += 1;
      }
    } else {
      row.previous += 1;
    }
    byCategory.set(booking.category, row);
  }
  const categories: CategoryPerformance[] = [...byCategory.entries()]
    .map(([label, row]) => ({
      label,
      bookings: row.bookings,
      ...(period !== '90D' && row.previous > 0
        ? { deltaPercent: Math.round(((row.bookings - row.previous) / row.previous) * 1000) / 10 }
        : {}),
      finishRate: row.ended ? row.finished / row.ended : 0,
      averageValue: row.finished ? Math.round(row.value / row.finished) : 0,
    }))
    .sort((a, b) => b.bookings - a.bookings);

  /* Zones. Cover is judged on the last seven days, the same test the dashboard uses. */
  const weekStart = new Date(now - 7 * DAY_MS).toISOString();
  const zoneRows = zones.map((zone) => {
    const zoneBookings = inPeriod.filter((booking) => booking.zoneId === zone.id);
    const finished = zoneBookings.filter((booking) => isFinished(booking.status));
    const cancelled = zoneBookings.filter((booking) => ENDED_UNFINISHED.has(booking.status)).length;
    const gross = finished.reduce((sum, booking) => sum + booking.amount, 0);
    const available = workers.filter((worker) => worker.zoneId === zone.id && worker.isOnline && !worker.isOnJob).length;
    const weekOrders = bookings.filter((booking) => booking.zoneId === zone.id && booking.createdAt >= weekStart).length;
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      bookings: zoneBookings.length,
      finishRate: finished.length + cancelled ? finished.length / (finished.length + cancelled) : 0,
      cancelled,
      averageValue: finished.length ? Math.round(gross / finished.length) : 0,
      gross,
      availableWorkers: available,
      pressure: weekOrders / Math.max(1, available),
    };
  });
  const meanPressure = zoneRows.reduce((sum, row) => sum + row.pressure, 0) / (zoneRows.length || 1);
  const zonesOut: ZonePerformance[] = zoneRows
    .map((row) => ({
      zoneId: row.zoneId,
      zoneName: row.zoneName,
      bookings: row.bookings,
      finishRate: row.finishRate,
      cancelled: row.cancelled,
      averageValue: row.averageValue,
      gross: row.gross,
      availableWorkers: row.availableWorkers,
      underserved: row.pressure > meanPressure,
    }))
    .sort((a, b) => b.bookings - a.bookings);

  /*
   * Households against businesses, week by week: how many of each booked, and what
   * finished jobs each paid for in the period. Customer type is a fact on the account.
   * New-versus-returning is not shown, because the booking records begin 90 days ago and
   * any count of "first bookings" would pile up in the earliest weeks.
   */
  const typeOf = new Map(adminState().customers.map((customer) => [customer.id, customer.type]));
  const weeklyCustomers = Array.from({ length: 13 }, (_, index) => {
    const weeksAgo = 12 - index;
    const from = new Date(now - (weeksAgo + 1) * 7 * DAY_MS).toISOString();
    const to = new Date(now - weeksAgo * 7 * DAY_MS).toISOString();
    const households = new Set<string>();
    const businesses = new Set<string>();
    for (const booking of bookings) {
      if (booking.createdAt < from || booking.createdAt >= to) continue;
      (typeOf.get(booking.customerId) === 'BUSINESS' ? businesses : households).add(booking.customerId);
    }
    const label = new Date(Date.parse(from) + IST_OFFSET_MS).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return { label, households: households.size, businesses: businesses.size };
  });
  let businessSpend = 0;
  let totalSpend = 0;
  const businessCustomers = new Set<string>();
  const allCustomers = new Set<string>();
  for (const booking of inPeriod) {
    allCustomers.add(booking.customerId);
    const isBusiness = typeOf.get(booking.customerId) === 'BUSINESS';
    if (isBusiness) businessCustomers.add(booking.customerId);
    if (!isFinished(booking.status)) continue;
    totalSpend += booking.amount;
    if (isBusiness) businessSpend += booking.amount;
  }

  return respond({
    period,
    bookings: inPeriod.length,
    gross: inPeriod.filter((booking) => isFinished(booking.status)).reduce((sum, booking) => sum + booking.amount, 0),
    workShare: {
      workerCount: verified.length,
      jobs: assigned,
      topFifthShare: shareOf(counts.slice(0, Math.max(1, Math.round(counts.length / 5)))),
      bottomHalfShare: shareOf(counts.slice(Math.ceil(counts.length / 2))),
      workersWithNoJobs: counts.filter((value) => value === 0).length,
      distribution,
    },
    demandGrid,
    peak,
    categories,
    zones: zonesOut,
    weeklyCustomers,
    businessShare: {
      customers: allCustomers.size ? businessCustomers.size / allCustomers.size : 0,
      spend: totalSpend ? businessSpend / totalSpend : 0,
    },
  });
}
