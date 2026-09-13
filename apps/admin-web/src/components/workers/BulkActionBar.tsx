'use client';

import { BadgeCheck, Download, MapPin, X } from 'lucide-react';
import type { Zone } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Select } from '@/components/ui-kit/Select';
import { count } from '@/lib/format';

export interface BulkActionBarProps {
  selectedCount: number;
  zones: Zone[];
  pendingZone: string;
  onPendingZoneChange: (zoneId: string) => void;
  onVerify: () => void;
  onAssignZone: () => void;
  onExport: () => void;
  onClear: () => void;
  busy?: boolean;
}

/**
 * The bulk action bar, which slides up once rows are selected.
 *
 * Fixed to the bottom of the viewport rather than placed above the table, so it
 * stays reachable however far down a 140-row list the operator has scrolled. It
 * is only mounted when something is selected — an always-present bar with
 * disabled buttons teaches people to ignore that strip of the screen.
 */
export function BulkActionBar({
  selectedCount,
  zones,
  pendingZone,
  onPendingZoneChange,
  onVerify,
  onAssignZone,
  onExport,
  onClear,
  busy = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Actions for the selected workers"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-8 pb-6"
    >
      <div className="pointer-events-auto flex flex-wrap items-end gap-3 rounded-card border border-hairline bg-surface px-5 py-4 shadow-card">
        <p className="pb-2 text-table text-ink">
          <span className="tabular font-medium">{count(selectedCount)}</span>{' '}
          {selectedCount === 1 ? 'worker' : 'workers'} selected
        </p>

        <Button
          variant="primary"
          icon={<BadgeCheck size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onVerify}
          disabled={busy}
          className="mb-0.5"
        >
          Verify selected
        </Button>

        <div className="flex items-end gap-2">
          <Select
            className="w-40"
            label="Move to zone"
            allLabel="Choose a zone"
            value={pendingZone}
            onChange={onPendingZoneChange}
            options={zones.map((zone) => ({ value: zone.id, label: zone.name }))}
          />
          <Button
            variant="outline"
            icon={<MapPin size={16} strokeWidth={1.5} aria-hidden />}
            onClick={onAssignZone}
            disabled={busy || !pendingZone}
            className="mb-0.5"
          >
            Assign zone
          </Button>
        </div>

        <Button
          variant="outline"
          icon={<Download size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onExport}
          disabled={busy}
          className="mb-0.5"
        >
          Export selection
        </Button>

        <Button
          variant="ghost"
          icon={<X size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onClear}
          className="mb-0.5"
        >
          Clear selection
        </Button>
      </div>
    </div>
  );
}
