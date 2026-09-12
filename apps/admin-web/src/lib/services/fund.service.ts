import {
  FUND_COMMUNITY_GOAL,
  FUND_LENDING_HEADROOM_SHARE,
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  LoanStatus,
  PROPOSAL_QUORUM_SHARE,
  ProposalStatus,
  VoteDirection,
  type FundTotals,
  type LedgerEntry,
  type LoanRequest,
  type Paise,
  type Proposal,
} from '@sahayo/shared';
import { CURRENT_ADMIN } from '@/lib/nav/session';
import { DAY_MS, SEED_NOW } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';
import { appendEntries } from './ledger.service';
import { compareIso } from '@/lib/dates';

/**
 * The fund's position, derived from the ledger every time rather than stored.
 *
 * Derived, not stored, so it cannot drift: disbursing a loan writes a DEBIT and the
 * balance falls everywhere it appears — the fund page's hero figure, the dashboard's
 * hero card, and the lending headroom above the loan queue — without any of them
 * being told to update.
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

  return respond({
    balance,
    contributedThisMonth,
    disbursedThisMonth,
    /*
     * Every worker who has contributed owns a share — which is all of them. A share
     * is earned by the 5% taken from their completed jobs, so it does not lapse
     * because a document needs re-checking.
     */
    memberCount: workers.length,
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
      return compareIso(b.openedAt, a.openedAt);
    }),
  );
}

export async function getProposal(proposalId: string): Promise<Proposal | undefined> {
  const { proposals } = adminState();
  return respond(proposals.find((proposal) => proposal.id === proposalId));
}

/**
 * Concluded proposals, most recently decided first — the trust artifact.
 *
 * Every decision stays here for good, whichever way it went. A record of only the
 * things that passed would be a brochure, not a record.
 */
export async function listPastDecisions(): Promise<Proposal[]> {
  const { proposals } = adminState();
  return respond(
    proposals
      .filter((proposal) => proposal.status !== ProposalStatus.OPEN)
      .sort((a, b) => compareIso(b.closesAt, a.closesAt)),
  );
}

/** Whether a proposal's tally has reached quorum. */
export function hasQuorum(proposal: Proposal): boolean {
  return proposal.votesFor + proposal.votesAgainst >= proposal.quorum;
}

/** The result a proposal would conclude with, given its tally right now. */
export function provisionalOutcome(proposal: Proposal): ProposalStatus {
  if (!hasQuorum(proposal)) return ProposalStatus.QUORUM_NOT_MET;
  return proposal.votesFor > proposal.votesAgainst ? ProposalStatus.PASSED : ProposalStatus.REJECTED;
}

/**
 * Records one member's vote, on their behalf.
 *
 * Administrators record votes for members who voted by phone or on paper at a zone
 * meeting, so the member is named and the vote carries the administrator's id. Each
 * member votes once: a second vote from the same member is refused rather than
 * silently replacing the first, because changing a recorded vote is a different act
 * and should not happen by a stray click.
 *
 * The ballot and the tally are written together, so the counts on the card, the quorum
 * line and the dashboard's vote figure all move in the same instant.
 */
export async function castVote(
  proposalId: string,
  direction: VoteDirection,
  workerId: string,
): Promise<Proposal> {
  const state = adminState();
  const proposal = state.proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal) throw new Error(`No proposal with id ${proposalId}`);
  if (proposal.status !== ProposalStatus.OPEN) {
    throw new Error('This vote has closed, so no more votes can be recorded.');
  }

  const member = state.workers.find((worker) => worker.id === workerId);
  if (!member) throw new Error('Choose the member whose vote you are recording.');

  const existing = proposal.ballots.find((ballot) => ballot.workerId === workerId);
  if (existing) {
    throw new Error(
      `${member.name} has already voted ${existing.direction === VoteDirection.FOR ? 'for' : 'against'} this. Each member votes once.`,
    );
  }

  const ballots = [
    ...proposal.ballots,
    {
      workerId,
      direction,
      castAt: SEED_NOW.toISOString(),
      recordedByAdminId: CURRENT_ADMIN.id,
    },
  ];

  state.updateProposal(proposalId, {
    ballots,
    votesFor: ballots.filter((ballot) => ballot.direction === VoteDirection.FOR).length,
    votesAgainst: ballots.filter((ballot) => ballot.direction === VoteDirection.AGAINST).length,
  });

  const updated = adminState().proposals.find((candidate) => candidate.id === proposalId);
  return respond(updated as Proposal);
}

