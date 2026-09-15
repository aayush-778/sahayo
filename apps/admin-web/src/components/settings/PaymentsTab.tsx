'use client';

import { useEffect, useState } from 'react';
import type { RevenueSplitSettings } from '@sahayo/shared';
import { Card } from '@/components/ui-kit/Card';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Slider } from '@/components/ui-kit/Slider';
import { rupees } from '@/lib/format';
import { SplitChangeDialog } from './SplitChangeDialog';

type ShareKey = keyof RevenueSplitSettings;

/**
 * Moves one share and keeps the three summing to 100.
 *
 * The platform absorbs a change to the worker's or the fund's share, because the
 * platform's fee is the lever the cooperative actually argues about. Moving the platform
 * fee itself is absorbed by the worker. A share can never be pushed below zero.
 */
export function rebalanceSplit(split: RevenueSplitSettings, key: ShareKey, value: number): RevenueSplitSettings {
  if (key === 'platformPercent') {
    const platformPercent = Math.min(value, 100 - split.fundPercent);
    return { ...split, platformPercent, workerPercent: 100 - platformPercent - split.fundPercent };
  }
  const other: ShareKey = key === 'workerPercent' ? 'fundPercent' : 'workerPercent';
  const clamped = Math.min(value, 100 - split[other]);
  return { ...split, [key]: clamped, platformPercent: 100 - clamped - split[other] };
}

const SHARES: ReadonlyArray<{ key: ShareKey; label: string; description: string }> = [
  {
    key: 'workerPercent',
    label: 'To the worker',
    description: 'What the person who did the job is paid. Moving this moves the platform fee the other way.',
  },
  {
    key: 'platformPercent',
    label: 'Platform fee',
    description: 'What pays for servers, payment fees and support. Moving this moves the worker share the other way.',
  },
  {
    key: 'fundPercent',
    label: 'To the cooperative fund',
    description: 'Owned by every member together. Moving this moves the platform fee the other way.',
  },
];

export interface PaymentsTabProps {
  split: RevenueSplitSettings;
  onSaved: (message: string) => void;
}

/**
 * The revenue split.
 *
 * The sliders move a draft only. Letting go of one never saves: it opens the
 * confirmation, and cancelling puts the sliders back where the saved split is.
 */
export function PaymentsTab({ split, onSaved }: PaymentsTabProps) {
  const [draft, setDraft] = useState<RevenueSplitSettings>(split);
  const [confirming, setConfirming] = useState<RevenueSplitSettings>();

  useEffect(() => setDraft(split), [split]);

  const differs = (value: RevenueSplitSettings): boolean =>
    value.workerPercent !== split.workerPercent ||
    value.platformPercent !== split.platformPercent ||
    value.fundPercent !== split.fundPercent;

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12 p-6 lg:col-span-7">
        <SectionHeader
          title="Where each booking's money goes"
          subtitle="Letting go of a slider asks you to confirm before anything changes"
        />
        <div className="mt-5 flex flex-col gap-6">
          {SHARES.map((share) => (
            <Slider
              key={share.key}
              label={share.label}
              value={draft[share.key]}
              min={0}
              max={100}
              format={(value) => `${value}%`}
              onChange={(value) => setDraft(rebalanceSplit(draft, share.key, value))}
              onCommit={() => {
                if (differs(draft)) setConfirming(draft);
              }}
              description={share.description}
            />
          ))}
        </div>
      </Card>

      <Card className="col-span-12 flex flex-col gap-4 p-6 lg:col-span-5">
        <SectionHeader title="In force now" subtitle="The split new bookings are paid at" />
        <dl className="flex flex-col divide-y divide-hairline">
          {[
            { label: 'Worker', value: split.workerPercent, dot: 'bg-marigold' },
            { label: 'Platform', value: split.platformPercent, dot: 'bg-muted' },
            { label: 'Cooperative fund', value: split.fundPercent, dot: 'bg-fund-green' },
          ].map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
              <dt className="flex items-center gap-2 text-table text-ink">
                <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                {row.label}
              </dt>
              <dd className="tabular font-display text-stat font-medium text-ink">{row.value}%</dd>
            </div>
          ))}
        </dl>
        <p className="mt-auto text-pill text-muted">
          On a {rupees(100000)} booking the worker receives {rupees(split.workerPercent * 1000)}. Changes
          apply to bookings paid after you confirm; every payment already made stays exactly as it was
          recorded.
        </p>
      </Card>

      <SplitChangeDialog
        proposed={confirming}
        onCancel={() => {
          setConfirming(undefined);
          setDraft(split);
        }}
        onChanged={(message) => {
          setConfirming(undefined);
          onSaved(message);
        }}
      />
    </div>
  );
}
