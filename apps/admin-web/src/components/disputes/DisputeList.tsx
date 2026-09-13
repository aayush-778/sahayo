'use client';

import { HardHat, UserRound } from 'lucide-react';
import { DisputeOrigin, DisputeStatus, type Dispute } from '@sahayo/shared';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatusPill, type StatusVariant } from '@/components/ui-kit/StatusPill';
import { rupees } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui-kit/Button';

export type DisputeTab = 'ALL' | 'CUSTOMER' | 'WORKER' | 'OPEN' | 'RESOLVED';

const TABS: { value: DisputeTab; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'CUSTOMER', label: 'Raised by customer' },
  { value: 'WORKER', label: 'Raised by worker' },
  { value: 'OPEN', label: 'Open' },
  { value: 'RESOLVED', label: 'Resolved' },
];

export const DISPUTE_STATUS: Record<string, { label: string; pill: StatusVariant }> = {
  [DisputeStatus.OPEN]: { label: 'Open', pill: 'pending' },
  [DisputeStatus.INVESTIGATING]: { label: 'Looking into it', pill: 'active' },
  [DisputeStatus.RESOLVED]: { label: 'Resolved', pill: 'resolved' },
};

/**
 * Who raised a ticket, as a badge readable at a glance.
 *
 * This is the platform's differentiator made visible. On an aggregator only a
 * customer can complain; here a worker can too, and the queue shows it on every row
 * rather than in a detail field. The two badges differ in icon and word as well as
 * tint, so the distinction never rests on colour.
 */
export function OriginBadge({ origin }: { origin: Dispute['raisedBy'] }) {
  const worker = origin === DisputeOrigin.WORKER;
  const Icon = worker ? HardHat : UserRound;
  return (
    <span
      className={cn(
        'inline-flex flex-none items-center gap-1 rounded-pill px-2 py-0.5 text-pill font-medium',
        worker ? 'bg-lavender/15 text-ink' : 'bg-marigold-tint text-ink',
      )}
    >
      <Icon size={12} strokeWidth={1.75} aria-hidden />
      {worker ? 'Worker' : 'Customer'}
    </span>
  );
}

export interface DisputeListProps {
  disputes?: Dispute[];
  counts?: { customer: number; worker: number };
  tab: DisputeTab;
  onTabChange: (tab: DisputeTab) => void;
  selectedId?: string;
  onSelect: (disputeId: string) => void;
}

export function DisputeList({
  disputes,
  counts,
  tab,
  onTabChange,
  selectedId,
  onSelect,
}: DisputeListProps) {
  return (
    <section aria-label="Dispute tickets" className="flex h-full min-h-0 flex-col">
      <div className="flex-none border-b border-hairline px-4 pb-3 pt-4">
        {/* The symmetry, stated as a sentence before anyone filters for it. */}
        <p className="text-table text-ink">
          {counts ? (
            <>
              <span className="tabular font-medium">{counts.worker}</span> raised by workers,{' '}
              <span className="tabular font-medium">{counts.customer}</span> by customers.
            </>
          ) : (
            'Counting tickets…'
          )}
        </p>

        <div role="tablist" aria-label="Filter tickets" className="mt-3 flex flex-wrap gap-1.5">
          {TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={tab === option.value}
              onClick={() => onTabChange(option.value)}
              className={cn(
                'rounded-pill border px-2.5 py-1 text-pill font-medium transition-colors',
                tab === option.value
                  ? 'border-marigold bg-marigold-tint text-ink'
                  : 'border-hairline bg-surface text-muted hover:text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-hidden min-h-0 flex-1 overflow-y-auto">
        {!disputes ? (
          <div className="p-4">
            <Skeleton lines={10} />
          </div>
        ) : disputes.length === 0 ? (
          <EmptyState
            className="p-4"
            title="No tickets here"
            description="Nobody has raised a dispute that matches this filter."
            action={
              tab === 'ALL' ? undefined : (
                <Button variant="outline" size="sm" onClick={() => onTabChange('ALL')}>
                  Show every ticket
                </Button>
              )
            }
          />
        ) : (
          <ul className="flex flex-col">
            {disputes.map((dispute) => {
              const status = DISPUTE_STATUS[dispute.status];
              const selected = dispute.id === selectedId;
              return (
                <li key={dispute.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(dispute.id)}
                    aria-current={selected ? 'true' : undefined}
                    className={cn(
                      'flex w-full flex-col gap-1 border-b border-hairline px-4 py-3 text-left transition-colors',
                      selected ? 'bg-marigold-tint/60' : 'hover:bg-marigold-tint/30',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <OriginBadge origin={dispute.raisedBy} />
                        <span className="truncate text-table font-medium text-ink">
                          {dispute.subject}
                        </span>
                      </span>
                      <StatusPill status={status.pill} label={status.label} />
                    </span>
                    <span className="flex items-baseline justify-between gap-2 text-pill text-muted">
                      <span className="truncate">
                        <span className="font-mono">{dispute.reference}</span> ·{' '}
                        {dispute.raisedBy === DisputeOrigin.WORKER
                          ? `${dispute.workerName} about ${dispute.customerName}`
                          : `${dispute.customerName} about ${dispute.workerName}`}
                      </span>
                      <span className="tabular flex-none text-ink">
                        {rupees(dispute.amountInDispute)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
