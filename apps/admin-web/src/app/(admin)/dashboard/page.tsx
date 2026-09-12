'use client';

import { useEffect, useState } from 'react';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { CategoryDonut } from '@/components/dashboard/CategoryDonut';
import { FundHero } from '@/components/dashboard/FundHero';
import { JobsDistribution } from '@/components/dashboard/JobsDistribution';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { SupportingStats } from '@/components/dashboard/SupportingStats';
import { Card } from '@/components/ui-kit/Card';
import { SEED_NOW } from '@/lib/dates';
import {
  getDashboardSummary,
  getHiringByCategory,
  getJobsThisWeekByCategory,
  getRevenueSeries,
  getZoneDemand,
  listRecentActivity,
  type ActivityItem,
  type CategoryJobCount,
  type CategorySlice,
  type DashboardSummary,
  type RevenuePoint,
  type ZoneDemandPoint,
} from '@/lib/services';
import { ZoneHexMap } from '@/components/dashboard/ZoneHexMap';

/**
 * The executive dashboard.
 *
 * Twelve-column grid with deliberately uneven rows — 5/7, 8/4, 7/5, then full
 * width. Four equal cards across the top is the single most recognisable
 * generated-dashboard shape, so the fund total gets five columns of its own and
 * the three supporting figures share one card across seven.
 *
 * Every number on this page comes from a service call. Nothing is computed here
 * and nothing is hardcoded: a figure derived in the page would be a second
 * definition of it, free to drift from the finance hub that shows the same thing.
 */
export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>();
  const [daily, setDaily] = useState<RevenuePoint[]>();
  const [hiring, setHiring] = useState<CategorySlice[]>();
  const [zones, setZones] = useState<ZoneDemandPoint[]>();
  const [activity, setActivity] = useState<ActivityItem[]>();
  const [jobs, setJobs] = useState<CategoryJobCount[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    /*
     * Each card resolves independently rather than awaiting the whole set, so a
     * slow call leaves one skeleton rather than holding the page blank. The top
     * row is the exception — its three figures arrive together from one call, so
     * they appear as a row instead of popping in one at a time.
     *
     * The revenue series is fetched once at day granularity. The chart's
     * Day/Month/Year toggle re-buckets that array client-side, so switching costs
     * no network call and works with the network off.
     */
    void (async () => {
      try {
        await Promise.all([
          getDashboardSummary().then((value) => !cancelled && setSummary(value)),
          getRevenueSeries('DAY').then((value) => !cancelled && setDaily(value)),
          getHiringByCategory().then((value) => !cancelled && setHiring(value)),
          getZoneDemand().then((value) => !cancelled && setZones(value)),
          listRecentActivity().then((value) => !cancelled && setActivity(value)),
          getJobsThisWeekByCategory().then((value) => !cancelled && setJobs(value)),
        ]);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <Card className="max-w-md p-6">
        <p className="text-body text-ink">The dashboard could not load its figures.</p>
        <p className="mt-1 text-table text-muted">
          Reload the page. If it keeps happening, reset the demo data from Settings.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-5">
      <FundHero summary={summary} />
      <SupportingStats summary={summary} />

      <RevenueChart daily={daily} />
      <CategoryDonut slices={hiring} />

      <ZoneHexMap zones={zones} />
      <ActivityFeed items={activity} now={SEED_NOW} />

      <JobsDistribution categories={jobs} />
    </div>
  );
}
