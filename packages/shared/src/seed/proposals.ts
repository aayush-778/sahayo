import {
  PROPOSAL_QUORUM_SHARE,
  ProposalStatus,
  VoteDirection,
  type AdminWorker,
  type LoanRequest,
  type Proposal,
  type ProposalBallot,
  type ProposalComment,
} from '../index';
import { FUND_PROGRAMMES } from './fund-programmes';
import { DAY_MS, SEEDS, SEED_NOW, createRng, isoAgo } from './rng';

export const LOAN_REQUEST_COUNT = 12;

const COMMENT_BODIES = [
  'This would have helped me last year. I am for it.',
  'Can we see what it works out to per member per month?',
  'Good idea, but I would like the amount checked before we vote it through.',
  'My brother works on a platform with nothing like this. We should do it.',
  'I would rather this came after the health cover, not before it.',
] as const;

const LOAN_PURPOSES = [
  'Replace a stolen toolkit',
  'Repair the motorcycle I travel to jobs on',
  'School fees for the coming term',
  'Hospital bill for my mother',
  'Buy a second ladder so I can take two jobs a day',
  'Replace a burnt-out drill',
  'Deposit on a room closer to the zone I work',
  'New sewing machine after a flood',
  'Cover rent for a slow month',
  'Buy safety equipment for electrical work',
  'Replace a broken pressure washer',
  'Medical treatment after a fall at work',
] as const;

/**
 * Turnout and support per programme, as [min, max] ranges.
 *
 * The status of a programme is fixed in FUND_PROGRAMMES, so the tally has to be drawn
 * to agree with it: a PASSED programme reaches quorum with more votes for than
 * against, a REJECTED one reaches quorum with more against. The three open votes are
 * drawn at different stages — one past quorum, two still short of it — so the quorum
 * indicator has something real to say on each card.
 */
function tallyRange(
  status: ProposalStatus,
  openIndex: number,
): { turnout: [number, number]; forShare: [number, number] } {
  if (status === ProposalStatus.PASSED) return { turnout: [92, 126], forShare: [0.58, 0.84] };
  if (status === ProposalStatus.REJECTED) return { turnout: [88, 118], forShare: [0.24, 0.42] };
  if (status === ProposalStatus.QUORUM_NOT_MET) return { turnout: [40, 70], forShare: [0.5, 0.8] };
  const open: [number, number][] = [
    [88, 104],
    [62, 76],
    [34, 48],
  ];
  return { turnout: open[openIndex % open.length], forShare: [0.48, 0.78] };
}

/**
 * The governance record: every proposal the members have voted on.
 *
 * Built from FUND_PROGRAMMES — the same list the ledger's fund spending comes from —
 * so a proposal marked as passed has a matching payment in the ledger for exactly the
 * amount approved, and nothing is paid for that was not voted through.
 *
 * Each proposal carries one ballot per member who voted, drawn from the real worker
 * records. The tallies are counted from those ballots, which is what lets the detail
 * view break a vote down by trade and by zone, and lets the service refuse a second
 * vote from the same member.
 */
export function buildProposals(workers: AdminWorker[]): Proposal[] {
  const rng = createRng(SEEDS.proposals);
  const electorate = workers.length;
  const quorum = Math.ceil(electorate * PROPOSAL_QUORUM_SHARE);
  let openIndex = 0;

  return FUND_PROGRAMMES.map((programme) => {
    const isOpen = programme.status === ProposalStatus.OPEN;
    const range = tallyRange(programme.status, isOpen ? openIndex++ : 0);
    const turnout = Math.min(electorate, rng.int(range.turnout[0], range.turnout[1]));
    const forCount = Math.round(turnout * rng.float(range.forShare[0], range.forShare[1]));

    const openedAt = isoAgo(programme.openedDaysAgo);
    const closesAt = isOpen
      ? isoAgo(-(programme.closesInDays ?? 7))
      : isoAgo(programme.closedDaysAgo ?? 0);

    /* Votes land between the vote opening and the earlier of its close or now. */
    const firstVote = new Date(openedAt).getTime();
    const lastVote = Math.min(new Date(closesAt).getTime(), SEED_NOW.getTime());
    const ballots: ProposalBallot[] = rng.sample(workers, turnout).map((voter, index) => ({
      workerId: voter.id,
      direction: index < forCount ? VoteDirection.FOR : VoteDirection.AGAINST,
      castAt: new Date(firstVote + rng.float(0, 1) * Math.max(DAY_MS, lastVote - firstVote)).toISOString(),
    }));

    const votesFor = ballots.filter((ballot) => ballot.direction === VoteDirection.FOR).length;
    const votesAgainst = ballots.length - votesFor;

    const proposer = rng.pick(workers);
    const comments: ProposalComment[] = rng
      .sample(workers, rng.int(2, 4))
      .map((author, commentIndex) => ({
        id: rng.uuid(),
        authorId: author.id,
        authorName: author.name,
        body: rng.pick(COMMENT_BODIES),
        createdAt: isoAgo(Math.max(0, programme.openedDaysAgo - commentIndex - 1)),
      }));

    return {
      id: rng.uuid(),
      title: programme.title,
      description: programme.description,
      titleLocalized: { ...programme.titleLocalized },
      descriptionLocalized: { ...programme.descriptionLocalized },
      amountRequested: programme.amountRupees * 100,
      proposerId: proposer.id,
      proposerName: proposer.name,
      votesFor,
      votesAgainst,
      quorum,
      electorate,
      status: programme.status,
      openedAt,
      closesAt,
      comments,
      ballots,
      ...(programme.outcome ? { outcomeNote: programme.outcome } : {}),
    } satisfies Proposal;
  });
}

/**
 * The micro-loan queue.
 *
 * Each request shows what the worker has put into the fund over their lifetime
 * and what they still owe, because those are the two figures a reviewer actually
 * weighs. A worker who has contributed ₹40,000 asking to borrow ₹8,000 is a
 * different decision from one who joined last month.
 */
export function buildLoanRequests(workers: AdminWorker[]): LoanRequest[] {
  const rng = createRng(SEEDS.loans);

  /* Only verified members can borrow from the fund. */
  const eligible = workers.filter((worker) => worker.kycStatus === 'VERIFIED');
  const applicants = rng.sample(eligible, LOAN_REQUEST_COUNT);

  return applicants.map((worker, index) => {
    const amount = rng.int(3, 40) * 1000 * 100;
    const repaymentMonths = rng.pick([3, 4, 6, 9, 12] as const);
    const monthly = Math.round(amount / repaymentMonths / 100);

    return {
      id: rng.uuid(),
      workerId: worker.id,
      workerName: worker.name,
      amount,
      purpose: LOAN_PURPOSES[index % LOAN_PURPOSES.length],
      repaymentPlan: `₹${monthly.toLocaleString('en-IN')} a month for ${repaymentMonths} months`,
      repaymentMonths,
      lifetimeContribution: worker.fundContributed,
      /* Most applicants are clear; a few are still paying off an earlier loan. */
      outstanding: rng.chance(0.25) ? rng.int(1, 12) * 1000 * 100 : 0,
      status: 'PENDING',
      requestedAt: isoAgo(rng.int(0, 18), -rng.int(0, 12 * 60)),
    } satisfies LoanRequest;
  });
}
