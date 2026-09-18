import { useMemo } from 'react';
import type { Booking, Id, LedgerEntry, Paise } from '@sahayo/shared';

import { COOP_MEMBER_COUNT, COOPERATIVE_NAME } from '../mocks';
import { ApiRequestError, api, isServerBacked, liveWorkerId } from '../realtime';
import { useSessionStore } from '../store/session';
import type { Localized, Proposal, VoteChoice, VoteTally } from '../types';
import { contributionFor } from './earnings';

/**
 * The cooperative fund, and deciding together how it is spent.
 *
 * Every figure is derived from the fund's ledger rows, so a job completed this
 * session moves the balance at once. Each proposal's tally is the other
 * members' votes plus this worker's own.
 */

const time = (iso: string) => new Date(iso).getTime();
const signed = (row: LedgerEntry) => (row.direction === 'CREDIT' ? row.amount : -row.amount);

export interface FundMonth {
  key: string;
  year: number;
  /** 0-11. */
  month: number;
  /** The balance at the end of that month — or now, for this month. */
  balance: Paise;
}

export interface FundOverview {
  name: Localized;
  balance: Paise;
  memberCount: number;
  /** Net change this month: contributions in, less anything paid out. */
  changeThisMonth: Paise;
  /** The last four months, oldest first. */
  monthly: FundMonth[];
  /** Everything every member has put in. */
  totalContributions: Paise;
  /** Everything the fund has paid out for members. */
  spentOnMembers: Paise;
}

function overviewOf(ledger: LedgerEntry[], now: Date, memberCount: number | null = null): FundOverview {
  const monthly = [3, 2, 1, 0].map((monthsAgo) => {
    const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const end = monthsAgo === 0 ? Number.POSITIVE_INFINITY : new Date(start.getFullYear(), start.getMonth() + 1, 1).getTime();
    return {
      key: `${start.getFullYear()}-${start.getMonth()}`,
      year: start.getFullYear(),
      month: start.getMonth(),
      balance: ledger.filter((row) => time(row.createdAt) < end).reduce((sum, row) => sum + signed(row), 0),
    };
  });

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return {
    name: COOPERATIVE_NAME,
    balance: ledger.reduce((sum, row) => sum + signed(row), 0),
    memberCount: memberCount ?? COOP_MEMBER_COUNT,
    changeThisMonth: ledger.filter((row) => time(row.createdAt) >= thisMonthStart).reduce((sum, row) => sum + signed(row), 0),
    monthly,
    totalContributions: ledger
      .filter((row) => row.type === 'COOP_FUND_CONTRIBUTION')
      .reduce((sum, row) => sum + row.amount, 0),
    spentOnMembers: ledger
      .filter((row) => row.type === 'COOP_FUND_DISBURSEMENT')
      .reduce((sum, row) => sum + row.amount, 0),
  };
}

export function useFundOverview(): FundOverview {
  const ledger = useSessionStore((state) => state.fundLedger);
  const memberCount = useSessionStore((state) => state.fundMemberCount);
  return useMemo(() => overviewOf(ledger, new Date(), memberCount), [ledger, memberCount]);
}

export function getFundOverview(): FundOverview {
  const { fundLedger, fundMemberCount } = useSessionStore.getState();
  return overviewOf(fundLedger, new Date(), fundMemberCount);
}

export interface MyContribution {
  lifetime: Paise;
  thisMonth: Paise;
  today: Paise;
  /** This worker's lifetime contribution as a share (0–1) of everything members put in. */
  share: number;
}

function myContributionOf(earnings: LedgerEntry[], bookings: Booking[], ledger: LedgerEntry[], now: Date): MyContribution {
  let lifetime = 0;
  let thisMonth = 0;
  let today = 0;
  for (const entry of earnings) {
    const amount = contributionFor(entry, bookings);
    const at = new Date(entry.createdAt);
    lifetime += amount;
    if (at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth()) {
      thisMonth += amount;
      if (at.getDate() === now.getDate()) today += amount;
    }
  }
  const total = overviewOf(ledger, now).totalContributions;
  return { lifetime, thisMonth, today, share: total > 0 ? lifetime / total : 0 };
}

/** What this worker has put into the fund, from the fund share of every job they did. */
export function useMyContribution(): MyContribution {
  const earnings = useSessionStore((state) => state.earnings);
  const bookings = useSessionStore((state) => state.bookings);
  const ledger = useSessionStore((state) => state.fundLedger);
  return useMemo(() => myContributionOf(earnings, bookings, ledger, new Date()), [earnings, bookings, ledger]);
}

