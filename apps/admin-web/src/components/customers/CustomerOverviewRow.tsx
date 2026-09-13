import { Repeat, Sparkles, UserRound, UserX } from 'lucide-react';
import { Card } from '@/components/ui-kit/Card';
import { IconTile } from '@/components/ui-kit/IconTile';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatBlock } from '@/components/ui-kit/StatBlock';
import { count, percent, rupees } from '@/lib/format';
import { REGULAR_MIN_BOOKINGS, type CustomerOverview } from '@/lib/services';

export interface CustomerOverviewRowProps {
  overview?: CustomerOverview;
  /** Filters the directory to one segment, from the figure that names it. */
  onShowSegment: (segment: 'NEW' | 'LAPSED' | 'REGULAR') => void;
}

/**
 * Who is booking, above the directory.
 *
 * One hero figure beside one card of three lighter ones, never four equal boxes. Each
 * supporting figure is also the way to see the customers behind it.
 */
export function CustomerOverviewRow({ overview, onShowSegment }: CustomerOverviewRowProps) {
  if (!overview) {
    return (
      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 p-6 lg:col-span-5">
          <Skeleton lines={5} />
        </Card>
        <Card className="col-span-12 p-6 lg:col-span-7">
          <Skeleton lines={5} />
        </Card>
      </div>
    );
  }

  const activeShare = overview.total ? overview.activeLast30 / overview.total : 0;

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12 flex flex-col gap-4 p-6 lg:col-span-5">
        <IconTile icon={UserRound} tint="marigold" />
        <div>
          <p className="text-table text-muted">Booked in the last 30 days</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="tabular font-display text-hero font-medium text-ink">{count(overview.activeLast30)}</span>
            <span className="text-table text-muted">of {count(overview.total)} customers</span>
          </p>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-pill bg-hairline/70"
          role="img"
          aria-label={`${percent(activeShare)} of customers booked in the last 30 days`}
        >
          <span className="block h-full rounded-pill bg-marigold" style={{ width: `${activeShare * 100}%` }} />
        </div>
        <p className="text-table text-ink">
          <span className="tabular">{percent(overview.repeatShare)}</span> have booked more than once. The average
          customer has spent <span className="tabular">{rupees(overview.averageSpend)}</span>, and{' '}
          <span className="tabular">{count(overview.businesses)}</span> book for a business.
        </p>
      </Card>

      <Card className="col-span-12 grid grid-cols-1 divide-y divide-hairline p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:col-span-7">
        {[
          {
            segment: 'REGULAR' as const,
            label: 'Regulars',
            value: overview.regulars,
            icon: Repeat,
            tint: 'lavender' as const,
            note: `${REGULAR_MIN_BOOKINGS}+ bookings in 90 days`,
            action: 'Show regulars',
          },
          {
            segment: 'NEW' as const,
            label: 'New this month',
            value: overview.newLast30,
            icon: Sparkles,
            tint: 'fund-green' as const,
            note: 'first booking in 30 days',
            action: 'Show new customers',
          },
          {
            segment: 'LAPSED' as const,
            label: 'Lapsed',
            value: overview.lapsed,
            icon: UserX,
            tint: 'coral' as const,
            note: 'nothing booked for 45 days',
            action: 'Show who lapsed',
          },
        ].map((stat) => (
          <div key={stat.segment} className="flex flex-col p-6">
            <StatBlock label={stat.label} value={count(stat.value)} icon={stat.icon} tint={stat.tint} />
            <p className="mt-1 text-pill text-muted">{stat.note}</p>
            <button
              type="button"
              onClick={() => onShowSegment(stat.segment)}
              className="mt-3 self-start rounded-sm text-pill font-medium text-ink underline decoration-hairline underline-offset-2 hover:decoration-ink"
            >
              {stat.action}
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}
