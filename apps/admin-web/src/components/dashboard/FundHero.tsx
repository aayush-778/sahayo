import { PiggyBank } from 'lucide-react';
import { Card } from '@/components/ui-kit/Card';
import { CountUp } from '@/components/ui-kit/CountUp';
import { DeltaPill } from '@/components/ui-kit/DeltaPill';
import { IconTile } from '@/components/ui-kit/IconTile';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { count, percent, rupees } from '@/lib/format';
import type { DashboardSummary } from '@/lib/services';

/**
 * The cooperative fund total — the single most prominent number on the page.
 *
 * It leads because it is what makes this platform different from an aggregator:
 * a share of every booking belongs to the workers collectively. Every other
 * figure on the dashboard is deliberately lighter than this one.
 */
export function FundHero({ summary }: { summary?: DashboardSummary }) {
  if (!summary) {
    return (
      <Card className="col-span-12 flex flex-col gap-4 p-6 lg:col-span-5">
        <Skeleton className="h-10 w-10 rounded-tile" />
        <Skeleton lines={4} />
      </Card>
    );
  }

  const progress = Math.min(1, summary.fundBalance / summary.fundGoal);

  return (
    <Card className="col-span-12 flex flex-col gap-4 p-6 lg:col-span-5">
      <IconTile icon={PiggyBank} tint="marigold" />

      <div>
        <p className="text-table text-muted">Cooperative Fund</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-2">
          {/* Climbs when a finished job's share arrives live. */}
          <CountUp value={summary.fundBalance} format={rupees} className="tabular font-display text-hero font-medium text-ink" />
          <DeltaPill value={summary.fundDeltaPercent} period="this month" />
        </div>
        <p className="mt-2 text-table text-muted">
          {summary.fundSharePercent}% of every booking, owned by{' '}
          {count(summary.memberCount)} workers
        </p>
        {summary.openProposals > 0 ? (
          <p className="mt-1 text-table text-muted">
            Members are voting on{' '}
            <span className="tabular text-ink">{count(summary.openProposals)}</span>{' '}
            {summary.openProposals === 1 ? 'proposal' : 'proposals'}, with{' '}
            <span className="tabular text-ink">{count(summary.votesCastOnOpenProposals)}</span>{' '}
            votes cast so far.
          </p>
        ) : null}
      </div>

      <div className="mt-auto">
        {/*
         * Progress toward what the members are saving for. The bar carries a
         * label as well as a fill, because a bar alone communicates by length and
         * colour only — and this figure is the one someone will quote.
         */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label={`Cooperative fund progress toward ${rupees(summary.fundGoal)}`}
          className="h-1.5 w-full overflow-hidden rounded-pill bg-hairline"
        >
          <div
            className="h-full rounded-pill bg-fund-green"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="mt-2 text-pill text-muted">
          <span className="tabular">{percent(progress)}</span> of the{' '}
          <span className="tabular">{rupees(summary.fundGoal)}</span> the members are saving toward
        </p>
      </div>
    </Card>
  );
}
