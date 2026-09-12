'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { COOP_FUND_SHARE, PLATFORM_SHARE, WORKER_SHARE, type SplitSummary } from '@sahayo/shared';
import { Card } from '@/components/ui-kit/Card';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { count, percent, rupees } from '@/lib/format';
import { previewSplit, type Period } from '@/lib/services';

const PERIODS = [
  { value: '7D' as const, label: '7D' },
  { value: '30D' as const, label: '30D' },
  { value: '90D' as const, label: '90D' },
  { value: 'ALL' as const, label: 'All' },
];

/*
 * Exactly three tokens, one per destination. Marigold for the worker because the
 * worker's share is the platform's main event; muted for the platform because
 * running costs should not compete for attention; fund-green for the fund, which is
 * the only thing fund-green is ever used for.
 */
const SEGMENTS = [
  {
    key: 'worker' as const,
    label: 'To workers',
    share: WORKER_SHARE,
    color: 'hsl(var(--marigold))',
    dot: 'bg-marigold',
    detail: 'Paid to the person who did the job, into their Sahayo balance and then their bank.',
  },
  {
    key: 'platform' as const,
    label: 'To run the platform',
    share: PLATFORM_SHARE,
    color: 'hsl(var(--muted))',
    dot: 'bg-muted',
    detail: 'Servers, payment fees, support staff and the people who keep dispatch working.',
  },
  {
    key: 'coopFund' as const,
    label: 'To the cooperative fund',
    share: COOP_FUND_SHARE,
    color: 'hsl(var(--fund-green))',
    dot: 'bg-fund-green',
    detail: 'Owned by every worker together, and spent on what they vote for.',
  },
];

export interface SplitOverviewProps {
  summary?: SplitSummary;
  period: Period;
  onPeriodChange: (period: Period) => void;
}

/**
 * Where the money went, for a period.
 *
 * The donut and the three rows beside it are the same three numbers, and they sum to
 * the gross in the centre exactly, to the paisa — the service guarantees it, and the
 * worked example below computes its sentence with the same function the ledger posts
 * with, so the illustration cannot drift from what is actually charged.
 */
export function SplitOverview({ summary, period, onPeriodChange }: SplitOverviewProps) {
  const example = previewSplit(100000);

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12 p-6 lg:col-span-8">
        <SectionHeader
          title="Where every rupee went"
          subtitle="Completed jobs in the period, split three ways"
          action={
            <SegmentedToggle
              label="Period"
              options={PERIODS}
              value={period}
              onChange={onPeriodChange}
            />
          }
        />

        {!summary ? (
          <div className="mt-6">
            <Skeleton lines={6} />
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative h-52 w-52 flex-none">
              <figure
                className="h-full"
                aria-label={`${rupees(summary.gross)} from ${summary.bookingCount} jobs: ${rupees(
                  summary.worker,
                )} to workers, ${rupees(summary.platform)} to the platform, ${rupees(
                  summary.coopFund,
                )} to the cooperative fund.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={SEGMENTS.map((segment) => ({
                        name: segment.label,
                        value: summary[segment.key],
                      }))}
                      dataKey="value"
                      innerRadius="68%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      stroke="hsl(var(--surface))"
                      strokeWidth={3}
                      isAnimationActive={false}
                    >
                      {SEGMENTS.map((segment) => (
                        <Cell key={segment.key} fill={segment.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </figure>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="tabular font-display text-stat font-medium text-ink">
                  {rupees(summary.gross)}
                </span>
                <span className="text-pill text-muted">
                  from <span className="tabular">{count(summary.bookingCount)}</span> jobs
                </span>
              </div>
            </div>

            <ul className="flex w-full flex-col divide-y divide-hairline">
              {SEGMENTS.map((segment) => (
                <li key={segment.key} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="flex items-center gap-2 text-table text-ink">
                      <span aria-hidden className={`h-2.5 w-2.5 flex-none rounded-full ${segment.dot}`} />
                      {segment.label}
                      <span className="tabular text-pill text-muted">{percent(segment.share)}</span>
                    </span>
                    <span className="tabular font-display text-card-title font-medium text-ink">
                      {rupees(summary[segment.key])}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-[18px] text-pill text-muted">{segment.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="col-span-12 flex flex-col justify-between p-6 lg:col-span-4">
        <SectionHeader title="On one booking" subtitle="The same split, made concrete" />
        <p className="mt-4 font-display text-card-title font-medium leading-relaxed text-ink">
          On a <span className="tabular">{rupees(100000)}</span> booking,{' '}
          <span className="tabular">{rupees(example.worker)}</span> goes to the worker,{' '}
          <span className="tabular">{rupees(example.platform)}</span> runs the platform, and{' '}
          <span className="tabular text-fund-green">{rupees(example.coopFund)}</span> goes to the
          fund every worker owns a share of.
        </p>
        <p className="mt-4 text-pill text-muted">
          Nothing is added on top for the fund. Its share comes out of what the platform would
          otherwise keep.
        </p>
      </Card>
    </div>
  );
}
