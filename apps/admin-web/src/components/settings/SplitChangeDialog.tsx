'use client';

import { useEffect, useState } from 'react';
import type { RevenueSplitSettings } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Modal } from '@/components/ui-kit/Modal';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { count, rupees } from '@/lib/format';
import {
  SPLIT_CONFIRMATION_WORD,
  SPLIT_IMPACT_WINDOW_DAYS,
  applySplitChange,
  previewSplitChange,
  type SplitChangeImpact,
} from '@/lib/services';

const PARTIES = [
  { key: 'worker' as const, percent: 'workerPercent' as const, label: 'Worker', to: 'to workers' },
  { key: 'platform' as const, percent: 'platformPercent' as const, label: 'Platform', to: 'to the platform' },
  { key: 'coopFund' as const, percent: 'fundPercent' as const, label: 'Cooperative fund', to: 'to the cooperative fund' },
];

/** "₹7,800 less to workers and ₹7,800 more to the platform", from signed deltas. */
function consequence(impact: SplitChangeImpact): string {
  const parts = PARTIES.filter((party) => impact.monthDelta[party.key] !== 0).map((party) => {
    const delta = impact.monthDelta[party.key];
    return `${rupees(Math.abs(delta))} ${delta < 0 ? 'less' : 'more'} ${party.to}`;
  });
  if (parts.length === 0) return 'no change to what anyone receives';
  if (parts.length === 1) return parts[0] as string;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export interface SplitChangeDialogProps {
  /** The split the sliders were moved to. Undefined keeps the dialog closed. */
  proposed?: RevenueSplitSettings;
  onCancel: () => void;
  onChanged: (message: string) => void;
}

/**
 * The friction on the most consequential setting in the product.
 *
 * Moving a split slider never saves. Letting go opens this, which works out what the
 * change means in rupees — on an average booking, and across every booking completed
 * last month — and will not proceed until the administrator types the confirmation
 * word. Worker income is the thing this cooperative exists to protect, so changing it
 * should take deliberate keystrokes, not a stray drag.
 */
export function SplitChangeDialog({ proposed, onCancel, onChanged }: SplitChangeDialogProps) {
  const [impact, setImpact] = useState<SplitChangeImpact>();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setImpact(undefined);
    setTyped('');
    setError(undefined);
    if (!proposed) return;
    let cancelled = false;
    previewSplitChange(proposed)
      .then((next) => {
        if (!cancelled) setImpact(next);
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message);
      });
    return () => {
      cancelled = true;
    };
  }, [proposed]);

  async function confirm(): Promise<void> {
    if (!proposed) return;
    setSaving(true);
    setError(undefined);
    try {
      await applySplitChange(proposed, typed);
      onChanged(
        `Changed the split to worker ${proposed.workerPercent}%, platform ${proposed.platformPercent}%, fund ${proposed.fundPercent}% for bookings paid from now on.`,
      );
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const worker = impact
    ? { before: impact.onAverage.current.worker, after: impact.onAverage.proposed.worker }
    : undefined;

  return (
    <Modal open={Boolean(proposed)} onClose={onCancel} labelledBy="split-change-title" className="w-[min(580px,calc(100vw-2rem))]">
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void confirm();
        }}
      >
        <div>
          <h2 id="split-change-title" className="font-display text-card-title font-medium text-ink">
            Change where each booking&rsquo;s money goes
          </h2>
          <p className="mt-1 text-table text-muted">
            Applies to bookings paid from now on. Nothing already in the ledger is re-split.
          </p>
        </div>

        {!impact || !worker ? (
          error ? null : <Skeleton lines={5} />
        ) : (
          <>
            <p className="rounded-tile border border-hairline bg-marigold-tint/50 px-4 py-3 font-display text-body leading-relaxed text-ink">
              This changes the worker&rsquo;s payout on an average{' '}
              <span className="tabular">{rupees(impact.averageGross)}</span> booking from{' '}
              <span className="tabular">{rupees(worker.before)}</span> to{' '}
              <span className="tabular">{rupees(worker.after)}</span>. Across last month&rsquo;s{' '}
              <span className="tabular">{count(impact.bookingCount)}</span> bookings that is{' '}
              <span className="tabular">{consequence(impact)}</span>.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-table">
                <caption className="sr-only">
                  The split before and after, on an average booking and across the last {SPLIT_IMPACT_WINDOW_DAYS} days
                </caption>
                <thead>
                  <tr className="text-left text-pill text-muted">
                    <th scope="col" className="pb-2 font-medium">Goes to</th>
                    <th scope="col" className="pb-2 text-right font-medium">Share</th>
                    <th scope="col" className="pb-2 text-right font-medium">Average booking</th>
                    <th scope="col" className="pb-2 text-right font-medium">Last month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {PARTIES.map((party) => {
                    const delta = impact.monthDelta[party.key];
                    return (
                      <tr key={party.key}>
                        <th scope="row" className="py-2 text-left font-normal text-ink">{party.label}</th>
                        <td className="tabular py-2 text-right text-ink">
                          {impact.current[party.percent]}% to {impact.proposed[party.percent]}%
                        </td>
                        <td className="tabular py-2 text-right text-ink">
                          {rupees(impact.onAverage.current[party.key])} to {rupees(impact.onAverage.proposed[party.key])}
                        </td>
                        <td className="tabular py-2 text-right text-ink">
                          {delta === 0 ? 'No change' : `${delta < 0 ? 'less ' : 'more '}${rupees(Math.abs(delta))}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-pill font-medium text-muted">
                Type <span className="font-semibold text-ink">{SPLIT_CONFIRMATION_WORD}</span> to change the split
              </span>
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                autoFocus
                spellCheck={false}
                aria-describedby="split-change-title"
                className="h-9 rounded-pill border border-hairline bg-surface px-3 text-table tracking-wide text-ink"
              />
            </label>
          </>
        )}

        {error ? (
          <p role="alert" className="text-pill text-ink">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Keep the current split
          </Button>
          <Button type="submit" variant="danger" disabled={!impact || typed !== SPLIT_CONFIRMATION_WORD || saving}>
            {saving ? 'Changing the split' : 'Change the split'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
