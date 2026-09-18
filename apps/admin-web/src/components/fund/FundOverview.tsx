'use client';

import { ArrowDownRight, ArrowUpRight, HandCoins, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FundTotals } from '@sahayo/shared';
import { AXIS, GRID } from '@/components/dashboard/chart-theme';
import { Card } from '@/components/ui-kit/Card';
import { CountUp } from '@/components/ui-kit/CountUp';
import { IconTile } from '@/components/ui-kit/IconTile';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { count, rupees, rupeesCompact } from '@/lib/format';
import type { FundGrowthPoint } from '@/lib/services';

interface TooltipEntry {
  payload?: FundGrowthPoint;
}

function GrowthTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-tile border border-hairline bg-surface p-3 shadow-card">
      <p className="text-pill text-muted">{point.label}</p>
      <p className="tabular mt-1 text-table font-medium text-ink">{rupees(point.balance)} held</p>
      <p className="tabular text-pill text-muted">
        +{rupees(point.contributed)} in, −{rupees(point.disbursed)} spent
      </p>
    </div>
  );
}

export interface FundOverviewProps {
  totals?: FundTotals;
  growth?: FundGrowthPoint[];
  /** The fund's share of each new booking, in whole percent, from Settings. */
  fundPercent?: number;
}

/**
 * What the fund holds, where it came from, and how it has grown.
 *
 * The chart stacks what the fund held at the start of each month under what that month
 * added, so the top edge is the month's closing balance and a month where the members
 * paid for something shows as a thinner band rather than a mystery dip.
 */
export function FundOverview({ totals, growth, fundPercent }: FundOverviewProps) {
  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12 flex flex-col gap-5 p-6 lg:col-span-5">
        {!totals ? (
          <Skeleton lines={6} />
        ) : (
          <>
            <div className="flex items-start gap-4">
              <IconTile icon={HandCoins} tint="fund-green" />
              <div>
                <p className="text-table text-muted">The cooperative fund holds</p>
                <CountUp
                  value={totals.balance}
                  format={rupees}
                  className="tabular block font-display text-hero font-medium text-fund-green"
                />
              </div>
            </div>

            <p className="font-display text-card-title font-medium leading-relaxed text-ink">
              Every booking puts{' '}
              <span className="tabular">{fundPercent === undefined ? '' : `${fundPercent}%`}</span> here.{' '}
              <span className="tabular">{count(totals.memberCount)}</span> workers decide together what
              it pays for.
            </p>

            <dl className="mt-auto grid grid-cols-3 divide-x divide-hairline border-t border-hairline pt-4">
              <div className="pr-3">
                <dt className="flex items-center gap-1 text-pill text-muted">
                  <ArrowUpRight size={12} strokeWidth={1.75} aria-hidden />
                  In this month
                </dt>
                <dd className="tabular mt-0.5 text-table font-medium text-ink">
                  {rupees(totals.contributedThisMonth)}
                </dd>
              </div>
              <div className="px-3">
                <dt className="flex items-center gap-1 text-pill text-muted">
                  <ArrowDownRight size={12} strokeWidth={1.75} aria-hidden />
                  Paid out this month
                </dt>
                <dd className="tabular mt-0.5 text-table font-medium text-ink">
                  {rupees(totals.disbursedThisMonth)}
                </dd>
              </div>
              <div className="pl-3">
                <dt className="flex items-center gap-1 text-pill text-muted">
                  <Users size={12} strokeWidth={1.75} aria-hidden />
                  Members
                </dt>
                <dd className="tabular mt-0.5 text-table font-medium text-ink">
                  {count(totals.memberCount)}
                </dd>
              </div>
            </dl>
          </>
        )}
      </Card>

      <Card className="col-span-12 flex flex-col p-6 lg:col-span-7">
        <SectionHeader title="How the fund has grown" subtitle="The last twelve months, month by month" />
        <div className="mt-4 h-56">
          {!growth ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <figure
              className="h-full"
              aria-label={`The fund went from ${rupees(growth[0]?.heldBefore ?? 0)} to ${rupees(
                growth[growth.length - 1]?.balance ?? 0,
              )} over twelve months.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" />
                  <YAxis {...AXIS} width={56} tickFormatter={(value: number) => rupeesCompact(value)} />
                  <Tooltip content={<GrowthTooltip />} cursor={{ stroke: 'hsl(var(--hairline))' }} />
                  <Area
                    type="monotone"
                    dataKey="heldBefore"
                    name="Held at the start of the month"
                    stackId="fund"
                    stroke="none"
                    fill="hsl(var(--fund-green) / 0.22)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="netChange"
                    name="Added during the month"
                    stackId="fund"
                    stroke="hsl(var(--fund-green))"
                    strokeWidth={2}
                    fill="hsl(var(--fund-green) / 0.55)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </figure>
          )}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-pill text-muted">
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-fund-green/25" />
            Held at the start of the month
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-fund-green/60" />
            Added during the month, after spending
          </li>
        </ul>
      </Card>
    </div>
  );
}
