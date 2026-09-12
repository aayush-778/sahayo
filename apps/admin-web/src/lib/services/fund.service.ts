import {
  FUND_COMMUNITY_GOAL,
  FUND_LENDING_HEADROOM_SHARE,
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  LoanStatus,
  ProposalStatus,
  VoteDirection,
  type FundTotals,
  type LedgerEntry,
  type LoanRequest,
  type Paise,
  type Proposal,
} from '@sahayo/shared';
import { SEED_NOW } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';
import { appendEntries } from './ledger.service';

/**
 * The fund's position, derived from the ledger every time rather than stored.
 *
 * Derived, not stored, so it cannot drift: disbursing a loan writes a DEBIT and
 * the balance falls everywhere it appears — the fund page's hero figure, the
 * dashboard's hero card, and the lending headroom above the loan queue — without
 * any of them being told to update.
 */
export async function getFundTotals(): Promise<FundTotals> {
  const { ledger, workers } = adminState();
  const monthStart = `${SEED_NOW.toISOString().slice(0, 7)}-01`;

  let balance = 0;
  let contributedThisMonth = 0;
  let disbursedThisMonth = 0;

  for (const entry of ledger) {
    if (entry.account !== LedgerAccount.COOP_FUND) continue;

    const signed = entry.direction === LedgerDirection.CREDIT ? entry.amount : -entry.amount;
    balance += signed;

    if (entry.createdAt >= monthStart) {
      if (entry.direction === LedgerDirection.CREDIT) contributedThisMonth += entry.amount;
      else disbursedThisMonth += entry.amount;
    }
  }

  /*
    * Every worker who has contributed owns a share — which is all of them. A
    * share is earned by the 5% taken from their completed jobs, so it does not
    * lapse because a document needs re-checking. Filtering to currently-verified
    * workers made the hero line read "owned by 92 workers" while the directory
    * showed 140, and the smaller number is the wrong one.
    */
  const memberCount = workers.length;

  return respond({
    balance,
    contributedThisMonth,
    disbursedThisMonth,
    memberCount,
    lendingHeadroom: Math.round(balance * FUND_LENDING_HEADROOM_SHARE),
    communityGoal: FUND_COMMUNITY_GOAL,
  });
}

export async function listProposals(status?: ProposalStatus): Promise<Proposal[]> {
  const { proposals } = adminState();
  const matched = status ? proposals.filter((p) => p.status === status) : proposals;
  /* Open first, then most recently opened. */
  return respond(
    [...matched].sort((a, b) => {
      const aOpen = a.status === ProposalStatus.OPEN ? 0 : 1;
      const bOpen = b.status === ProposalStatus.OPEN ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return b.openedAt.localeCompare(a.openedAt);
    }),
  );
}

export async function getProposal(proposalId: string): Promise<Proposal | undefined> {
  const { proposals } = adminState();
  return respond(proposals.find((proposal) => proposal.id === proposalId));
}

/**
 * Casts a vote on an open proposal.
 *
 * Quorum is recomputed from the new tally rather than being a stored flag, so a
 * vote that crosses the threshold flips the indicator immediately. A proposal that
 * meets quorum but has more votes against it is REJECTED; one that has the
 * majority in favour but too few voters is QUORUM_NOT_MET, and the card says so
 * rather than reporting it as a rejection.
 */
export async function castVote(proposalId: string, direction: VoteDirection): Promise<Proposal> {
  const state = adminState();
  const proposal = state.proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal) throw new Error(`No proposal with id ${proposalId}`);
  if (proposal.status !== ProposalStatus.OPEN) {
    throw new Error('This proposal has closed, so no more votes can be cast.');
  }

  const votesFor = proposal.votesFor + (direction === VoteDirection.FOR ? 1 : 0);
  const votesAgainst = proposal.votesAgainst + (direction === VoteDirection.AGAINST ? 1 : 0);

  if (votesFor + votesAgainst > proposal.electorate) {
    throw new Error('Every eligible member has already voted on this proposal.');
  }

  state.updateProposal(proposalId, { votesFor, votesAgainst });

  const updated = adminState().proposals.find((candidate) => candidate.id === proposalId);
  return respond(updated as Proposal);
}

/** Whether a proposal's tally has reached quorum. */
export function hasQuorum(proposal: Proposal): boolean {
  return proposal.votesFor + proposal.votesAgainst >= proposal.quorum;
}

