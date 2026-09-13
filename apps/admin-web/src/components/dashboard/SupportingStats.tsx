import { CalendarCheck, HandCoins, Users } from 'lucide-react';
import { Card } from '@/components/ui-kit/Card';
import { StatBlock } from '@/components/ui-kit/StatBlock';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { count, rupees } from '@/lib/format';
import type { DashboardSummary } from '@/lib/services';

/**
 * Three supporting figures beside the hero.
 *
 * One card holding three blocks divided by hairlines, not three cards. The
 * distinction matters: three separate cards at the same weight as the fund card
 * would make four equal boxes in a row, which is the slop pattern the design
 * rules ban outright. These sit inside one container at a visibly lighter weight.
 */
export function SupportingStats({ summary }: { summary?: DashboardSummary }) {
  if (!summary) {
    return (
      <Card className="col-span-12 p-6 lg:col-span-7">
        <Skeleton lines={4} />
      </Card>
    );
  }

  return (
    <Card className="col-span-12 grid grid-cols-1 divide-y divide-hairline p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:col-span-7">
      <div className="p-6">
        <StatBlock
          label="Workers were paid"
          value={rupees(summary.workerPayoutsThisWeek)}
          icon={HandCoins}
          tint="marigold"
          delta={summary.workerPayoutsDeltaPercent}
          note="this week"
        />
      </div>

      <div className="p-6">
        <StatBlock
          label="Working right now"
          value={count(summary.activeWorkers)}
          icon={Users}
          tint="lavender"
          note={`of ${count(summary.totalWorkers)}`}
        />
      </div>

      <div className="p-6">
        <StatBlock
          label="Jobs booked today"
          value={count(summary.bookingsToday)}
          icon={CalendarCheck}
          tint="coral"
          delta={summary.bookingsTodayDeltaPercent}
          deltaPeriod="vs daily average"
        />
      </div>
    </Card>
  );
}
