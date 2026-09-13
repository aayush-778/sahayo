'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui-kit/Card';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { rupees, rupeesCompact } from '@/lib/format';
import type { RevenuePoint } from '@/lib/services';
import { AXIS, GRID, LINE, SERIES } from './chart-theme';
import { compareIso } from '@/lib/dates';
import { useReducedMotion } from '@/lib/use-reduced-motion';

type Grain = 'DAY' | 'MONTH' | 'YEAR';

const GRAIN_OPTIONS = [
  { value: 'DAY' as const, label: 'Day' },
  { value: 'MONTH' as const, label: 'Month' },
  { value: 'YEAR' as const, label: 'Year' },
];

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Re-buckets the daily series to months or years.
 *
 * A pure function over the array already in memory. The toggle therefore costs
 * nothing and works with the network off, which is a demo requirement rather than
 * an optimisation: the one thing that must not happen on stage is a chart going
 * blank because a click triggered a fetch.
 */
function reaggregate(daily: RevenuePoint[], grain: Grain): RevenuePoint[] {
  if (grain === 'DAY') return daily;

  const width = grain === 'MONTH' ? 7 : 4;
  const buckets = new Map<string, RevenuePoint>();

  for (const point of daily) {
    const key = point.bucket.slice(0, width);
    const existing = buckets.get(key) ?? {
      bucket: key,
      label:
        grain === 'YEAR' ? key : (MONTH_NAMES[Number(key.slice(5, 7)) - 1] ?? key),
      platform: 0,
      coopFund: 0,
    };
    existing.platform += point.platform;
    existing.coopFund += point.coopFund;
    buckets.set(key, existing);
  }

  return [...buckets.values()].sort((a, b) => compareIso(a.bucket, b.bucket));
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number;
  color?: string;
}

/** The tooltip, rebuilt so it matches the product rather than Recharts' default. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-tile border border-hairline bg-surface p-3 shadow-card">
      <p className="text-pill text-muted">{label}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-table">
            <span
              aria-hidden
              className="h-2 w-2 flex-none rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted">{entry.name}</span>
            <span className="tabular ml-auto pl-3 text-ink">{rupees(entry.value ?? 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RevenueChart({ daily }: { daily?: RevenuePoint[] }) {
  const [grain, setGrain] = useState<Grain>('MONTH');
  const reducedMotion = useReducedMotion();
  const series = useMemo(() => reaggregate(daily ?? [], grain), [daily, grain]);

  /*
   * A text alternative for the chart. Colour and shape carry the trend for a
   * sighted reader; this carries the same facts for a screen reader, and for
   * anyone the chart fails to render for.
   */
  const totals = series.reduce(
    (acc, point) => ({
      platform: acc.platform + point.platform,
      fund: acc.fund + point.coopFund,
    }),
    { platform: 0, fund: 0 },
  );
  const summary = `Platform revenue ${rupees(totals.platform)} and cooperative fund ${rupees(
    totals.fund,
  )} across ${series.length} ${grain.toLowerCase()} periods.`;

  /*
   * While the platform and the fund take the same share, their lines are the same
   * amount and draw on top of each other. Say so, rather than let a reader conclude a
   * series is missing.
   */
  const coincide = series.length > 0 && series.every((point) => point.platform === point.coopFund);

  /*
   * The records cover 90 days, so at month or year grain the first and last buckets are
   * part-periods. Named here, so the dip at either end reads as fewer days rather than
   * as a collapse in bookings.
   */
  const first = daily?.[0]?.bucket;
  const last = daily?.[daily.length - 1]?.bucket;
  const partNote =
    grain !== 'DAY' && first && last
      ? `The first and last ${grain === 'MONTH' ? 'months' : 'years'} are part-periods: the records run from ${new Date(
          first,
        ).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} to ${new Date(last).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
        })}.`
      : undefined;

  return (
    <Card className="col-span-12 flex flex-col p-6 lg:col-span-8">
      <SectionHeader
        title="Revenue and fund growth"
        subtitle="What the platform kept, and what went to the workers' fund"
        action={
          <SegmentedToggle
            label="Chart period"
            options={GRAIN_OPTIONS}
            value={grain}
            onChange={setGrain}
          />
        }
      />

      <div className="mt-5 h-64">
        {daily ? (
          <figure className="h-full" aria-label={summary}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="label" {...AXIS} />
                <YAxis {...AXIS} tickFormatter={(value: number) => rupeesCompact(value)} width={56} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID.stroke }} />
                <Line
                  {...LINE}
                  type="monotone"
                  dataKey="platform"
                  name="Platform"
                  stroke={SERIES.platform}
                  isAnimationActive={!reducedMotion}
                />
                <Line
                  {...LINE}
                  type="monotone"
                  dataKey="coopFund"
                  name="Cooperative fund"
                  stroke={SERIES.fund}
                  isAnimationActive={!reducedMotion}
                />
              </LineChart>
            </ResponsiveContainer>
          </figure>
        ) : (
          <Skeleton className="h-full w-full" />
        )}
      </div>

      {/* A written legend, so the two series are named rather than only coloured. */}
      <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <li className="flex items-center gap-2 text-table text-muted">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: SERIES.platform }}
          />
          Platform revenue
        </li>
        <li className="flex items-center gap-2 text-table text-muted">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: SERIES.fund }}
          />
          Cooperative fund
        </li>
        {coincide ? (
          <li className="text-pill text-muted">Both take the same share, so the two lines overlap exactly.</li>
        ) : null}
      </ul>
      {partNote ? <p className="mt-1.5 text-pill text-muted">{partNote}</p> : null}
    </Card>
  );
}
