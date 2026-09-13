'use client';

import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, GRID } from '@/components/dashboard/chart-theme';
import { Card } from '@/components/ui-kit/Card';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { count, percent, rupees, rupeesCompact } from '@/lib/format';
import type { AnalyticsReport, ZonePerformance } from '@/lib/services';
import { useReducedMotion } from '@/lib/use-reduced-motion';

/** Every zone side by side, busiest first. */
export function ZonePerformanceTable({ zones, periodLabel }: { zones: ZonePerformance[]; periodLabel: string }) {
  const maxBookings = Math.max(1, ...zones.map((zone) => zone.bookings));

  return (
    <Card className="col-span-12 overflow-hidden p-0">
      <div className="p-6 pb-3">
        <SectionHeader title="Zones" subtitle={`How each of the twelve zones performed ${periodLabel}, busiest first`} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-table">
          <caption className="sr-only">Bookings, finish rate, cancellations, value and cover for each zone</caption>
          <thead>
            <tr className="border-y border-hairline text-left text-pill text-muted">
              <th scope="col" className="px-6 py-2.5 font-medium">Zone</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Bookings</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Finished</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Cancelled</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Average job</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Customers paid</th>
              <th scope="col" className="px-6 py-2.5 text-right font-medium">Cover this week</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {zones.map((zone) => (
              <tr key={zone.zoneId}>
                <th scope="row" className="px-6 py-3 text-left font-medium text-ink">
                  <Link href={`/bookings?zone=${zone.zoneId}`} className="hover:underline">
                    {zone.zoneName}
                  </Link>
                </th>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2.5">
                    <span className="tabular w-10 text-ink">{count(zone.bookings)}</span>
                    <span className="block h-1.5 w-24 overflow-hidden rounded-pill bg-hairline/70" aria-hidden>
                      <span className="block h-full rounded-pill bg-marigold" style={{ width: `${(zone.bookings / maxBookings) * 100}%` }} />
                    </span>
                  </span>
                </td>
                <td className="tabular px-3 py-3 text-right text-ink">{percent(zone.finishRate)}</td>
                <td className="tabular px-3 py-3 text-right text-ink">{count(zone.cancelled)}</td>
                <td className="tabular px-3 py-3 text-right text-ink">{rupees(zone.averageValue)}</td>
                <td className="tabular px-3 py-3 text-right text-ink">{rupees(zone.gross)}</td>
                <td className="px-6 py-3 text-right">
                  {zone.underserved ? (
                    <Link href={`/dispatch?zone=${zone.zoneId}`} title="Open this zone in live dispatch">
                      <StatusPill status="rejected" label={`Thin: ${zone.availableWorkers} free`} />
                    </Link>
                  ) : (
                    <StatusPill status="verified" label={`${zone.availableWorkers} free`} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** Who is booking, week by week: households and businesses. */
export function CustomerWeeks({
  weeks,
  businessShare,
  periodLabel,
}: {
  weeks: AnalyticsReport['weeklyCustomers'];
  businessShare: AnalyticsReport['businessShare'];
  periodLabel: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <Card className="col-span-12 flex flex-col p-6 lg:col-span-7">
      <SectionHeader title="Who is booking" subtitle="Households and businesses that booked each week, the last 13 weeks" />
      <p className="mt-3 text-table text-ink">
        Businesses were <span className="tabular">{percent(businessShare.customers)}</span> of customers {periodLabel},
        and paid for <span className="tabular">{percent(businessShare.spend)}</span> of finished jobs.
      </p>
      <figure
        className="mt-4 h-56"
        aria-label={`Customers per week: ${weeks.map((week) => `week of ${week.label}, ${week.households} households and ${week.businesses} businesses`).join('; ')}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="label" {...AXIS} interval={1} />
            <YAxis {...AXIS} width={36} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--marigold-tint) / 0.5)' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-tile border border-hairline bg-surface px-3 py-2 text-table text-ink shadow-card">
                    <p className="text-pill text-muted">Week of {label}</p>
                    {payload.map((entry) => (
                      <p key={String(entry.dataKey)}>
                        {entry.name}: <span className="tabular">{entry.value as number}</span>
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted))', paddingBottom: 8 }}
            />
            <Bar dataKey="households" name="Households" stackId="customers" fill="hsl(var(--lavender))" isAnimationActive={!reducedMotion} />
            <Bar dataKey="businesses" name="Businesses" stackId="customers" fill="hsl(var(--marigold))" radius={[6, 6, 0, 0]} isAnimationActive={!reducedMotion} />
          </BarChart>
        </ResponsiveContainer>
      </figure>
    </Card>
  );
}

/** The period at a glance: bookings and money, beside the customer chart. */
export function PeriodTotals({
  report,
  periodLabel,
}: {
  report: AnalyticsReport;
  periodLabel: string;
}) {
  const finished = report.categories.reduce((sum, category) => sum + Math.round(category.bookings * category.finishRate), 0);
  return (
    <Card className="col-span-12 flex flex-col gap-4 p-6 lg:col-span-5">
      <SectionHeader title="The period in numbers" subtitle={`Everything booked ${periodLabel}`} />
      <dl className="flex flex-col divide-y divide-hairline">
        {[
          { label: 'Bookings', value: count(report.bookings) },
          { label: 'Customers paid for finished jobs', value: rupees(report.gross) },
          { label: 'Average per day', value: `${count(Math.round(report.bookings / (report.period === '7D' ? 7 : report.period === '30D' ? 30 : 90)))} bookings` },
          { label: 'Trades booked', value: count(report.categories.length) },
          { label: 'Busiest zone', value: report.zones[0]?.zoneName ?? 'None' },
        ].map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
            <dt className="text-table text-muted">{row.label}</dt>
            <dd className="tabular font-display text-card-title font-medium text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-auto text-pill text-muted">
        Roughly {count(finished)} jobs finished. The finance hub splits the {rupeesCompact(report.gross)} three ways, to the paisa.
      </p>
    </Card>
  );
}
