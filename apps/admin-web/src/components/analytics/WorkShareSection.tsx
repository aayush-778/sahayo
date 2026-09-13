'use client';

import { Scale } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, GRID } from '@/components/dashboard/chart-theme';
import { Card } from '@/components/ui-kit/Card';
import { IconTile } from '@/components/ui-kit/IconTile';
import { LinkButton } from '@/components/ui-kit/LinkButton';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { count, percent } from '@/lib/format';
import type { WorkShare } from '@/lib/services';
import { useReducedMotion } from '@/lib/use-reduced-motion';

/**
 * How evenly work is shared — the claim this cooperative's dispatcher exists to keep.
 *
 * The hero states it in one comparable sentence: what the busiest fifth took, against
 * the 20% they would take if work were split perfectly evenly. The chart beside it shows
 * the whole spread, so a reader can see whether the fifth is a long tail or a cliff.
 */
export function WorkShareSection({ share, periodLabel }: { share: WorkShare; periodLabel: string }) {
  const reducedMotion = useReducedMotion();
  const even = share.topFifthShare <= 0.3;

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12 flex flex-col gap-4 p-6 lg:col-span-5">
        <IconTile icon={Scale} tint={even ? 'fund-green' : 'coral'} />
        <div>
          <p className="text-table text-muted">The busiest fifth of workers took</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="tabular font-display text-hero font-medium text-ink">{percent(share.topFifthShare)}</span>
            <span className="text-table text-muted">of jobs {periodLabel}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1.5" role="img" aria-label={`Busiest fifth ${percent(share.topFifthShare)}, an even split would be 20%`}>
          <span className="relative block h-2 w-full overflow-hidden rounded-pill bg-hairline/70">
            <span className="block h-full rounded-pill bg-marigold" style={{ width: `${share.topFifthShare * 100}%` }} />
            <span aria-hidden className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: '20%' }} />
          </span>
          <span className="flex justify-between text-pill text-muted">
            <span>Even split: 20%</span>
            <span>All work to a few: 100%</span>
          </span>
        </div>
        <p className="text-table text-ink">
          The quieter half of the <span className="tabular">{count(share.workerCount)}</span> verified workers took{' '}
          <span className="tabular">{percent(share.bottomHalfShare)}</span>.{' '}
          {share.workersWithNoJobs === 0
            ? 'Every one of them was given at least one job.'
            : `${count(share.workersWithNoJobs)} had no work at all.`}
        </p>
        <LinkButton href="/workers?under=1" className="mt-auto self-start">
          See who is getting least work
        </LinkButton>
      </Card>

      <Card className="col-span-12 flex flex-col p-6 lg:col-span-7">
        <SectionHeader title="Jobs per worker" subtitle={`How many workers took how many of the ${count(share.jobs)} jobs ${periodLabel}`} />
        <figure
          className="mt-4 h-60"
          aria-label={`Workers by jobs taken: ${share.distribution.map((bin) => `${bin.workers} took ${bin.label}`).join(', ')}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={share.distribution} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis {...AXIS} width={32} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--marigold-tint) / 0.5)' }}
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="rounded-tile border border-hairline bg-surface px-3 py-2 text-table text-ink shadow-card">
                      <span className="tabular">{payload[0].value as number}</span> workers took{' '}
                      <span className="tabular">{(payload[0].payload as { label: string }).label}</span> jobs
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="workers" fill="hsl(var(--marigold))" radius={[6, 6, 0, 0]} isAnimationActive={!reducedMotion} />
            </BarChart>
          </ResponsiveContainer>
        </figure>
        <p className="mt-2 text-pill text-muted">Jobs taken, grouped</p>
      </Card>
    </div>
  );
}