/** Members who have not yet voted on a proposal, for the "record a vote" picker. */
export async function listMembersYetToVote(
  proposalId: string,
): Promise<{ id: string; name: string; category: string; zoneId: string }[]> {
  const { proposals, workers } = adminState();
  const proposal = proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal) return respond([]);
  const voted = new Set(proposal.ballots.map((ballot) => ballot.workerId));
  return respond(
    workers
      .filter((worker) => !voted.has(worker.id))
      .map((worker) => ({
        id: worker.id,
        name: worker.name,
        category: worker.category,
        zoneId: worker.zoneId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export interface BreakdownRow {
  key: string;
  label: string;
  for: number;
  against: number;
  /** Members in the group who have not voted. */
  notVoted: number;
}

export interface ProposalBreakdown {
  byCategory: BreakdownRow[];
  byZone: BreakdownRow[];
}

/**
 * How a vote split across trades and zones.
 *
 * Counted from the ballots against the worker records, so every figure can be traced to
 * a named member. A proposal that passes on the strength of one zone, or that one trade
 * voted down together, is worth knowing about before the money moves.
 */
export async function getProposalBreakdown(proposalId: string): Promise<ProposalBreakdown | undefined> {
  const { proposals, workers, zones } = adminState();
  const proposal = proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal) return respond(undefined);

  const directionByWorker = new Map(proposal.ballots.map((ballot) => [ballot.workerId, ballot.direction]));
  const zoneName = new Map(zones.map((zone) => [zone.id, zone.name]));

  function group(keyOf: (worker: (typeof workers)[number]) => string, labelOf: (key: string) => string): BreakdownRow[] {
    const rows = new Map<string, BreakdownRow>();
    for (const worker of workers) {
      const key = keyOf(worker);
      const row = rows.get(key) ?? { key, label: labelOf(key), for: 0, against: 0, notVoted: 0 };
      const direction = directionByWorker.get(worker.id);
      if (direction === VoteDirection.FOR) row.for += 1;
      else if (direction === VoteDirection.AGAINST) row.against += 1;
      else row.notVoted += 1;
      rows.set(key, row);
    }
    return [...rows.values()].sort((a, b) => b.for + b.against - (a.for + a.against));
  }

  return respond({
    byCategory: group(
      (worker) => worker.category,
      (key) => key.charAt(0) + key.slice(1).toLowerCase(),
    ),
    byZone: group(
      (worker) => worker.zoneId,
      (key) => zoneName.get(key) ?? 'Unknown zone',
    ),
  });
}

export interface NewProposalInput {
  title: string;
  description: string;
  /** In paise. */
  amountRequested: Paise;
  votingDays: number;
  /** The member putting the proposal forward. */
  proposerId: string;
}

/** Shortest and longest voting windows, so every member has a fair chance to vote. */
export const VOTING_WINDOW_DAYS = { min: 3, max: 21 } as const;

/**
 * Puts a new proposal to the members.
 *
 * It is put forward by a named member, not by the administrator: the fund belongs to
 * the workers, and the administrator's part is to record the proposal. It cannot ask
 * for more than the fund holds, and the voting window is long enough for members on
 * shifts to see it.
 */
export async function createProposal(input: NewProposalInput): Promise<Proposal> {
  const state = adminState();
  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < 6) throw new Error('Give the proposal a title members will recognise.');
  if (description.length < 20) {
    throw new Error('Say what the money would do in a sentence or two, so members can decide.');
  }
  if (!Number.isFinite(input.amountRequested) || input.amountRequested <= 0) {
    throw new Error('Enter how much the proposal asks for.');
  }
  if (input.votingDays < VOTING_WINDOW_DAYS.min || input.votingDays > VOTING_WINDOW_DAYS.max) {
    throw new Error(
      `Voting should stay open between ${VOTING_WINDOW_DAYS.min} and ${VOTING_WINDOW_DAYS.max} days, so members on shifts can vote.`,
    );
  }

  const proposer = state.workers.find((worker) => worker.id === input.proposerId);
  if (!proposer) throw new Error('Choose the member putting this forward.');

  const totals = await getFundTotals();
  if (input.amountRequested > totals.balance) {
    throw new Error('The fund holds less than this. Ask for a smaller amount, or split it into stages.');
  }

  const electorate = state.workers.length;
  const opened = SEED_NOW.getTime();
  const proposal: Proposal = {
    id: `prop_${state.proposals.length + 1}_${opened}`,
    title,
    description,
    amountRequested: input.amountRequested,
    proposerId: proposer.id,
    proposerName: proposer.name,
    votesFor: 0,
    votesAgainst: 0,
    quorum: Math.ceil(electorate * PROPOSAL_QUORUM_SHARE),
    electorate,
    status: ProposalStatus.OPEN,
    openedAt: new Date(opened).toISOString(),
    closesAt: new Date(opened + input.votingDays * DAY_MS).toISOString(),
    comments: [],
    ballots: [],
  };

  state.addProposal(proposal);
  return respond(proposal);
}

export async function listLoanRequests(status?: LoanStatus): Promise<LoanRequest[]> {
  const { loanRequests } = adminState();
  const matched = status ? loanRequests.filter((loan) => loan.status === status) : loanRequests;
  /* Oldest request first: a queue of people waiting on money is worked in order. */
  return respond([...matched].sort((a, b) => compareIso(a.requestedAt, b.requestedAt)));
}

/**
 * Disburses a micro-loan.
 *
 * Writes a DEBIT against the cooperative fund through the ledger service, so the fund
 * balance falls everywhere it is shown. Refuses if the amount exceeds the fund's lending
 * headroom — the fund keeps the rest liquid, because a loan book that consumes the whole
 * balance cannot also pay an accident claim the week it is needed.
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

/** Rejects a loan request. The reason is required, because the worker is told it. */
export async function rejectLoan(loanId: string, reason: string): Promise<LoanRequest> {
  const state = adminState();
  const loan = state.loanRequests.find((candidate) => candidate.id === loanId);
  if (!loan) throw new Error(`No loan request with id ${loanId}`);
  if (loan.status !== LoanStatus.PENDING) return respond(loan);

  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error(`Write down why. ${loan.workerName} will be told, and can ask again later.`);
  }

  state.updateLoanRequest(loanId, {
    status: LoanStatus.REJECTED,
    decidedAt: SEED_NOW.toISOString(),
    rejectionReason: trimmed,
  });

  const updated = adminState().loanRequests.find((candidate) => candidate.id === loanId);
  return respond(updated as LoanRequest);
}

export interface FundGrowthPoint {
  bucket: string;
  label: string;
  /** What the fund held at the start of the month. */
  heldBefore: Paise;
  /** Net change during the month: money in, less money out. */
  netChange: Paise;
  /** What the fund held at the end of the month. */
  balance: Paise;
  contributed: Paise;
  disbursed: Paise;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The last twelve months of the fund, one point per calendar month, with no gaps.
 *
 * Every month appears even if nothing moved in it, and the running balance carries in
 * from everything before the first month shown — so the chart starts at what the fund
 * actually held twelve months ago rather than at zero.
 */
export async function getFundGrowth(months = 12): Promise<FundGrowthPoint[]> {
  const { ledger } = adminState();

  const now = new Date(SEED_NOW);
  const keys: string[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    keys.push(date.toISOString().slice(0, 7));
  }
  const firstKey = keys[0];

  let carried = 0;
  const byMonth = new Map(keys.map((key) => [key, { contributed: 0, disbursed: 0 }]));

  for (const entry of ledger) {
    if (entry.account !== LedgerAccount.COOP_FUND) continue;
    const key = entry.createdAt.slice(0, 7);
    const signed = entry.direction === LedgerDirection.CREDIT ? entry.amount : -entry.amount;
    if (key < firstKey) {
      carried += signed;
      continue;
    }
    const month = byMonth.get(key);
    if (!month) continue;
    if (entry.direction === LedgerDirection.CREDIT) month.contributed += entry.amount;
    else month.disbursed += entry.amount;
  }

  let running = carried;
  const points = keys.map((key) => {
    const { contributed, disbursed } = byMonth.get(key) as { contributed: Paise; disbursed: Paise };
    const heldBefore = running;
    const netChange = contributed - disbursed;
    running += netChange;
    return {
      bucket: key,
      label: `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`,
      heldBefore,
      netChange,
      balance: running,
      contributed,
      disbursed,
    };
  });

  return respond(points);
}

/** Open votes at a glance, for the dashboard. */
export async function getOpenVoteSummary(): Promise<{ openProposals: number; votesCast: number }> {
  const { proposals } = adminState();
  const open = proposals.filter((proposal) => proposal.status === ProposalStatus.OPEN);
  return respond({
    openProposals: open.length,
    votesCast: open.reduce((sum, proposal) => sum + proposal.ballots.length, 0),
  });
}
