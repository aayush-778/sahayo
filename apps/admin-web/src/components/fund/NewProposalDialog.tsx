'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AdminWorker } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Select } from '@/components/ui-kit/Select';
import { rupees } from '@/lib/format';
import { VOTING_WINDOW_DAYS, type NewProposalInput } from '@/lib/services';
import { Modal } from '@/components/ui-kit/Modal';

export interface NewProposalDialogProps {
  open: boolean;
  members: AdminWorker[];
  fundBalance: number;
  onClose: () => void;
  onConfirm: (input: NewProposalInput) => Promise<void>;
}

/**
 * Puts a new proposal to the members.
 *
 * It is put forward by a named member, because the fund is the workers' and the
 * administrator's part is to record what they want voted on. The form asks for what a
 * member would need to decide: what it is, what the money would do, how much, and how
 * long everyone has to vote.
 */
export function NewProposalDialog({ open, members, fundBalance, onClose, onConfirm }: NewProposalDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('10');
  const [proposerId, setProposerId] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setAmount('');
    setDays('10');
    setProposerId('');
    setError(undefined);
  }, [open]);

  const memberOptions = useMemo(
    () =>
      [...members]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((member) => ({ value: member.id, label: member.name })),
    [members],
  );

  const amountPaise = Math.round(Number(amount || '0') * 100);

  async function submit(): Promise<void> {
    setSaving(true);
    setError(undefined);
    try {
      await onConfirm({
        title,
        description,
        amountRequested: amountPaise,
        votingDays: Number(days),
        proposerId,
      });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-proposal-title">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-6"
      >
        <div>
          <h2 id="new-proposal-title" className="font-display text-card-title font-medium text-ink">
            Put a new proposal to the members
          </h2>
          <p className="mt-1 text-table text-muted">
            Every member can vote on it from the worker app. The fund holds {rupees(fundBalance)} today.
          </p>
        </div>

        <Select
          label="Put forward by"
          allLabel="Choose a member"
          value={proposerId}
          onChange={setProposerId}
          options={memberOptions}
        />

        <label className="flex flex-col gap-1">
          <span className="text-pill font-medium text-muted">What is it?</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="For example: Rain shelters at the busiest pickup points"
            className="h-9 rounded-pill border border-hairline bg-surface px-3 text-table text-ink placeholder:text-muted"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-pill font-medium text-muted">What would the money do?</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Say it the way you would explain it to a member at a zone meeting."
            className="rounded-tile border border-hairline bg-surface px-3 py-2 text-table text-ink placeholder:text-muted"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-pill font-medium text-muted">How much?</span>
            <span className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-table text-muted">₹</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="tabular h-9 w-full rounded-pill border border-hairline bg-surface pl-7 pr-3 text-table text-ink"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-pill font-medium text-muted">Voting open for</span>
            <span className="relative flex items-center">
              <input
                type="number"
                min={VOTING_WINDOW_DAYS.min}
                max={VOTING_WINDOW_DAYS.max}
                value={days}
                onChange={(event) => setDays(event.target.value)}
                className="tabular h-9 w-full rounded-pill border border-hairline bg-surface px-3 pr-12 text-table text-ink"
              />
              <span className="pointer-events-none absolute right-3 text-pill text-muted">days</span>
            </span>
          </label>
        </div>

        {error ? (
          <p role="alert" className="text-pill text-ink">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Discard proposal
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !proposerId || !title.trim() || amountPaise <= 0}>
            Put it to a vote
          </Button>
        </div>
      </form>
    </Modal>
  );
}
