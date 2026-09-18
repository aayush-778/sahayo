import { ProposalStatus, VoteDirection, type Id, type Proposal } from '@sahayo/shared';
import { state } from '../store';

export function list(): Proposal[] {
  return [...state().proposals.values()].sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));
}

export function findById(proposalId: Id): Proposal | undefined {
  return state().proposals.get(proposalId);
}

export type VoteRefusal = 'NOT_FOUND' | 'CLOSED' | 'ALREADY_VOTED';

/**
 * Records one member's vote. A member votes once: a second vote is refused, not
 * swapped for the first, and a vote after the window has closed is refused.
 */
export function vote(proposalId: Id, workerId: Id, direction: 'FOR' | 'AGAINST'): Proposal | VoteRefusal {
  const proposal = findById(proposalId);
  if (!proposal) return 'NOT_FOUND';
  if (proposal.status !== ProposalStatus.OPEN || proposal.closesAt < new Date().toISOString()) return 'CLOSED';
  if (proposal.ballots.some((ballot) => ballot.workerId === workerId)) return 'ALREADY_VOTED';

  const castAt = new Date().toISOString();
  const next: Proposal = {
    ...proposal,
    ballots: [...proposal.ballots, { workerId, direction: direction === 'FOR' ? VoteDirection.FOR : VoteDirection.AGAINST, castAt }],
    votesFor: proposal.votesFor + (direction === 'FOR' ? 1 : 0),
    votesAgainst: proposal.votesAgainst + (direction === 'AGAINST' ? 1 : 0),
  };
  state().proposals.set(proposalId, next);
  return next;
}
