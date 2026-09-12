'use client';

import { Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { KycStatus } from '@sahayo/shared';
import { Avatar } from '@/components/ui-kit/Avatar';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { Select } from '@/components/ui-kit/Select';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import type { KycQueueItem } from '@/lib/services';
import { categoryLabel } from '@/lib/services';
import { cn } from '@/lib/utils';
import { DAY_MS, SEED_NOW } from '@/lib/dates';
import { DOCUMENT_LABEL, QUEUE_STATUS } from './review-copy';

export interface QueueFilters {
  status: string;
  documentType: string;
  search: string;
}

const STATUS_OPTIONS = [
  { value: KycStatus.PENDING, label: 'Pending' },
  { value: KycStatus.UNSUBMITTED, label: 'Submitted' },
  { value: KycStatus.VERIFIED, label: 'Verified' },
  { value: KycStatus.REJECTED, label: 'Rejected' },
];

export interface QueueListProps {
  items?: KycQueueItem[];
  filters: QueueFilters;
  onFiltersChange: (next: QueueFilters) => void;
  selectedId?: string;
  onSelect: (submissionId: string) => void;
  /** Enter on the list moves focus into the review pane. */
  onOpen: () => void;
}

/** How long ago something was submitted, in words. */
function submittedAgo(iso: string): string {
  const days = Math.floor((SEED_NOW.getTime() - Date.parse(iso)) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

/**
 * The review queue.
 *
 * Worked in volume, so it is worked from the keyboard: J and K move through the list
 * and Enter opens the selected submission in the review pane. The keys are ignored
 * while typing in the search box, where J and K are letters, not commands.
 */
export function QueueList({
  items,
  filters,
  onFiltersChange,
  selectedId,
  onSelect,
  onOpen,
}: QueueListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target?.closest('dialog')) return;
      if (!items || items.length === 0) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const index = items.findIndex((item) => item.submission.id === selectedId);
      if (event.key === 'j' || event.key === 'k') {
        event.preventDefault();
        const next =
          event.key === 'j'
            ? Math.min(items.length - 1, index + 1)
            : Math.max(0, index === -1 ? 0 : index - 1);
        onSelect(items[next].submission.id);
      } else if (event.key === 'Enter' && listRef.current?.contains(target)) {
        event.preventDefault();
        onOpen();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, selectedId, onSelect, onOpen]);

  /* Keep the selected row in view as J and K move past the edge. */
  useEffect(() => {
    if (!selectedId) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-submission="${selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Verification queue">
      <div className="flex flex-none flex-col gap-3 border-b border-hairline p-4">
        <label className="relative flex items-center">
          <span className="sr-only">Search by worker name</span>
          <Search
            size={16}
            strokeWidth={1.5}
            aria-hidden
            className="pointer-events-none absolute left-3 text-muted"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
            placeholder="Search by worker name"
            className="h-9 w-full rounded-pill border border-hairline bg-surface pl-9 pr-3 text-table text-ink placeholder:text-muted"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Status"
            allLabel="Any status"
            value={filters.status}
            onChange={(status) => onFiltersChange({ ...filters, status })}
            options={STATUS_OPTIONS}
          />
          <Select
            label="Document"
            allLabel="Any document"
            value={filters.documentType}
            onChange={(documentType) => onFiltersChange({ ...filters, documentType })}
            options={Object.entries(DOCUMENT_LABEL).map(([value, label]) => ({ value, label }))}
          />
        </div>
        <p className="text-pill text-muted">
          <kbd className="rounded-sm border border-hairline bg-surface px-1 font-mono">J</kbd> and{' '}
          <kbd className="rounded-sm border border-hairline bg-surface px-1 font-mono">K</kbd> move,{' '}
          <kbd className="rounded-sm border border-hairline bg-surface px-1 font-mono">Enter</kbd> opens
        </p>
      </div>

      <div className="scroll-hidden min-h-0 flex-1 overflow-y-auto">
        {!items ? (
          <div className="p-4">
            <Skeleton lines={10} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            className="p-4"
            title="Nothing in the queue matches"
            description="Clear the search, or set Status to Any status to see submissions that have already been decided."
          />
        ) : (
          <ul ref={listRef} className="flex flex-col" role="listbox" aria-label="Submissions">
            {items.map((item) => {
              const status = QUEUE_STATUS[item.status] ?? QUEUE_STATUS[KycStatus.PENDING];
              const selected = item.submission.id === selectedId;
              return (
                <li key={item.submission.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    data-submission={item.submission.id}
                    onClick={() => onSelect(item.submission.id)}
                    onDoubleClick={onOpen}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-hairline px-4 py-3 text-left transition-colors',
                      selected ? 'bg-marigold-tint/60' : 'hover:bg-marigold-tint/30',
                    )}
                  >
                    <Avatar name={item.workerName} src={item.workerAvatarUrl} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-table font-medium text-ink">{item.workerName}</span>
                        <StatusPill status={status.pill} label={status.label} />
                      </span>
                      <span className="mt-0.5 flex items-baseline justify-between gap-2 text-pill text-muted">
                        <span className="truncate">
                          {categoryLabel(item.workerCategory)} ·{' '}
                          {DOCUMENT_LABEL[item.submission.documentType] ?? item.submission.documentType}
                        </span>
                        <span className="flex-none">{submittedAgo(item.submission.submittedAt)}</span>
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
