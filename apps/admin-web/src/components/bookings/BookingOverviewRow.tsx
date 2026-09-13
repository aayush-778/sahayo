import { Ban, CalendarCheck, CheckCheck, Radio } from 'lucide-react';
import { Card } from '@/components/ui-kit/Card';
import { DeltaPill } from '@/components/ui-kit/DeltaPill';
import { IconTile } from '@/components/ui-kit/IconTile';
import { LinkButton } from '@/components/ui-kit/LinkButton';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatBlock } from '@/components/ui-kit/StatBlock';
import { count, percent, rupees } from '@/lib/format';
import type { BookingOverview } from '@/lib/services';

export interface BookingOverviewRowProps {
  overview?: BookingOverview;
  /** Narrows the log to one status group, from the figure that names it. */
  onShowGroup: (group: 'LIVE' | 'CANCELLED') => void;
}

/**
 * How booking is going, above the log: one hero figure beside one card of three.
 *
 * The 24-hour count uses the same rolling window and baseline as the dashboard, so the
 * two pages can never quote different numbers for "today".
 */
export function BookingOverviewRow({ overview, onShowGroup }: BookingOverviewRowProps) {
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

  const { last30 } = overview;

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12 flex flex-col gap-4 p-6 lg:col-span-5">
        <IconTile icon={CalendarCheck} tint="marigold" />
        <div>
          <p className="text-table text-muted">Booked in the last 24 hours</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tabular font-display text-hero font-medium text-ink">{count(overview.last24h)}</span>
            <DeltaPill value={overview.last24hDeltaPercent} period="vs daily average" />
          </p>
        </div>
        <p className="text-table text-ink">
          <span className="tabular">{count(last30.booked)}</span> jobs in the last 30 days. Finished jobs brought in{' '}
          <span className="tabular">{rupees(last30.gross)}</span>, an average of{' '}
          <span className="tabular">{rupees(last30.averageValue)}</span> each.
        </p>
      </Card>

      <Card className="col-span-12 grid grid-cols-1 divide-y divide-hairline p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:col-span-7">
        <div className="flex flex-col p-6">
          <StatBlock label="Moving right now" value={count(overview.live)} icon={Radio} tint="lavender" />
          <p className="mt-1 text-pill text-muted">requested, offered or under way</p>
          <LinkButton href="/dispatch" className="mt-3 self-start">
            Open live dispatch
          </LinkButton>
        </div>

        <div className="flex flex-col p-6">
          <StatBlock label="Finished" value={percent(last30.completionRate)} icon={CheckCheck} tint="fund-green" />
          <p className="mt-1 text-pill text-muted">of jobs that ended in the last 30 days</p>
        </div>

        <div className="flex flex-col p-6">
          <StatBlock label="Cancelled" value={count(last30.cancelled)} icon={Ban} tint="coral" />
          <p className="mt-1 text-pill text-muted">
            <span className="tabular">{count(last30.cancelledByCustomer)}</span> by customers,{' '}
            <span className="tabular">{count(last30.cancelledByWorker)}</span> by workers,{' '}
            <span className="tabular">{count(last30.unaccepted)}</span> never accepted
          </p>
          <button
            type="button"
            onClick={() => onShowGroup('CANCELLED')}
            className="mt-3 self-start rounded-sm text-pill font-medium text-ink underline decoration-hairline underline-offset-2 hover:decoration-ink"
          >
            Show cancelled jobs
          </button>
        </div>
      </Card>
    </div>
  );
}