export function getMyContribution(): MyContribution {
  const { earnings, bookings, fundLedger } = useSessionStore.getState();
  return myContributionOf(earnings, bookings, fundLedger, new Date());
}

// --- Proposals and voting -----------------------------------------------------

export interface ProposalView extends Proposal {
  myVote?: VoteChoice;
  /** The tally including this worker's vote. */
  liveTally: VoteTally;
  votesCast: number;
}

function view(proposal: Proposal, myVote: VoteChoice | undefined): ProposalView {
  const liveTally = { ...proposal.tally };
  if (myVote) liveTally[myVote] += 1;
  return { ...proposal, myVote, liveTally, votesCast: liveTally.yes + liveTally.no + liveTally.abstain };
}

export function isVotingOpen(proposal: Proposal, now: number = Date.now()): boolean {
  return proposal.status === 'active' && time(proposal.closesAt) > now;
}

/** Open votes, the one closing soonest first. */
export function useActiveProposals(): ProposalView[] {
  const proposals = useSessionStore((state) => state.proposals);
  const votes = useSessionStore((state) => state.votes);
  return useMemo(
    () =>
      proposals
        .filter((proposal) => proposal.status === 'active')
        .sort((a, b) => time(a.closesAt) - time(b.closesAt))
        .map((proposal) => view(proposal, votes[proposal.id])),
    [proposals, votes],
  );
}

/** Decided proposals, most recent first — what the fund has done. */
export function useClosedProposals(): ProposalView[] {
  const proposals = useSessionStore((state) => state.proposals);
  const votes = useSessionStore((state) => state.votes);
  return useMemo(
    () =>
      proposals
        .filter((proposal) => proposal.status !== 'active')
        .sort((a, b) => time(b.closesAt) - time(a.closesAt))
        .map((proposal) => view(proposal, votes[proposal.id])),
    [proposals, votes],
  );
}

export function useProposal(id: Id | undefined): ProposalView | undefined {
  const proposals = useSessionStore((state) => state.proposals);
  const votes = useSessionStore((state) => state.votes);
  return useMemo(() => {
    const proposal = proposals.find((entry) => entry.id === id);
    return proposal ? view(proposal, votes[proposal.id]) : undefined;
  }, [proposals, votes, id]);
}

/** A proposal as the fund screen shows it, read once — for checks outside React. */
export function getProposalView(id: Id): ProposalView | undefined {
  const { proposals, votes } = useSessionStore.getState();
  const proposal = proposals.find((entry) => entry.id === id);
  return proposal ? view(proposal, votes[proposal.id]) : undefined;
}

export type VoteResult = { ok: true } | { ok: false; reason: 'not_found' | 'closed' | 'already_voted' };

/**
 * Casts this worker's vote.
 *
 * ONE MEMBER, ONE VOTE, AND IT STANDS. A second call is refused rather than
 * replacing the first: a vote that can be quietly changed until the deadline
 * invites exactly the pressure a cooperative vote is meant to be free of.
 */
export async function castVote(proposalId: Id, choice: 'yes' | 'no'): Promise<VoteResult> {
  const { proposals, votes } = useSessionStore.getState();
  const proposal = proposals.find((entry) => entry.id === proposalId);
  if (!proposal) return { ok: false, reason: 'not_found' };
  if (!isVotingOpen(proposal)) return { ok: false, reason: 'closed' };
  if (votes[proposalId]) return { ok: false, reason: 'already_voted' };

  const workerId = liveWorkerId();
  if (isServerBacked() && workerId) {
    try {
      await api('POST', `/coop/proposals/${encodeURIComponent(proposalId)}/vote`, { workerId, direction: choice === 'yes' ? 'FOR' : 'AGAINST' });
    } catch (error) {
      const code = error instanceof ApiRequestError ? error.code : '';
      if (code === 'ALREADY_VOTED') return { ok: false, reason: 'already_voted' };
      if (code === 'VOTING_CLOSED') return { ok: false, reason: 'closed' };
      return { ok: false, reason: 'not_found' };
    }
  }
  useSessionStore.setState((state) => ({ votes: { ...state.votes, [proposalId]: choice } }));
  return { ok: true };
}
