'use client';

import { Download, Search } from 'lucide-react';
import type { Zone } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { Select } from '@/components/ui-kit/Select';

/** The filter state, which is also exactly what the URL carries. */
export interface BookingFilterState {
  search: string;
  period: '24H' | '7D' | '30D' | '90D';
  group: string;
  zone: string;
  category: string;
}

export const EMPTY_BOOKING_FILTERS: BookingFilterState = {
  search: '',
  period: '30D',
  group: '',
  zone: '',
  category: '',
};

const PERIODS = [
  { value: '24H' as const, label: '24 hours' },
  { value: '7D' as const, label: '7 days' },
  { value: '30D' as const, label: '30 days' },
  { value: '90D' as const, label: '90 days' },
];

export const GROUP_OPTIONS = [
  { value: 'LIVE', label: 'Moving now' },
  { value: 'FINISHED', label: 'Finished' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'DISPUTED', label: 'Disputed' },
];

export interface BookingFilterBarProps {
  value: BookingFilterState;
  onChange: (next: BookingFilterState) => void;
  zones: Zone[];
  categories: string[];
  matchCount: number;
  onExport: () => void;
}

/** Search, period and filters above the booking log. Every filter lives in the URL. */
export function BookingFilterBar({ value, onChange, zones, categories, matchCount, onExport }: BookingFilterBarProps) {
  const set = <K extends keyof BookingFilterState>(key: K, next: BookingFilterState[K]): void =>
    onChange({ ...value, [key]: next });

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedToggle label="Booked within" options={PERIODS} value={value.period} onChange={(next) => set('period', next)} />
        <Button
          variant="outline"
          icon={<Download size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onExport}
          disabled={matchCount === 0}
          className="border-marigold"
        >
          Export {matchCount.toLocaleString('en-IN')} bookings
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
          <span className="text-pill font-medium text-muted">Search</span>
          <span className="relative flex items-center">
            <Search size={16} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute left-3 text-muted" />
            <input
              type="search"
              value={value.search}
              onChange={(event) => set('search', event.target.value)}
              placeholder="Reference, customer or worker"
              className="h-9 w-full rounded-pill border border-hairline bg-surface pl-9 pr-3 text-table text-ink placeholder:text-muted"
            />
          </span>
        </label>
        <Select label="Status" value={value.group} onChange={(next) => set('group', next)} options={GROUP_OPTIONS} allLabel="Any status" className="w-40" />
        <Select
          label="Zone"
          value={value.zone}
          onChange={(next) => set('zone', next)}
          options={zones.map((zone) => ({ value: zone.id, label: zone.name }))}
          allLabel="All zones"
          className="w-40"
        />
        <Select
          label="Trade"
          value={value.category}
          onChange={(next) => set('category', next)}
          options={categories.map((category) => ({ value: category, label: category }))}
          allLabel="All trades"
          className="w-40"
        />
      </div>
    </Card>
  );
}
