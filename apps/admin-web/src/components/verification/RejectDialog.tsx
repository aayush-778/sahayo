'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { KycRejectionReason } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Select } from '@/components/ui-kit/Select';
import type { KycQueueItem } from '@/lib/services';
import { DOCUMENT_LABEL, REJECTION_REASONS } from './review-copy';

export interface RejectDialogProps {
  /** The submission being rejected. The dialog is open whenever this is set. */
  item?: KycQueueItem;
  onCancel: () => void;
  onConfirm: (reason: KycRejectionReason, note: string) => Promise<void>;
}

/**
 * Rejects a submission with a standard reason.
 *
 * The reason is required and chosen from a fixed list, because it is what the
 * worker's app receives, and a free-text rejection turns into "doc not ok". The
 * preview shows the worker's message word for word before anything is sent, with
 * any note the reviewer adds appended — so the reviewer writes for the worker, not
 * for the file.
 */
export function RejectDialog({ item, onCancel, onConfirm }: RejectDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (item && !dialog.open) {
      setReason('');
      setNote('');
      setError(undefined);
      dialog.showModal();
    } else if (!item && dialog.open) {
      dialog.close();
    }
  }, [item]);

  const documentLabel = item
    ? (DOCUMENT_LABEL[item.submission.documentType] ?? 'document')
    : 'document';
  const chosen = reason ? REJECTION_REASONS[reason as KycRejectionReason] : undefined;
  const firstName = item?.workerName.split(' ')[0] ?? '';

  async function submit(): Promise<void> {
    if (!reason) {
      setError('Choose a reason. It is what the worker will be told.');
      return;
    }
    setSending(true);
    setError(undefined);
    try {
      await onConfirm(reason as KycRejectionReason, note.trim());
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reject-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="w-[min(520px,calc(100vw-2rem))] rounded-card border border-hairline bg-surface p-0 text-ink shadow-card backdrop:bg-ink/30"
    >
      {item ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4 p-6"
        >
          <div>
            <h2 id="reject-title" className="font-display text-card-title font-medium text-ink">
              Reject {firstName}&rsquo;s {documentLabel}
            </h2>
            <p className="mt-1 text-table text-muted">
              {firstName} will not be able to take jobs until a new document is approved.
            </p>
          </div>

          <Select
            label="Reason"
            allLabel="Choose a reason"
            value={reason}
            onChange={setReason}
            options={Object.entries(REJECTION_REASONS).map(([value, entry]) => ({
              value,
              label: entry.label,
            }))}
          />

          <label className="flex flex-col gap-1">
            <span className="text-pill font-medium text-muted">Note to the worker (optional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="For example: the top edge of the card is cut off"
              className="rounded-tile border border-hairline bg-surface px-3 py-2 text-table text-ink placeholder:text-muted"
            />
          </label>

          <div className="rounded-tile border border-hairline bg-ground p-3">
            <p className="text-pill font-medium text-muted">What {firstName} will see in the app</p>
            {chosen ? (
              <p className="mt-1.5 text-table text-ink">
                {chosen.message(documentLabel)}
                {note.trim() ? <> {note.trim()}</> : null}
              </p>
            ) : (
              <p className="mt-1.5 text-table text-muted">Choose a reason to preview the message.</p>
            )}
          </div>

          {error ? (
            <p role="alert" className="text-pill text-ink">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={sending}>
              Keep reviewing
            </Button>
            <Button
              type="submit"
              variant="danger"
              icon={<X size={16} strokeWidth={1.5} aria-hidden />}
              disabled={sending || !reason}
            >
              Reject and notify {firstName}
            </Button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
