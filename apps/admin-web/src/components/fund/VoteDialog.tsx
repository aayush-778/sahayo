'use client';

import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { VoteDirection, type Proposal } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { categoryLabel, listMembersYetToVote } from '@/lib/services';
import { cn } from '@/lib/utils';
import { Modal } from './Modal';

type Member = { id: string; name: string; category: string; zoneId: string };

export interface VoteDialogProps {
  proposal?: Proposal;
  direction: VoteDirection;
  zoneName: (zoneId: string) => string;
  onClose: () => void;
  onConfirm: (workerId: string, direction: VoteDirection) => Promise<void>;
}

/**
 * Records a vote for a named member.
 *
 * Administrators record votes that members gave by phone or on paper at a zone meeting.
 * The vote belongs to the member, so the dialog makes you choose which member before it
 * will record anything, and only lists members who have not voted yet — each member
 * votes once.
 */
export function VoteDialog({ proposal, direction, zoneName, onClose, onConfirm }: VoteDialogProps) {
  const [members, setMembers] = useState<Member[]>();
  const [search, setSearch] = useState('');
  const [memberId, setMemberId] = useState('');
  const [choice, setChoice] = useState<VoteDirection>(direction);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!proposal) return;
    setMembers(undefined);
    setSearch('');
    setMemberId('');
    setError(undefined);
    setChoice(direction);
    void listMembersYetToVote(proposal.id).then(setMembers);
  }, [proposal, direction]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (members ?? []).filter((member) => !needle || member.name.toLowerCase().includes(needle)).slice(0, 40);
  }, [members, search]);

  const chosen = members?.find((member) => member.id === memberId);

  async function submit(): Promise<void> {
    if (!memberId) {
      setError('Choose the member whose vote this is.');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await onConfirm(memberId, choice);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={Boolean(proposal)} onClose={onClose} labelledBy="vote-title">
      {proposal ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4 p-6"
        >
          <div>
            <h2 id="vote-title" className="font-display text-card-title font-medium text-ink">
              Record a member&rsquo;s vote
            </h2>
            <p className="mt-1 text-table text-muted">{proposal.title}</p>
          </div>

          <SegmentedToggle
            label="Their vote"
            value={choice}
            onChange={setChoice}
            options={[
              { value: VoteDirection.FOR, label: 'For' },
              { value: VoteDirection.AGAINST, label: 'Against' },
            ]}
          />

          <div className="flex flex-col gap-2">
            <label className="relative flex items-center">
              <span className="sr-only">Find a member</span>
              <Search size={16} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute left-3 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={members ? `Find one of ${members.length} members yet to vote` : 'Loading members…'}
                className="h-9 w-full rounded-pill border border-hairline bg-surface pl-9 pr-3 text-table text-ink placeholder:text-muted"
              />
            </label>
            <ul role="listbox" aria-label="Members yet to vote" className="scroll-hidden max-h-56 overflow-y-auto rounded-tile border border-hairline">
              {shown.length === 0 ? (
                <li className="px-3 py-3 text-table text-muted">
                  {members ? 'Nobody by that name is still to vote.' : 'Loading members…'}
                </li>
              ) : (
                shown.map((member) => (
                  <li key={member.id} role="option" aria-selected={member.id === memberId}>
                    <button
                      type="button"
                      onClick={() => setMemberId(member.id)}
                      className={cn(
                        'flex w-full items-baseline justify-between gap-3 border-b border-hairline px-3 py-2 text-left last:border-b-0',
                        member.id === memberId ? 'bg-marigold-tint/60' : 'hover:bg-marigold-tint/30',
                      )}
                    >
                      <span className="text-table text-ink">{member.name}</span>
                      <span className="text-pill text-muted">
                        {categoryLabel(member.category)} · {zoneName(member.zoneId)}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {error ? (
            <p role="alert" className="text-pill text-ink">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant={choice === VoteDirection.FOR ? 'approve' : 'outline'} disabled={saving || !memberId}>
              {chosen
                ? `Record ${chosen.name.split(' ')[0]}'s vote ${choice === VoteDirection.FOR ? 'for' : 'against'}`
                : 'Record vote'}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
