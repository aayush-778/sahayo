'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { ProposalStatus, VoteDirection, type Proposal } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { StatusPill, type StatusVariant } from '@/components/ui-kit/StatusPill';
import { count, percent, rupees } from '@/lib/format';
import { hasQuorum } from '@/lib/services';

export const PROPOSAL_STATUS: Record<string, { label: string; pill: StatusVariant }> = {
  [ProposalStatus.OPEN]: { label: 'Open', pill: 'pending' },
  [ProposalStatus.PASSED]: { label: 'Passed', pill: 'verified' },
  [ProposalStatus.REJECTED]: { label: 'Rejected', pill: 'rejected' },
  [ProposalStatus.QUORUM_NOT_MET]: { label: 'Quorum not met', pill: 'offline' },
};

/** A date as members would say it. */
export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * The vote as one bar: for, against, and the members who have not voted yet.
 *
 * The not-yet-voted part is drawn, not left blank, because on a cooperative the silent
 * members are part of the result — a proposal carried by 50 of 140 is a different thing
 * from one carried by 120.
 */
export function VoteBar({ proposal }: { proposal: Proposal }) {
  const { votesFor, votesAgainst, electorate } = proposal;
  const cast = votesFor + votesAgainst;
  const share = (value: number) => (electorate ? (value / electorate) * 100 : 0);

  return (
    <div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-pill bg-hairline"
        role="img"
        aria-label={`${votesFor} for, ${votesAgainst} against, ${electorate - cast} not yet voted`}
      >
        <span className="h-full bg-fund-green" style={{ width: `${share(votesFor)}%` }} />
        <span className="h-full bg-muted/70" style={{ width: `${share(votesAgainst)}%` }} />
      </div>
      <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-pill text-muted">
        <span>
          <span className="tabular text-ink">{count(votesFor)}</span> for
          {cast > 0 ? <> ({percent(votesFor / cast)})</> : null}
        </span>
        <span>
          <span className="tabular text-ink">{count(votesAgainst)}</span> against
          {cast > 0 ? <> ({percent(votesAgainst / cast)})</> : null}
        </span>
        <span>
          <span className="tabular text-ink">{count(electorate - cast)}</span> yet to vote
        </span>
      </p>
    </div>
  );
}

export interface ProposalCardProps {
  proposal: Proposal;
  onOpen: () => void;
  onRecordVote: (direction: VoteDirection) => void;
}

/** One open proposal, with its vote, its quorum, and a way to record a member's vote. */
export function ProposalCard({ proposal, onOpen, onRecordVote }: ProposalCardProps) {
  const status = PROPOSAL_STATUS[proposal.status];
  const cast = proposal.votesFor + proposal.votesAgainst;
  const quorumMet = hasQuorum(proposal);
  const open = proposal.status === ProposalStatus.OPEN;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 text-left">
          <h3 className="font-display text-card-title font-medium text-ink hover:underline">
            {proposal.title}
          </h3>
          <p className="mt-0.5 text-pill text-muted">
            Put forward by {proposal.proposerName} · closes {longDate(proposal.closesAt)}
          </p>
        </button>
        <StatusPill status={status.pill} label={status.label} />
      </div>

      <p className="line-clamp-3 text-table text-ink">{proposal.description}</p>

      <p className="text-table text-muted">
        Asks for <span className="tabular font-medium text-ink">{rupees(proposal.amountRequested)}</span>
      </p>

      <VoteBar proposal={proposal} />

      <p className="text-table text-ink">
        <span className="tabular">{count(cast)}</span> of <span className="tabular">{count(proposal.electorate)}</span>{' '}
        voted.{' '}
        {quorumMet ? (
          <span className="font-medium">Quorum met.</span>
        ) : (
          <span className="text-muted">
            <span className="tabular">{count(proposal.quorum - cast)}</span> more needed for the result to count.
          </span>
        )}
      </p>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
        <Button variant="ghost" size="sm" onClick={onOpen}>
          Read in full
        </Button>
        {open ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<ThumbsDown size={14} strokeWidth={1.5} aria-hidden />}
              onClick={() => onRecordVote(VoteDirection.AGAINST)}
            >
              Record a vote against
            </Button>
            <Button
              variant="approve"
              size="sm"
              icon={<ThumbsUp size={14} strokeWidth={1.5} aria-hidden />}
              onClick={() => onRecordVote(VoteDirection.FOR)}
            >
              Record a vote for
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
