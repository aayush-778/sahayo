'use client';

import { Gavel } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DisputeOutcome, type Dispute } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { rupees } from '@/lib/format';
import { previewResolutionEntries } from '@/lib/services';
import { cn } from '@/lib/utils';

const OUTCOMES: { value: DisputeOutcome; label: string; detail: string; movesMoney: boolean }[] = [
  {
    value: DisputeOutcome.FULL_REFUND,
    label: 'Full refund',
    detail: 'The customer gets back everything they paid for this job.',
    movesMoney: true,
  },
  {
    value: DisputeOutcome.PARTIAL_REFUND,
    label: 'Partial refund',
    detail: 'The customer gets part of it back. You choose how much.',
    movesMoney: true,
  },
  {
    value: DisputeOutcome.PENALTY_WAIVED,
    label: 'Penalty waived',
    detail: 'No charge stands against the worker for this. No money moves.',
    movesMoney: false,
  },
  {
    value: DisputeOutcome.NO_ACTION,
    label: 'No action',
    detail: 'The complaint was looked into and nothing needs to change.',
    movesMoney: false,
  },
  {
    value: DisputeOutcome.WARNING_ISSUED,
    label: 'Warning issued',
    detail: 'A formal warning goes on record for the party at fault. No money moves.',
    movesMoney: false,
  },
];

const ACCOUNT_LABEL: Record<string, string> = {
  CUSTOMER: 'Customer receives',
  WORKER: 'Recovered from the worker',
  PLATFORM: 'Recovered from the platform',
  COOP_FUND: 'Recovered from the fund',
};

export interface ResolveDialogProps {
  /** The ticket being resolved. The dialog is open whenever this is set. */
  dispute?: Dispute;
  /** What was actually paid for the job, which caps any refund. */
  refundable: number;
  onCancel: () => void;
  onConfirm: (outcome: DisputeOutcome, note: string, refundAmount?: number) => Promise<void>;
}

/**
 * Resolves a ticket, showing the money before it moves.
 *
 * For a refund, the exact ledger rows are listed before the decision is confirmed:
 * the customer's money back, and the same amount recovered from the worker, the
 * platform and the fund in the proportions the job was split. They come from the same
 * function that posts them, so what is shown here is precisely what gets written.
 */
export function ResolveDialog({ dispute, refundable, onCancel, onConfirm }: ResolveDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [outcome, setOutcome] = useState<DisputeOutcome>(DisputeOutcome.NO_ACTION);
  const [rupeesInput, setRupeesInput] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dispute && !dialog.open) {
      setOutcome(DisputeOutcome.NO_ACTION);
      setRupeesInput('');
      setNote('');
      setError(undefined);
      dialog.showModal();
    } else if (!dispute && dialog.open) {
      dialog.close();
    }
  }, [dispute]);

  /* Rupees typed, held as paise. Money is never a float past this line. */
  const refundPaise = Math.round(Number(rupeesInput || '0') * 100);

  const preview = useMemo(
    () =>
      dispute
        ? previewResolutionEntries(
            dispute,
            outcome,
            outcome === DisputeOutcome.PARTIAL_REFUND ? refundPaise : undefined,
          )
        : [],
    [dispute, outcome, refundPaise],
  );

  const chosen = OUTCOMES.find((option) => option.value === outcome);
  const partialInvalid =
    outcome === DisputeOutcome.PARTIAL_REFUND &&
    (!Number.isFinite(refundPaise) || refundPaise <= 0 || refundPaise > refundable);

  async function submit(): Promise<void> {
    setSaving(true);
    setError(undefined);
    try {
      await onConfirm(
        outcome,
        note,
        outcome === DisputeOutcome.PARTIAL_REFUND ? refundPaise : undefined,
      );
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="resolve-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="w-[min(560px,calc(100vw-2rem))] rounded-card border border-hairline bg-surface p-0 text-ink shadow-card backdrop:bg-ink/30"
    >
      {dispute ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-6"
        >
          <div>
            <h2 id="resolve-title" className="font-display text-card-title font-medium text-ink">
              Resolve {dispute.reference}
            </h2>
            <p className="mt-1 text-table text-muted">
              {dispute.subject}. The job was paid{' '}
              <span className="tabular text-ink">{rupees(refundable)}</span>
              {refundable === 0 ? ', so a refund is not possible.' : '.'}
            </p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-pill font-medium text-muted">Outcome</legend>
            {OUTCOMES.map((option) => {
              const disabled = option.movesMoney && refundable === 0;
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-tile border px-3 py-2',
                    outcome === option.value ? 'border-marigold bg-marigold-tint/50' : 'border-hairline',
                    disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <input
                    type="radio"
                    name="outcome"
                    value={option.value}
                    checked={outcome === option.value}
                    disabled={disabled}
                    onChange={() => setOutcome(option.value)}
                    className="mt-1 accent-marigold"
                  />
                  <span>
                    <span className="block text-table font-medium text-ink">{option.label}</span>
                    <span className="block text-pill text-muted">{option.detail}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {outcome === DisputeOutcome.PARTIAL_REFUND ? (
            <label className="flex flex-col gap-1">
              <span className="text-pill font-medium text-muted">
                Amount to refund, up to {rupees(refundable)}
              </span>
              <span className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-table text-muted">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step="0.01"
                  value={rupeesInput}
                  onChange={(event) => setRupeesInput(event.target.value)}
                  className="tabular h-9 w-44 rounded-pill border border-hairline bg-surface pl-7 pr-3 text-table text-ink"
                />
              </span>
            </label>
          ) : null}

          {chosen?.movesMoney ? (
            <div className="rounded-tile border border-hairline bg-ground p-3">
              <p className="text-pill font-medium text-muted">
                New ledger entries this will add. Existing entries are not changed.
              </p>
              {preview.length === 0 ? (
                <p className="mt-2 text-table text-muted">
                  {outcome === DisputeOutcome.PARTIAL_REFUND
                    ? 'Enter an amount to see the entries.'
                    : 'Nothing to refund.'}
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1">
                  {preview.map((entry) => (
                    <li key={entry.id} className="flex items-baseline justify-between gap-3 text-table">
                      <span className="text-ink">{ACCOUNT_LABEL[entry.account] ?? entry.account}</span>
                      <span className="font-mono">
                        <span className={entry.direction === 'CREDIT' ? 'text-fund-green' : 'text-coral'}>
                          {entry.direction === 'CREDIT' ? '+' : '−'}
                        </span>
                        <span className="text-ink">{rupees(entry.amount, { decimals: true })}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <label className="flex flex-col gap-1">
            <span className="text-pill font-medium text-muted">Why this decision</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              required
              placeholder="Both parties can ask why. Write it so either could read it."
              className="rounded-tile border border-hairline bg-surface px-3 py-2 text-table text-ink placeholder:text-muted"
            />
          </label>

          {error ? (
            <p role="alert" className="text-pill text-ink">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              Keep the ticket open
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Gavel size={16} strokeWidth={1.5} aria-hidden />}
              disabled={saving || !note.trim() || partialInvalid}
            >
              {chosen?.movesMoney ? `Resolve with ${chosen.label.toLowerCase()}` : 'Resolve ticket'}
            </Button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
