import { ProposalStatus } from '../index';

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
  /**
   * The title and description in Hindi, for the worker app, where members read and
   * vote on these. Written as a member would say it, like the English.
   */
  titleLocalized: { hi: string };
  descriptionLocalized: { hi: string };
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
    titleLocalized: { hi: 'बाहर काम करने वालों के लिए बरसात का सामान' },
    descriptionLocalized: {
      hi: 'जून से सितंबर तक बाहर काम करने वाले हर सदस्य के लिए वाटरप्रूफ़ जैकेट, जूते और ढके हुए औज़ार-बैग। पैसा एक बार लगेगा, सामान हर साल काम आएगा।',
    },
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
    titleLocalized: { hi: 'काम पर आने-जाने वाले हर सदस्य का दुर्घटना बीमा' },
    descriptionLocalized: {
      hi: 'काम पर आते-जाते चोट लगने का बीमा। ड्राइवर और इलेक्ट्रीशियन सबसे ज़्यादा जोखिम उठाते हैं, और अब तक यह जोखिम उन्हें अकेले उठाना पड़ता था।',
    },
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
    titleLocalized: { hi: 'औज़ार बदलने के लिए छोटे कर्ज़' },
    descriptionLocalized: {
      hi: 'औज़ारों के कर्ज़ के लिए एक रकम अलग रखना, जो छह महीने में बिना ब्याज लौटाई जाए। रिंच के बिना प्लंबर काम नहीं कर सकता, और साहूकार 40% ब्याज लेता है।',
    },
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
    titleLocalized: { hi: 'ट्रेड सर्टिफ़िकेट की ट्रेनिंग का ख़र्च' },
    descriptionLocalized: {
      hi: 'मान्य ट्रेड सर्टिफ़िकेट लेने वाले सदस्यों की फ़ीस और उन दिनों की छूटी कमाई। सर्टिफ़िकेट वाला इलेक्ट्रीशियन उतने ही घंटों में ज़्यादा कमाता है।',
    },
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
    titleLocalized: { hi: 'हर सदस्य का स्वास्थ्य बीमा' },
    descriptionLocalized: {
      hi: 'फ़ंड का कुछ हिस्सा एक समूह स्वास्थ्य बीमा में लगाना, ताकि अस्पताल का एक ख़र्च पूरे परिवार की बचत न डुबो दे। इसमें सदस्य, पति या पत्नी और दो बच्चे शामिल हैं।',
    },
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
    titleLocalized: { hi: 'स्कूल की छुट्टियों में बच्चों की देखभाल में मदद' },
    descriptionLocalized: {
      hi: 'देखरेख वाली एक जगह का ख़र्च मिलकर उठाना, ताकि छोटे बच्चों वाले सदस्य छुट्टियों में भी काम ले सकें।',
    },
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
    titleLocalized: { hi: 'ड्राइवरों के लिए ईंधन का एडवांस' },
    descriptionLocalized: {
      hi: 'हफ़्ते की शुरुआत में थोड़ा एडवांस, ताकि काम का पैसा मिलने से पहले ड्राइवरों को अपनी जेब से ईंधन न भरवाना पड़े।',
    },
    amountRupees: 60000,
    status: ProposalStatus.OPEN,
    openedDaysAgo: 3,
    closesInDays: 11,
  },
];