/** The result a proposal would conclude with, given its tally right now. */
export function provisionalOutcome(proposal: Proposal): ProposalStatus {
  if (!hasQuorum(proposal)) return ProposalStatus.QUORUM_NOT_MET;
  return proposal.votesFor > proposal.votesAgainst
    ? ProposalStatus.PASSED
    : ProposalStatus.REJECTED;
}

export async function listLoanRequests(status?: LoanStatus): Promise<LoanRequest[]> {
  const { loanRequests } = adminState();
  const matched = status ? loanRequests.filter((loan) => loan.status === status) : loanRequests;
  /* Oldest request first: a queue of people waiting on money is worked in order. */
  return respond([...matched].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)));
}

/**
 * Disburses a micro-loan.
 *
 * Writes a DEBIT against the cooperative fund through the ledger service, so the
 * fund balance falls everywhere it is shown. Refuses if the amount exceeds the
 * fund's lending headroom — the fund keeps the rest liquid, because a loan book
 * that consumes the whole balance cannot also pay an accident claim the week it is
 * needed.
 */
export async function disburseLoan(loanId: string): Promise<LoanRequest> {
  const state = adminState();
  const loan = state.loanRequests.find((candidate) => candidate.id === loanId);
  if (!loan) throw new Error(`No loan request with id ${loanId}`);
  if (loan.status !== LoanStatus.PENDING) {
    return respond(loan);
  }

  const totals = await getFundTotals();
  if (loan.amount > totals.lendingHeadroom) {
    throw new Error(
      'This loan is larger than the fund is currently lending against. ' +
        'Wait for contributions to build, or approve a smaller amount.',
    );
  }

  const at = SEED_NOW.toISOString();
  const entry: LedgerEntry = {
    id: `led_${loan.id}_disbursement`,
    type: LedgerEntryType.COOP_FUND_DISBURSEMENT,
    account: LedgerAccount.COOP_FUND,
    direction: LedgerDirection.DEBIT,
    amount: loan.amount,
    subjectId: loan.workerId,
    description: `Micro-loan to ${loan.workerName}: ${loan.purpose}`,
    referenceKey: `${loan.id}:disbursement`,
    createdAt: at,
  };

  await appendEntries([entry]);
  state.updateLoanRequest(loanId, { status: LoanStatus.DISBURSED, decidedAt: at });

  const updated = adminState().loanRequests.find((candidate) => candidate.id === loanId);
  return respond(updated as LoanRequest);
}

/** Rejects a loan request. The reason is required, as with a KYC rejection. */
export async function rejectLoan(loanId: string, reason: string): Promise<LoanRequest> {
  const state = adminState();
  const loan = state.loanRequests.find((candidate) => candidate.id === loanId);
  if (!loan) throw new Error(`No loan request with id ${loanId}`);
  if (loan.status !== LoanStatus.PENDING) return respond(loan);

  state.updateLoanRequest(loanId, {
    status: LoanStatus.REJECTED,
    decidedAt: SEED_NOW.toISOString(),
    rejectionReason: reason,
  });

  const updated = adminState().loanRequests.find((candidate) => candidate.id === loanId);
  return respond(updated as LoanRequest);
}

export interface FundGrowthPoint {
  bucket: string;
  label: string;
  /** Running balance at the end of this month. */
  balance: Paise;
  contributed: Paise;
  disbursed: Paise;
}

/** Twelve months of fund growth, for the stacked area chart. */
export async function getFundGrowth(): Promise<FundGrowthPoint[]> {
  const { ledger } = adminState();
  const months = new Map<string, { contributed: Paise; disbursed: Paise }>();

  for (const entry of ledger) {
    if (entry.account !== LedgerAccount.COOP_FUND) continue;
    const bucket = entry.createdAt.slice(0, 7);
    const existing = months.get(bucket) ?? { contributed: 0, disbursed: 0 };
    if (entry.direction === LedgerDirection.CREDIT) existing.contributed += entry.amount;
    else existing.disbursed += entry.amount;
    months.set(bucket, existing);
  }

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let running = 0;

  const points = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, totals]) => {
      running += totals.contributed - totals.disbursed;
      return {
        bucket,
        label: MONTH_NAMES[Number(bucket.slice(5, 7)) - 1] ?? bucket,
        balance: running,
        contributed: totals.contributed,
        disbursed: totals.disbursed,
      };
    });

  return respond(points);
}
