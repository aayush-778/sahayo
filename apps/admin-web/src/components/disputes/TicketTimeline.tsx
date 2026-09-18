import {
  BadgeIndianRupee,
  Ban,
  CheckCheck,
  Hammer,
  Handshake,
  MapPin,
  MessageSquare,
  Navigation,
  PhoneCall,
  Radio,
  StickyNote,
  TimerOff,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { BookingEventKind } from '@sahayo/shared';
import { IconTile } from '@/components/ui-kit/IconTile';
import type { Tint } from '@/components/ui-kit/tint';
import { rupees } from '@/lib/format';
import type { TimelineNode } from '@/lib/services';
import { cn } from '@/lib/utils';

const EVENT: Record<string, { icon: LucideIcon; tint: Tint; title: string }> = {
  [BookingEventKind.REQUESTED]: { icon: PhoneCall, tint: 'muted', title: 'Requested' },
  [BookingEventKind.BROADCAST]: { icon: Radio, tint: 'marigold', title: 'Offered out' },
  [BookingEventKind.PINGED]: { icon: Users, tint: 'marigold', title: 'Workers offered the job' },
  [BookingEventKind.ACCEPTED]: { icon: Handshake, tint: 'lavender', title: 'Accepted' },
  [BookingEventKind.EN_ROUTE]: { icon: Navigation, tint: 'lavender', title: 'On the way' },
  [BookingEventKind.ARRIVED]: { icon: MapPin, tint: 'lavender', title: 'Arrived' },
  [BookingEventKind.STARTED]: { icon: Hammer, tint: 'lavender', title: 'Work started' },
  [BookingEventKind.COMPLETED]: { icon: CheckCheck, tint: 'fund-green', title: 'Finished' },
  [BookingEventKind.PAID]: { icon: BadgeIndianRupee, tint: 'fund-green', title: 'Paid' },
  [BookingEventKind.CANCELLED]: { icon: Ban, tint: 'coral', title: 'Cancelled' },
  [BookingEventKind.EXPIRED]: { icon: TimerOff, tint: 'coral', title: 'No worker accepted' },
  [BookingEventKind.DISPUTED]: { icon: Ban, tint: 'coral', title: 'Disputed' },
};

/** The time of a node, short enough to sit in the gutter. */
function stamp(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** The drive to the job, as a sparkline. */
function RouteSparkline({ points }: { points: { x: number; y: number }[] }) {
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
  const start = points[0];
  const end = points[points.length - 1];
  return (
    <svg viewBox="-4 0 108 32" className="mt-1.5 h-9 w-48" aria-hidden>
      <path d={path} fill="none" stroke="hsl(var(--lavender))" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {start ? <circle cx={start.x} cy={start.y} r={2.5} fill="hsl(var(--muted))" /> : null}
      {end ? <circle cx={end.x} cy={end.y} r={3} fill="hsl(var(--lavender))" /> : null}
    </svg>
  );
}

export interface TicketTimelineProps {
  nodes: TimelineNode[];
  /** Scrolls to the full conversation when a message marker is clicked. Bookings have none. */
  onJumpToConversation?: () => void;
}

/**
 * The job, reconstructed from start to finish.
 *
 * This is the core of the ticket: before anyone decides a dispute, they should see
 * what actually happened — who was offered the job, how the worker ranked, how long
 * the drive and the work took, and where the money went. The moment the complaint is
 * about carries a coral marker, so the eye goes there first.
 *
 * Messages appear as one-line markers in their place in time; their full text is in
 * the conversation below, so nothing is read twice.
 */
export function TicketTimeline({ nodes, onJumpToConversation }: TicketTimelineProps) {
  return (
    <ol className="relative flex flex-col gap-3.5 pl-5">
      <span aria-hidden className="absolute bottom-3 left-[36px] top-3 w-px bg-hairline" />

      {nodes.map((node, index) => {
        if (node.kind === 'event') {
          const meta = EVENT[node.event.kind] ?? EVENT[BookingEventKind.REQUESTED];
          return (
            <li key={node.event.id} className="relative flex items-start gap-3">
              <span className="relative">
                <IconTile icon={meta.icon} tint={meta.tint} size="sm" className="ring-4 ring-surface" />
                {node.disputed ? (
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-coral ring-2 ring-surface"
                  />
                ) : null}
              </span>
              <div
                className={cn(
                  'min-w-0 flex-1 rounded-tile px-3 py-1.5',
                  node.disputed && 'border border-coral/60 bg-coral/10',
                )}
              >
                <p className="flex flex-wrap items-baseline gap-x-2 text-table text-ink">
                  <span className="font-medium">{meta.title}</span>
                  {node.event.workersPinged ? (
                    <span className="text-pill text-muted">
                      to <span className="tabular">{node.event.workersPinged}</span> workers
                    </span>
                  ) : null}
                  {node.event.equityRank ? (
                    <span className="text-pill text-muted">
                      ranked <span className="tabular">{node.event.equityRank}</span> on equity
                    </span>
                  ) : null}
                  {node.disputed ? (
                    <span className="text-pill font-medium text-ink">The complaint is about this</span>
                  ) : null}
                  <span className="ml-auto text-pill text-muted">{stamp(node.at)}</span>
                </p>
                <p className="text-pill text-muted">{node.event.detail}</p>
              </div>
            </li>
          );
        }

        if (node.kind === 'route') {
          return (
            <li key={`route-${index}`} className="relative flex items-start gap-3">
              <IconTile icon={Navigation} tint="lavender" size="sm" className="ring-4 ring-surface" />
              <div className="min-w-0 flex-1 px-3 py-1.5">
                <p className="text-table text-ink">
                  <span className="font-medium">Route to the job</span>{' '}
                  <span className="text-pill text-muted">
                    about <span className="tabular">{node.distanceKm}</span>km
                  </span>
                </p>
                <RouteSparkline points={node.points} />
              </div>
            </li>
          );
        }

        if (node.kind === 'split') {
          return (
            <li key={`split-${index}`} className="relative flex items-start gap-3">
              <IconTile icon={BadgeIndianRupee} tint="fund-green" size="sm" className="ring-4 ring-surface" />
              <div className="min-w-0 flex-1 px-3 py-1.5">
                <p className="text-table font-medium text-ink">How the payment was split</p>
                <p className="mt-0.5 flex flex-wrap gap-x-4 text-pill text-muted">
                  <span>
                    Worker <span className="tabular text-ink">{rupees(node.worker)}</span>
                  </span>
                  <span>
                    Platform <span className="tabular text-ink">{rupees(node.platform)}</span>
                  </span>
                  <span>
                    Fund <span className="tabular text-ink">{rupees(node.coopFund)}</span>
                  </span>
                </p>
              </div>
            </li>
          );
        }

        const { message } = node;
        const Icon = message.internal ? StickyNote : MessageSquare;
        return (
          <li key={message.id} className="relative flex items-start gap-3">
            <IconTile icon={Icon} tint={message.internal ? 'marigold' : 'muted'} size="sm" className="ring-4 ring-surface" />
            <button
              type="button"
              onClick={onJumpToConversation}
              className="min-w-0 flex-1 rounded-tile px-3 py-1.5 text-left hover:bg-marigold-tint/30"
            >
              <p className="flex items-baseline gap-2 text-table text-ink">
                <span className="font-medium">
                  {message.internal ? `${message.authorName} left an internal note` : `${message.authorName} wrote`}
                </span>
                <span className="ml-auto text-pill text-muted">{stamp(node.at)}</span>
              </p>
              <p className="truncate text-pill text-muted">{message.body}</p>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
