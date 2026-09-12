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
