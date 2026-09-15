'use client';

import { Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui-kit/Button';
import { rupees } from '@/lib/format';
import type { LedgerRow } from '@/lib/services';
import { shortId } from './LedgerTable';

export interface ReversalDialogProps {
  /** The row being reversed. The dialog is open whenever this is set. */
  row?: LedgerRow;
  onCancel: () => void;
  /** Resolves when the reversal is posted, or throws with a message to show. */
  onConfirm: (reason: string) => Promise<void>;
}

/**
 * Confirms a reversal before it is posted.
 *
 * It spells out what will happen in terms of rows, because that is the claim the
 * finance hub makes: a NEW row is added, the original stays exactly as it is, and
 * the two point at each other. A reason is required and is written into the new
 * row, since a correction without a reason is useless to anyone auditing it later.
 *
 * Built on the native <dialog> element, which provides Escape to close, a backdrop,
 * and keeps focus inside while open, without adding a dependency.
 */
export function ReversalDialog({ row, onCancel, onConfirm }: ReversalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (row && !dialog.open) {
      setReason('');
      setError(undefined);
      dialog.showModal();
    } else if (!row && dialog.open) {
      dialog.close();
    }
  }, [row]);

  async function submit(): Promise<void> {
    setPosting(true);
    setError(undefined);
    try {
      await onConfirm(reason);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reversal-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="w-[min(480px,calc(100vw-2rem))] rounded-card border border-hairline bg-surface p-0 text-ink shadow-card backdrop:bg-ink/30"
    >
      {row ? (
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4 p-6"
        >
          <div>
            <h2 id="reversal-title" className="font-display text-card-title font-medium text-ink">
              Issue a reversal
            </h2>
            <p className="mt-1 text-table text-muted">
              A new entry for <span className="tabular text-ink">{rupees(row.entry.amount)}</span>{' '}
              will be added in the opposite direction, cancelling{' '}
              <span className="font-mono text-ink">{shortId(row.entry.id)}</span> for{' '}
              {row.partyName}.
            </p>
          </div>

          <ul className="flex flex-col gap-1.5 rounded-tile border border-hairline bg-ground p-3 text-pill text-muted">
            <li>The original entry stays exactly as it is. Nothing about it changes.</li>
            <li>The new entry links back to it, and it links forward to the new one.</li>
            <li>Together they net to zero, and both stay in the ledger for good.</li>
          </ul>

          <label className="flex flex-col gap-1">
            <span className="text-pill font-medium text-muted">Why is this being reversed?</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              required
              placeholder="For example: payout recorded against the wrong booking"
              className="rounded-tile border border-hairline bg-surface px-3 py-2 text-table text-ink placeholder:text-muted"
            />
          </label>

          {error ? (
            <p role="alert" className="text-pill text-ink">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={posting}>
              Keep the entry as it is
            </Button>
            <Button
              type="submit"
              variant="danger"
              icon={<Undo2 size={16} strokeWidth={1.5} aria-hidden />}
              disabled={posting || !reason.trim()}
            >
              Issue reversal
            </Button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
