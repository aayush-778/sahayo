import type { Id, IsoDateTime, Paise } from './common';

/**
 * The cooperative fund: proposals the members vote on, and the micro-loans the
 * fund makes to them.
 *
 * Every settled booking routes COOP_FUND_SHARE of its gross here, and the
 * members decide together what it pays for. That decision record is the trust
 * artifact of this platform, so concluded proposals are never deleted.
 */

export const ProposalStatus = {
  OPEN: 'OPEN',
  PASSED: 'PASSED',
  REJECTED: 'REJECTED',
  QUORUM_NOT_MET: 'QUORUM_NOT_MET',
} as const;
export type ProposalStatus = (typeof ProposalStatus)[keyof typeof ProposalStatus];

export const VoteDirection = {
  FOR: 'FOR',
  AGAINST: 'AGAINST',
} as const;
export type VoteDirection = (typeof VoteDirection)[keyof typeof VoteDirection];

export interface ProposalComment {
  id: Id;
  authorId: Id;
  authorName: string;
  body: string;
  createdAt: IsoDateTime;
}

/**
 * One member's vote on one proposal.
 *
 * Kept as a record, not just a tally, for two reasons. Each member votes once, and a
 * count alone cannot enforce that. And the result has to be explainable — how drivers
 * voted against how cleaners did, how Danapur voted against Kankarbagh — which needs
 * to know who cast each vote. `votesFor` and `votesAgainst` are always equal to the
 * count of these by direction.
 */
export interface ProposalBallot {
  workerId: Id;
  direction: VoteDirection;
  castAt: IsoDateTime;
  /** Set when an administrator recorded the vote for a member, e.g. by phone. */
  recordedByAdminId?: Id;
}

export interface Proposal {
  id: Id;
  title: string;
  /** Plain language. What the money would do, in words a member would use. */
  description: string;
  amountRequested: Paise;
  proposerId: Id;
  proposerName: string;
  votesFor: number;
  votesAgainst: number;
  /** Votes needed for the result to count, not votes needed to pass. */
  quorum: number;
  /** Total eligible voters at the time the proposal opened. */
  electorate: number;
  status: ProposalStatus;
  openedAt: IsoDateTime;
  closesAt: IsoDateTime;
  comments: ProposalComment[];
  /** Every vote cast, one per member. */
  ballots: ProposalBallot[];
  /** What the money actually did, recorded once the proposal has concluded. */
  outcomeNote?: string;
}

export const LoanStatus = {
  PENDING: 'PENDING',
  DISBURSED: 'DISBURSED',
  REJECTED: 'REJECTED',
  REPAID: 'REPAID',
} as const;
export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

export interface LoanRequest {
  id: Id;
  workerId: Id;
  workerName: string;
  amount: Paise;
  /** Plain language, e.g. "Replace a stolen toolkit". */
  purpose: string;
  /** Repayment plan in words, e.g. "₹1,200 a month for 6 months". */
  repaymentPlan: string;
  repaymentMonths: number;
  /** What this worker has put into the fund, which the reviewer weighs. */
  lifetimeContribution: Paise;
  /** Still owed on any earlier loan. */
  outstanding: Paise;
  status: LoanStatus;
  requestedAt: IsoDateTime;
  decidedAt?: IsoDateTime;
  rejectionReason?: string;
}

/** The fund's position, derived from the ledger rather than stored. */
export interface FundTotals {
  balance: Paise;
  contributedThisMonth: Paise;
  disbursedThisMonth: Paise;
  /** Members who hold a share, which is every verified worker. */
  memberCount: number;
  /** What the fund is prepared to lend against its balance. */
  lendingHeadroom: Paise;
  /** The community target the progress bar runs toward. */
  communityGoal: Paise;
}
