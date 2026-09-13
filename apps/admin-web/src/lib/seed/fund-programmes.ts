import { ProposalStatus } from '@sahayo/shared';

/**
 * What the members have been asked to spend the fund on — the single source for
 * both the proposals and the ledger.
 *
 * It exists because those two used to be written separately and contradicted each
 * other: the ledger recorded a paid health insurance premium while the proposals still
 * showed health insurance being voted on, and an "accident cover" payout sat beside an
 * accident cover proposal that had failed. On the fund page, where the ledger's
 * spending and the members' decisions are read side by side, that is exactly the kind
 * of thing that makes a cooperative look like it is making its record up.
 *
 * Now a programme's decision and its money come from one entry: a PASSED programme
 * produces the ledger disbursement, dated just after its vote closed, for exactly the
 * amount the members approved. Nothing else in the seed spends from the fund.
 *
 * Copy is written the way a member would say it, never in finance-department
 * language. The banned vocabulary for the fund pages is listed in CLAUDE.md.
 */
export interface FundProgramme {
  key: string;
  title: string;
  description: string;
  amountRupees: number;
  status: ProposalStatus;
  /** For open programmes: days since the vote opened, and days until it closes. */
  openedDaysAgo: number;
  closesInDays?: number;
  /** For concluded programmes: days since the vote closed. */
  closedDaysAgo?: number;
  /** For PASSED programmes: days since the money went out. */
  disbursedDaysAgo?: number;
  /** What the money did, or why it did not move. The trust artifact. */
  outcome?: string;
}

export const FUND_PROGRAMMES: ReadonlyArray<FundProgramme> = [
  {
    key: 'monsoon-gear',
    title: 'Monsoon gear for outdoor work',
    description:
      'Waterproof jackets, boots and covered toolbags for everyone working outdoors between June and September. Paid once, used every year.',
    amountRupees: 85000,
    status: ProposalStatus.PASSED,
    openedDaysAgo: 230,
    closedDaysAgo: 216,
    disbursedDaysAgo: 210,
    outcome:
      'Bought jackets, boots and covered toolbags for 61 members before the rains. The gear is handed back and reissued each June.',
  },
  {
    key: 'accident-cover',
    title: 'Accident cover for everyone on the road',
    description:
      'Cover for injury on the way to or from a job. Drivers and electricians carry the most risk and until now have carried it alone.',
    amountRupees: 175000,
    status: ProposalStatus.PASSED,
    openedDaysAgo: 182,
    closedDaysAgo: 166,
    disbursedDaysAgo: 160,
    outcome:
      'Took out a group accident policy for every member. It has paid four claims since, the largest for a driver hurt on Bailey Road.',
  },
  {
    key: 'tool-loans',
    title: 'Small loans to replace tools',
    description:
      'Set aside a pot for tool loans, repaid over six months with no interest. A plumber without a wrench cannot work, and a moneylender charges 40%.',
    amountRupees: 150000,
    status: ProposalStatus.REJECTED,
    openedDaysAgo: 142,
    closedDaysAgo: 128,
    outcome:
      'Members chose not to set money aside. Tool loans go through the micro-loan queue instead, so each one is decided on its own.',
  },
  {
    key: 'training',
    title: 'Paid training toward a trade certificate',
    description:
      'Fees and lost earnings for members taking a recognised trade certificate. A certified electrician earns more for the same hours.',
    amountRupees: 95000,
    status: ProposalStatus.PASSED,
    openedDaysAgo: 115,
    closedDaysAgo: 101,
    disbursedDaysAgo: 95,
    outcome:
      'Paid certificate fees and lost earnings for eleven members. Nine have finished; the other two sit their exams this month.',
  },
  {
    key: 'health-insurance',
    title: 'Health insurance for every member',
    description:
      'Put part of the fund toward a group health policy so a hospital stay does not wipe out a family. Covers the member, a spouse and two children.',
    amountRupees: 240000,
    status: ProposalStatus.OPEN,
    openedDaysAgo: 8,
    closesInDays: 6,
  },
  {
    key: 'childcare',
    title: 'Childcare help during school holidays',
    description:
      'Share the cost of a supervised day space so members with young children can still take work through the holidays.',
    amountRupees: 110000,
    status: ProposalStatus.OPEN,
    openedDaysAgo: 5,
    closesInDays: 9,
  },
  {
    key: 'fuel-advance',
    title: 'Fuel advance for drivers',
    description:
      'A small advance at the start of the week so drivers are not paying for fuel out of their own pocket before they have been paid for the work.',
    amountRupees: 60000,
    status: ProposalStatus.OPEN,
    openedDaysAgo: 3,
    closesInDays: 11,
  },
];
