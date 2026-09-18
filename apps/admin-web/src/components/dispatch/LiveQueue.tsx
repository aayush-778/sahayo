'use client';

import {
  Car,
  Cpu,
  Hammer,
  HeartHandshake,
  House,
  PaintRoller,
  Plug,
  Sparkles,
  Sprout,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { BookingStatus, type AdminBooking } from '@sahayo/shared';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { IconTile } from '@/components/ui-kit/IconTile';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatusPill, type StatusVariant } from '@/components/ui-kit/StatusPill';
import type { Tint } from '@/components/ui-kit/tint';
import { rupees } from '@/lib/format';
import { secondsSinceRequest } from '@/lib/services';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui-kit/Button';

/** An icon and tint per trade, keyed by the booking's trade label, so a queue row is identifiable at a glance. */
const TRADE: Record<string, { icon: LucideIcon; tint: Tint }> = {
  plumber: { icon: Wrench, tint: 'lavender' },
  electrician: { icon: Plug, tint: 'marigold' },
  caregiver: { icon: HeartHandshake, tint: 'coral' },
  driver: { icon: Car, tint: 'lavender' },
  cleaner: { icon: Sparkles, tint: 'fund-green' },
  carpenter: { icon: Hammer, tint: 'marigold' },
  painter: { icon: PaintRoller, tint: 'coral' },
  'domestic helper': { icon: House, tint: 'fund-green' },
  gardener: { icon: Sprout, tint: 'fund-green' },
  technician: { icon: Cpu, tint: 'lavender' },
};

const STATUS: Record<string, { status: StatusVariant; label: string }> = {
  [BookingStatus.REQUESTED]: { status: 'pending', label: 'Waiting to go out' },
  [BookingStatus.BROADCAST]: { status: 'pending', label: 'Offered out' },
  [BookingStatus.ACCEPTED]: { status: 'active', label: 'Accepted' },
  [BookingStatus.EN_ROUTE]: { status: 'active', label: 'On the way' },
  [BookingStatus.ARRIVED]: { status: 'active', label: 'Arrived' },
  [BookingStatus.IN_PROGRESS]: { status: 'active', label: 'In progress' },
};

/** Seconds as a readable age: 48s, 4m 10s, 2h 5m. */
function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export interface LiveQueueProps {
  bookings?: AdminBooking[];
  zoneName: (zoneId: string) => string;
  selectedId?: string;
  onSelect: (bookingId: string) => void;
  /** Puts a request through the dispatcher, offered from the empty state. */
  onSimulate?: () => void;
}

/**
 * The live queue: every job currently in flight.
 *
 * The age counter ticks once a second on its own clock, offset from the booking's
 * recorded age. The underlying data is anchored to a fixed instant, so without a
 * ticking offset the counters would sit frozen and the queue would look dead.
 * Requests under a minute old get a pulse, because those are the ones a dispatcher
 * can still act on.
 */
export function LiveQueue({ bookings, zoneName, selectedId, onSelect, onSimulate }: LiveQueueProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside className="flex h-full w-[380px] flex-none flex-col border-l border-hairline bg-surface">
      <div className="flex-none border-b border-hairline px-5 py-4">
        <h2 className="font-display text-card-title font-medium text-ink">Live queue</h2>
        <p className="mt-0.5 text-pill text-muted">
          {bookings
            ? `${bookings.length} ${bookings.length === 1 ? 'job' : 'jobs'} in flight right now`
            : 'Loading the jobs in flight'}
        </p>
      </div>

      <div className="scroll-hidden flex-1 overflow-y-auto">
        {!bookings ? (
          <div className="p-5">
            <Skeleton lines={8} />
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            className="p-5"
            title="Nothing in flight"
            description="Open requests and jobs in progress appear here as customers book."
            action={
              onSimulate ? (
                <Button variant="outline" size="sm" onClick={onSimulate}>
                  Simulate request
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="flex flex-col">
            {bookings.map((booking) => {
              const trade = TRADE[booking.category.toLowerCase()] ?? {
                icon: Wrench,
                tint: 'muted' as Tint,
              };
              const status = STATUS[booking.status] ?? {
                status: 'pending' as StatusVariant,
                label: booking.status,
              };
              const age = secondsSinceRequest(booking) + tick;
              const isFresh = age < 60;
              const isSelected = booking.id === selectedId;

              return (
                <li key={booking.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(booking.id)}
                    aria-current={isSelected ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-hairline px-5 py-3.5 text-left transition-colors',
                      isSelected ? 'bg-marigold-tint/60' : 'hover:bg-marigold-tint/30',
                    )}
                  >
                    <span className="relative flex-none">
                      <IconTile icon={trade.icon} tint={trade.tint} size="sm" />
                      {isFresh ? (
                        <span
                          aria-hidden
                          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-coral ring-2 ring-surface"
                        />
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-table font-medium text-ink">
                          {booking.customerName}
                        </span>
                        <span className="tabular flex-none text-table text-ink">
                          {rupees(booking.amount)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-baseline justify-between gap-2">
                        <span className="truncate text-pill text-muted">
                          {booking.category} in {zoneName(booking.zoneId)}
                        </span>
                        <span
                          className={cn(
                            'tabular flex-none text-pill',
                            isFresh ? 'text-coral' : 'text-muted',
                          )}
                        >
                          {formatAge(age)}
                        </span>
                      </span>
                      <span className="mt-1.5 block">
                        <StatusPill status={status.status} label={status.label} />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
