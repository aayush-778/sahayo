import {
  PROPOSAL_QUORUM_SHARE,
  ProposalStatus,
  type AdminWorker,
  type LoanRequest,
  type Proposal,
  type ProposalComment,
} from '@sahayo/shared';
import { SEEDS, createRng, isoAgo } from './rng';

export const LOAN_REQUEST_COUNT = 12;

/**
 * The seven things the members have been asked to vote on.
 *
 * Written in the language a worker would use, not a fund manager. "Help with
 * hospital bills" rather than "healthcare capital allocation" — the copy rules in
 * CLAUDE.md ban that vocabulary, and this is the page where it would be most
 * tempting.
 */
const PROPOSAL_TOPICS: ReadonlyArray<{
  title: string;
  description: string;
  amountRupees: number;
}> = [
  {
    title: 'Health insurance for every member',
    description:
      'Put part of the fund toward a group health policy so a hospital stay does not wipe out a family. Covers the member, a spouse and two children.',
    amountRupees: 240000,
  },
  {
    title: 'Monsoon gear for outdoor work',
    description:
      'Waterproof jackets, boots and covered toolbags for everyone working outdoors between June and September. Paid once, used every year.',
    amountRupees: 85000,
  },
  {
    title: 'Small loans to replace tools',
    description:
      'A standing pot for tool loans, repaid over six months with no interest. A plumber without a wrench cannot work, and a moneylender charges 40%.',
    amountRupees: 150000,
  },
  {
    title: 'Childcare help during school holidays',
    description:
      'Share the cost of a supervised day space so members with young children can still take work through the holidays.',
    amountRupees: 110000,
  },
  {
    title: 'Accident cover for everyone on the road',
    description:
      'Cover for injury on the way to or from a job. Drivers and electricians carry the most risk and currently carry it alone.',
    amountRupees: 175000,
  },
  {
    title: 'Paid training toward a trade certificate',
    description:
      'Fees and lost earnings for members taking a recognised trade certificate. A certified electrician earns more for the same hours.',
    amountRupees: 95000,
  },
  {
    title: 'Fuel advance for drivers',
    description:
      'A small advance at the start of the week so drivers are not paying for fuel out of pocket before they have been paid for the work.',
    amountRupees: 60000,
  },
];

const COMMENT_BODIES = [
  'This would have helped me last year. I am for it.',
  'Can we see what the premium works out to per member per month?',
  'Good idea, but six months is tight for repayment on a bigger loan.',
  'My brother works on a platform with nothing like this. We should do it.',
  'I would rather the money went to the accident cover first.',
] as const;

/** What workers actually ask a small loan for. */
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
 * The governance record.
 *
 * Three proposals are open and being voted on; the rest have concluded and carry
 * an outcome note saying what the money actually did. Concluded proposals are
 * never removed — that chronological record is the trust artifact of the whole
 * platform, and a fund whose history can be edited proves nothing.
 */
export function buildProposals(workers: AdminWorker[]): Proposal[] {
  const rng = createRng(SEEDS.proposals);
  const electorate = workers.length;
  const quorum = Math.ceil(electorate * PROPOSAL_QUORUM_SHARE);

  return PROPOSAL_TOPICS.map((topic, index) => {
    const isOpen = index < 3;
    const proposer = rng.pick(workers);

    /*
     * Turnout, then the split of it. Deriving both from turnout rather than
     * drawing votesFor and votesAgainst independently keeps the quorum
     * indicator honest: a proposal cannot show more votes cast than members.
     */
    const turnout = isOpen ? rng.int(48, electorate) : rng.int(62, electorate);
    const forShare = rng.float(0.35, 0.92);
    const votesFor = Math.round(turnout * forShare);
    const votesAgainst = turnout - votesFor;

    /*
     * Status follows from the arithmetic rather than being picked. Quorum is
     * about participation: a proposal can fail quorum with every vote in favour,
     * and the card says exactly that instead of calling it a rejection.
     */
    let status: Proposal['status'];
    if (isOpen) {
      status = ProposalStatus.OPEN;
    } else if (turnout < quorum) {
      status = ProposalStatus.QUORUM_NOT_MET;
    } else {
      status = votesFor > votesAgainst ? ProposalStatus.PASSED : ProposalStatus.REJECTED;
    }

    const openedDaysAgo = isOpen ? rng.int(3, 11) : rng.int(40, 300);
    /* An open proposal closes in the future; a concluded one closed in the past. */
    const closesDaysAgo = isOpen ? -rng.int(2, 9) : openedDaysAgo - rng.int(14, 21);

    const comments: ProposalComment[] = rng
      .sample(workers, rng.int(2, 4))
      .map((author, commentIndex) => ({
        id: rng.uuid(),
        authorId: author.id,
        authorName: author.name,
        body: rng.pick(COMMENT_BODIES),
        createdAt: isoAgo(Math.max(0, openedDaysAgo - commentIndex - 1)),
      }));

    return {
      id: rng.uuid(),
      title: topic.title,
      description: topic.description,
      amountRequested: topic.amountRupees * 100,
      proposerId: proposer.id,
      proposerName: proposer.name,
      votesFor,
      votesAgainst,
      quorum,
      electorate,
      status,
      openedAt: isoAgo(openedDaysAgo),
      closesAt: isoAgo(closesDaysAgo),
      comments,
      ...(status === ProposalStatus.PASSED
        ? { outcomeNote: `Approved. ${topic.title.toLowerCase()} has been in place since.` }
        : status === ProposalStatus.REJECTED
          ? { outcomeNote: 'Members voted against. Revisit with a smaller amount.' }
          : status === ProposalStatus.QUORUM_NOT_MET
            ? { outcomeNote: 'Not enough members voted for the result to count.' }
            : {}),
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
