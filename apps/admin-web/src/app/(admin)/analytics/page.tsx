'use client';

import { useEffect, useState } from 'react';
import { DemandHeatGrid, TradePerformance } from '@/components/analytics/DemandPatterns';
import { WorkShareSection } from '@/components/analytics/WorkShareSection';
import { CustomerWeeks, PeriodTotals, ZonePerformanceTable } from '@/components/analytics/ZonesAndCustomers';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { getAnalyticsReport, type AnalyticsPeriod, type AnalyticsReport } from '@/lib/services';

const PERIODS = [
  { value: '7D' as const, label: '7 days' },
  { value: '30D' as const, label: '30 days' },
  { value: '90D' as const, label: '90 days' },
];

const PERIOD_LABEL: Record<AnalyticsPeriod, string> = {
  '7D': 'in the last 7 days',
  '30D': 'in the last 30 days',
  '90D': 'in the last 90 days',
};

const COMPARISON_LABEL: Partial<Record<AnalyticsPeriod, string>> = {
  '7D': 'against the 7 days before',
  '30D': 'against the 30 days before',
};

/**
 * Analytics: the longer view the dashboard does not have room for.
 *
 * Whether work is shared fairly, when demand arrives, how each trade and zone performs,
 * and whether customers keep coming back — one period at a time, from the same records
 * every other page reads.
 */
export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30D');
  const [report, setReport] = useState<AnalyticsReport>();

  useEffect(() => {
    let cancelled = false;
    setReport(undefined);
    void getAnalyticsReport(period).then((next) => {
      if (!cancelled) setReport(next);
    });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const periodLabel = PERIOD_LABEL[period];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-table text-muted">
          Figures are for bookings made {periodLabel}. Cover is always judged on the last 7 days.
        </p>
        <SegmentedToggle label="Report period" options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      {!report ? (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-12 gap-5">
            <Skeleton className="col-span-12 h-80 rounded-card lg:col-span-5" />
            <Skeleton className="col-span-12 h-80 rounded-card lg:col-span-7" />
          </div>
          <div className="grid grid-cols-12 gap-5">
            <Skeleton className="col-span-12 h-96 rounded-card lg:col-span-8" />
            <Skeleton className="col-span-12 h-96 rounded-card lg:col-span-4" />
          </div>
        </div>
      ) : (
        <>
          <WorkShareSection share={report.workShare} periodLabel={periodLabel} />

          <div className="grid grid-cols-12 gap-5">
            <DemandHeatGrid grid={report.demandGrid} peak={report.peak} periodLabel={periodLabel} />
            <TradePerformance categories={report.categories} comparisonLabel={COMPARISON_LABEL[period]} />
          </div>

          <div className="grid grid-cols-12 gap-5">
            <ZonePerformanceTable zones={report.zones} periodLabel={periodLabel} />
          </div>

          <div className="grid grid-cols-12 gap-5">
            <CustomerWeeks weeks={report.weeklyCustomers} businessShare={report.businessShare} periodLabel={periodLabel} />
            <PeriodTotals report={report} periodLabel={periodLabel} />
          </div>
        </>
      )}
    </div>
  );
}
