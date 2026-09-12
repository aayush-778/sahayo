'use client';

import { useEffect, useState } from 'react';
import type { Proposal } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { count, rupees } from '@/lib/format';
import { getProposalBreakdown, type BreakdownRow, type ProposalBreakdown } from '@/lib/services';
import { Modal } from './Modal';
import { PROPOSAL_STATUS, VoteBar, longDate } from './ProposalCard';

function BreakdownTable({ rows }: { rows: BreakdownRow[] }) {
  return (
    <table className="w-full border-collapse text-table">
      <thead>
        <tr className="border-b border-hairline text-left">
          {['Group', 'For', 'Against', 'Yet to vote'].map((header, index) => (
            <th
              key={header}
              scope="col"
              className={`py-2 text-pill font-semibold uppercase tracking-[0.04em] text-muted ${index > 0 ? 'text-right' : ''}`}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const cast = row.for + row.against;
          return (
            <tr key={row.key} className="border-b border-hairline last:border-b-0">
              <td className="py-2 text-ink">
                {row.label}
                {cast > 0 ? (
                  <span className="mt-1 flex h-1 w-28 overflow-hidden rounded-pill bg-hairline" aria-hidden>
                    <span className="h-full bg-fund-green" style={{ width: `${(row.for / cast) * 100}%` }} />
                    <span className="h-full bg-muted/70" style={{ width: `${(row.against / cast) * 100}%` }} />
                  </span>
                ) : null}
              </td>
              <td className="tabular py-2 text-right text-ink">{row.for}</td>
              <td className="tabular py-2 text-right text-ink">{row.against}</td>
              <td className="tabular py-2 text-right text-muted">{row.notVoted}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export interface ProposalDetailDialogProps {
  proposal?: Proposal;
  onClose: () => void;
}

/**
 * A proposal in full: the whole text, how the vote split, and what members said.
 *
 * The breakdown by trade and zone is counted from the named ballots, so a result that
 * rests on one zone or that one trade voted down together shows up here before the money
 * moves rather than after.
 */
export function ProposalDetailDialog({ proposal, onClose }: ProposalDetailDialogProps) {
  const [breakdown, setBreakdown] = useState<ProposalBreakdown>();
  const [view, setView] = useState<'category' | 'zone'>('category');

  useEffect(() => {
    if (!proposal) return;
    setBreakdown(undefined);
    void getProposalBreakdown(proposal.id).then(setBreakdown);
  }, [proposal]);

  const status = proposal ? PROPOSAL_STATUS[proposal.status] : undefined;

  return (
    <Modal open={Boolean(proposal)} onClose={onClose} labelledBy="proposal-title" className="w-[min(680px,calc(100vw-2rem))]">
      {proposal && status ? (
        <div className="flex max-h-[85vh] flex-col gap-5 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="proposal-title" className="font-display text-card-title font-medium text-ink">
                {proposal.title}
              </h2>
              <p className="mt-0.5 text-pill text-muted">
                Put forward by {proposal.proposerName} on {longDate(proposal.openedAt)} · voting{' '}
                {proposal.status === 'OPEN' ? 'closes' : 'closed'} {longDate(proposal.closesAt)}
              </p>
            </div>
            <StatusPill status={status.pill} label={status.label} />
          </div>

          <p className="text-body text-ink">{proposal.description}</p>
          <p className="text-table text-muted">
            Asks for <span className="tabular font-medium text-ink">{rupees(proposal.amountRequested)}</span> from the fund.
          </p>
          {proposal.outcomeNote ? (
            <p className="rounded-tile border border-hairline bg-ground p-3 text-table text-ink">
              <span className="font-medium">What happened: </span>
              {proposal.outcomeNote}
            </p>
          ) : null}

          <VoteBar proposal={proposal} />

          <section aria-label="How the vote split">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-card-title font-medium text-ink">How the vote split</h3>
              <SegmentedToggle
                label="Group the vote by"
                value={view}
                onChange={setView}
                options={[
                  { value: 'category', label: 'By trade' },
                  { value: 'zone', label: 'By zone' },
                ]}
              />
            </div>
            <div className="mt-3">
              {breakdown ? (
                <BreakdownTable rows={view === 'category' ? breakdown.byCategory : breakdown.byZone} />
              ) : (
                <Skeleton lines={6} />
              )}
            </div>
          </section>

          <section aria-label="What members said">
            <h3 className="font-display text-card-title font-medium text-ink">
              What members said <span className="tabular text-pill text-muted">({count(proposal.comments.length)})</span>
            </h3>
            {proposal.comments.length === 0 ? (
              <p className="mt-2 text-table text-muted">Nobody has commented yet. Members comment from the worker app.</p>
            ) : (
              <ol className="mt-3 flex flex-col gap-3">
                {proposal.comments.map((comment) => (
                  <li key={comment.id} className="border-l-2 border-hairline pl-3">
                    <p className="text-pill text-muted">
                      <span className="font-medium text-ink">{comment.authorName}</span> · {longDate(comment.createdAt)}
                    </p>
                    <p className="mt-0.5 text-table text-ink">{comment.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
