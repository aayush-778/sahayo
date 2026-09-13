'use client';

import { Download, Search } from 'lucide-react';
import type { Zone } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { Select } from '@/components/ui-kit/Select';
import { SEGMENT_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS } from './customer-copy';

/** The filter state, which is also exactly what the URL carries. */
export interface CustomerFilterState {
  search: string;
  zone: string;
  segment: string;
  type: string;
  status: string;
}

export const EMPTY_CUSTOMER_FILTERS: CustomerFilterState = {
  search: '',
  zone: '',
  segment: '',
  type: '',
  status: '',
};

export interface CustomerFilterBarProps {
  value: CustomerFilterState;
  onChange: (next: CustomerFilterState) => void;
  zones: Zone[];
  matchCount: number;
  onExport: () => void;
}

/** Search and filters above the customer table. Every filter lives in the URL. */
export function CustomerFilterBar({ value, onChange, zones, matchCount, onExport }: CustomerFilterBarProps) {
  const set = <K extends keyof CustomerFilterState>(key: K, next: CustomerFilterState[K]): void =>
    onChange({ ...value, [key]: next });

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
          <span className="text-pill font-medium text-muted">Search</span>
          <span className="relative flex items-center">
            <Search size={16} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute left-3 text-muted" />
            <input
              type="search"
              value={value.search}
              onChange={(event) => set('search', event.target.value)}
              placeholder="Name, business, phone or email"
              className="h-9 w-full rounded-pill border border-hairline bg-surface pl-9 pr-3 text-table text-ink placeholder:text-muted"
            />
          </span>
        </label>
        <Select
          label="Zone"
          value={value.zone}
          onChange={(next) => set('zone', next)}
          options={zones.map((zone) => ({ value: zone.id, label: zone.name }))}
          allLabel="All zones"
          className="w-40"
        />
        <Select
          label="Booking pattern"
          value={value.segment}
          onChange={(next) => set('segment', next)}
          options={SEGMENT_OPTIONS}
          allLabel="Everyone"
          className="w-40"
        />
        <Select
          label="Type"
          value={value.type}
          onChange={(next) => set('type', next)}
          options={TYPE_OPTIONS}
          allLabel="All types"
          className="w-36"
        />
        <Select
          label="Account"
          value={value.status}
          onChange={(next) => set('status', next)}
          options={STATUS_OPTIONS}
          allLabel="Any account"
          className="w-36"
        />
        <Button
          variant="outline"
          icon={<Download size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onExport}
          disabled={matchCount === 0}
          className="border-marigold"
        >
          Export {matchCount.toLocaleString('en-IN')} customers
        </Button>
      </div>
    </Card>
  );
}
