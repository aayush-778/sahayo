import {
  BadgeCheck,
  CheckCircle2,
  HandCoins,
  MessageSquareWarning,
  Vote,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { IconTile } from '@/components/ui-kit/IconTile';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import type { Tint } from '@/components/ui-kit/tint';
import { relativeTime, rupees } from '@/lib/format';
import { ActivityKind, type ActivityItem } from '@/lib/services';
import { LinkButton } from '@/components/ui-kit/LinkButton';

/**
 * Icon and tint per event kind.
 *
 * Tint follows meaning, not variety: fund-green for a completed job and a
 * disbursement because money reached someone, coral for a dispute because it
 * needs attention, lavender for a vote because it is governance.
 */
const PRESENTATION: Record<ActivityKind, { icon: LucideIcon; tint: Tint }> = {
  [ActivityKind.BOOKING_COMPLETED]: { icon: CheckCircle2, tint: 'fund-green' },
  [ActivityKind.KYC_APPROVED]: { icon: BadgeCheck, tint: 'marigold' },
  [ActivityKind.DISPUTE_RAISED]: { icon: MessageSquareWarning, tint: 'coral' },
  [ActivityKind.PROPOSAL_PASSED]: { icon: Vote, tint: 'lavender' },
  [ActivityKind.LOAN_DISBURSED]: { icon: HandCoins, tint: 'fund-green' },
};

/**
 * What has happened recently, as a single vertical timeline.
 *
 * A hairline rule down the left and no cards. Cards here would make five nested
 * boxes inside a box, and the feed's job is to be scanned rather than read.
 */
export function ActivityFeed({ items, now }: { items?: ActivityItem[]; now: Date }) {
  return (
    <Card className="col-span-12 flex flex-col p-6 lg:col-span-5">
      <SectionHeader title="Recent activity" subtitle="The last few things that happened" />

      {!items ? (
        <div className="mt-5">
          <Skeleton lines={8} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-3"
          title="Nothing has happened yet today"
          description="Completed jobs, approvals, disputes and fund decisions all appear here as they happen."
          action={<LinkButton href="/dispatch">Open live dispatch</LinkButton>}
        />
      ) : (
        <ol className="relative mt-5 flex flex-col gap-4 pl-4">
          {/* The timeline rule. Decorative: the list itself carries the order. */}
          <span aria-hidden className="absolute bottom-2 left-0 top-2 w-px bg-hairline" />

          {items.map((item) => {
            const { icon, tint } = PRESENTATION[item.kind];
            return (
              <li key={item.id} className="flex items-start gap-3">
                <IconTile icon={icon} tint={tint} size="sm" className="-ml-8 ring-4 ring-surface" />
                <div className="min-w-0 flex-1">
                  <p className="text-table text-ink">{item.text}</p>
                  <p className="mt-0.5 flex items-baseline gap-2 text-pill text-muted">
                    <span>{relativeTime(item.at, now)}</span>
                    {item.amount === undefined ? null : (
                      <span className="tabular text-ink">{rupees(item.amount)}</span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
