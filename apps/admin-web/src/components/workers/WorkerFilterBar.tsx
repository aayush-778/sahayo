'use client';

import { Download, Search } from 'lucide-react';
import { KycStatus, WORKER_CATEGORIES, type Zone } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { Select } from '@/components/ui-kit/Select';
import { categoryLabel } from '@/lib/services';

/** The filter state, which is also exactly what the URL carries. */
export interface WorkerFilterState {
  search: string;
  category: string;
  zone: string;
  verification: string;
  online: string;
  /** Sorts under-allocated workers to the top, overriding the default sort. */
  underAllocatedFirst: boolean;
}

export const EMPTY_FILTERS: WorkerFilterState = {
  search: '',
  category: '',
  zone: '',
  verification: '',
  online: '',
  underAllocatedFirst: false,
};

const VERIFICATION_OPTIONS = [
  { value: KycStatus.VERIFIED, label: 'Verified' },
  { value: KycStatus.PENDING, label: 'Pending' },
  { value: KycStatus.REJECTED, label: 'Rejected' },
  { value: KycStatus.UNSUBMITTED, label: 'Not submitted' },
];

const ONLINE_OPTIONS = [
  { value: 'true', label: 'Online' },
  { value: 'false', label: 'Offline' },
];

export interface WorkerFilterBarProps {
  value: WorkerFilterState;
  onChange: (next: WorkerFilterState) => void;
  zones: Zone[];
  /** Rows currently matching, which the export label quotes. */
  matchCount: number;
  onExport: () => void;
}

/**
 * The directory's filter bar, in one card above the table.
 *
 * Filters compose — each narrows what the others left — and every one of them
 * lives in the URL, so a filtered view can be sent to a colleague and survives a
 * reload. That is the reason the state shape here is flat strings: it maps
 * one-to-one onto query parameters with no serialisation step to get wrong.
 */
export function WorkerFilterBar({
  value,
  onChange,
  zones,
  matchCount,
  onExport,
}: WorkerFilterBarProps) {
  const set = <K extends keyof WorkerFilterState>(
    key: K,
    next: WorkerFilterState[K],
  ): void => onChange({ ...value, [key]: next });

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="relative flex min-w-[14rem] flex-1 flex-col gap-1">
          <span className="text-pill font-medium text-muted">Search</span>
          <span className="relative flex items-center">
            <Search
              size={16}
              strokeWidth={1.5}
              aria-hidden
              className="pointer-events-none absolute left-3 text-muted"
            />
            <input
              type="search"
              value={value.search}
              onChange={(event) => set('search', event.target.value)}
              placeholder="Name or phone number"
              className="h-9 w-full rounded-pill border border-hairline bg-surface pl-9 pr-3 text-table text-ink placeholder:text-muted"
            />
          </span>
        </label>

        <Select
          className="w-40"
          label="Category"
          allLabel="All categories"
          value={value.category}
          onChange={(next) => set('category', next)}
          options={WORKER_CATEGORIES.map((category) => ({
            value: category,
            label: categoryLabel(category),
          }))}
        />

        <Select
          className="w-40"
          label="Zone"
          allLabel="All zones"
          value={value.zone}
          onChange={(next) => set('zone', next)}
          options={zones.map((zone) => ({ value: zone.id, label: zone.name }))}
        />

        <Select
          className="w-40"
          label="Verification"
          allLabel="Any status"
          value={value.verification}
          onChange={(next) => set('verification', next)}
          options={VERIFICATION_OPTIONS}
        />

        <Select
          className="w-32"
          label="Availability"
          allLabel="Any"
          value={value.online}
          onChange={(next) => set('online', next)}
          options={ONLINE_OPTIONS}
        />

        <Button
          variant="outline"
          icon={<Download size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onExport}
          className="border-marigold"
        >
          Export {matchCount} workers
        </Button>
      </div>

      {/*
       * The equity switch. It belongs beside the filters rather than in the table
       * header because it changes which rows matter, not merely their order: an
       * operator opens this page to find the people dispatch has been missing.
       */}
      <label className="mt-4 flex w-fit cursor-pointer items-center gap-2.5 border-t border-hairline pt-3.5">
        <input
          type="checkbox"
          checked={value.underAllocatedFirst}
          onChange={(event) => set('underAllocatedFirst', event.target.checked)}
          className="h-4 w-4 rounded-sm border-hairline accent-marigold"
        />
        <span className="text-table text-ink">Show under-allocated workers first</span>
        <span className="text-pill text-muted">Two jobs or fewer this week</span>
      </label>
    </Card>
  );
}
