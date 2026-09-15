import {
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  type LedgerEntry,
} from '@sahayo/shared';

import type { Localized, Proposal, VoteChoice } from '../types';
import { DEMO_COOPERATIVE_ID } from './partner';
import { dayOfMonthsAgo, daysAgo, daysFromNow, minutesFromNow } from './time';

/**
 * The cooperative fund this worker is a member of.
 *
 * The balance is not a stored number: it is the sum of COOP_FUND ledger rows —
 * an opening balance, member contributions (5% of every job, per
 * COOP_FUND_SHARE), and a disbursement for each proposal the members passed.
 * That is how Phase 5 will compute it, and a stored balance would be one more
 * figure free to disagree with the ledger.
 *
 * The admin portal has no fund data yet. When it does, these proposals are the
 * ones it must show: same ids, same amounts, same tallies.
 */
export const COOPERATIVE_NAME: Localized = {
  en: 'Patna Central Workers’ Cooperative',
  hi: 'पटना सेंट्रल श्रमिक सहकारी समिति',
};

export const COOP_MEMBER_COUNT = 84;

const fundRow = (
  id: string,
  type: LedgerEntry['type'],
  direction: LedgerEntry['direction'],
  amount: number,
  createdAt: string,
  description: string,
): LedgerEntry => ({
  id,
  type,
  account: LedgerAccount.COOP_FUND,
  direction,
  amount,
  cooperativeId: DEMO_COOPERATIVE_ID,
  description,
  referenceKey: `fund:${id}`,
  createdAt,
});

export const mockFundLedger = [
  fundRow('fund_open', LedgerEntryType.ADJUSTMENT, LedgerDirection.CREDIT, 21500000, dayOfMonthsAgo(3, 1), 'opening_balance'),
  fundRow('fund_m2', LedgerEntryType.COOP_FUND_CONTRIBUTION, LedgerDirection.CREDIT, 6184000, dayOfMonthsAgo(2, 28), 'monthly_contributions'),
  fundRow('fund_m1', LedgerEntryType.COOP_FUND_CONTRIBUTION, LedgerDirection.CREDIT, 6712000, dayOfMonthsAgo(1, 28), 'monthly_contributions'),
  fundRow('fund_m0', LedgerEntryType.COOP_FUND_CONTRIBUTION, LedgerDirection.CREDIT, 2395000, dayOfMonthsAgo(0, 12), 'contributions_to_date'),
  fundRow('fund_prop_loans', LedgerEntryType.COOP_FUND_DISBURSEMENT, LedgerDirection.DEBIT, 6000000, daysAgo(50, 12), 'prop_loans'),
  fundRow('fund_prop_monsoon', LedgerEntryType.COOP_FUND_DISBURSEMENT, LedgerDirection.DEBIT, 4500000, daysAgo(18, 12), 'prop_monsoon'),
] satisfies LedgerEntry[];

/**
 * Three open votes and three decided ones.
 *
 * The open ones are what a cooperative of trade workers actually argues about:
 * insurance for their families, training that raises what they can charge,
 * and tools they would otherwise each buy. The decided ones show the fund has
 * already done something — and that members can say no.
 */
export const mockProposals = [
  {
    id: 'prop_health',
    category: 'health',
    title: {
      en: 'Health insurance for members and their families',
      hi: 'सदस्यों और उनके परिवार का स्वास्थ्य बीमा',
    },
    summary: {
      en: 'A family policy for every verified member: hospital costs up to ₹2 lakh a year for the member, their spouse and two children.',
      hi: 'हर सत्यापित सदस्य के लिए परिवार बीमा: सदस्य, पति या पत्नी और दो बच्चों के अस्पताल का ख़र्च, साल में ₹2 लाख तक।',
    },
    points: [
      { en: '₹2,000 a year for each family, paid from the fund', hi: 'हर परिवार के लिए साल के ₹2,000, फ़ंड से' },
      { en: 'Covers hospital stays up to ₹2 lakh a year', hi: 'अस्पताल में भर्ती का ख़र्च, साल में ₹2 लाख तक' },
      { en: 'Every member verified by the cooperative is included', hi: 'सहकारी से सत्यापित हर सदस्य इसमें शामिल होगा' },
    ],
    amount: 16800000,
    proposedBy: 'Sunita Devi',
    status: 'active',
    opensAt: daysAgo(3, 10),
    closesAt: daysFromNow(5, 18),
    tally: { yes: 38, no: 11, abstain: 2 },
    eligibleVoters: COOP_MEMBER_COUNT,
  },
  {
    id: 'prop_workshop',
    category: 'training',
    title: {
      en: 'Two-day solar and inverter repair workshop',
      hi: 'दो दिन की सोलर और इन्वर्टर मरम्मत की ट्रेनिंग',
    },
    summary: {
      en: 'A certified trainer at the Kankarbagh office for 30 members. Solar jobs pay more, and most of us turn them down today.',
      hi: 'कंकड़बाग दफ़्तर में 30 सदस्यों के लिए प्रमाणित ट्रेनर। सोलर के काम में कमाई ज़्यादा है, और आज हम में से ज़्यादातर ऐसे काम मना कर देते हैं।',
    },
    points: [
      { en: '₹1,200 for each member: trainer, practice kit and lunch', hi: 'हर सदस्य पर ₹1,200: ट्रेनर, अभ्यास किट और खाना' },
      { en: '30 places, open to every trade', hi: '30 सीटें, हर काम वाले के लिए' },
      { en: 'A certificate you can add to your profile', hi: 'सर्टिफ़िकेट, जिसे आप अपनी प्रोफ़ाइल में जोड़ सकते हैं' },
    ],
    amount: 3600000,
    proposedBy: 'Md. Irfan Ansari',
    status: 'active',
    opensAt: daysAgo(6, 9),
    closesAt: minutesFromNow(9 * 60),
    tally: { yes: 27, no: 19, abstain: 4 },
    eligibleVoters: COOP_MEMBER_COUNT,
  },
  {
    id: 'prop_toolkit',
    category: 'equipment',
    title: {
      en: 'Shared tool kit: two drills, a ladder and a tester',
      hi: 'साझा औज़ार: दो ड्रिल मशीन, एक सीढ़ी और टेस्टर',
    },
    summary: {
      en: 'Kept at the Kankarbagh office and booked by any member for a day. Saves each of us buying tools we use twice a month.',
      hi: 'कंकड़बाग दफ़्तर में रहेगा, कोई भी सदस्य एक दिन के लिए ले सकता है। महीने में दो बार काम आने वाले औज़ार हर किसी को ख़रीदने नहीं पड़ेंगे।',
    },
    points: [
      { en: 'Two drills, a ladder and a wire tester', hi: 'दो ड्रिल मशीन, एक सीढ़ी और तार जाँचने का टेस्टर' },
      { en: 'Kept at the Kankarbagh office', hi: 'कंकड़बाग दफ़्तर में रखा जाएगा' },
      { en: 'Any member can borrow it for a day, free', hi: 'कोई भी सदस्य एक दिन के लिए मुफ़्त ले सकता है' },
    ],
    amount: 2800000,
    proposedBy: 'Ramesh Kumar',
    status: 'active',
    opensAt: daysAgo(4, 9),
    closesAt: daysFromNow(3, 18),
    tally: { yes: 41, no: 6, abstain: 3 },
    eligibleVoters: COOP_MEMBER_COUNT,
  },
  {
    id: 'prop_loans',
    category: 'loan',
    title: {
      en: 'Interest-free tool loans up to ₹5,000',
      hi: '₹5,000 तक का बिना ब्याज औज़ार लोन',
    },
    summary: {
      en: 'A ₹60,000 pool members can borrow from to buy or repair tools, paid back in small monthly amounts with no interest.',
      hi: '₹60,000 का कोष, जिससे सदस्य औज़ार ख़रीदने या ठीक कराने के लिए उधार ले सकें — बिना ब्याज, छोटी मासिक किस्तों में वापस।',
    },
    points: [
      { en: 'Up to ₹5,000 for each member', hi: 'हर सदस्य को ₹5,000 तक' },
      { en: 'No interest, paid back over 3 to 10 months', hi: 'कोई ब्याज नहीं, 3 से 10 महीनों में वापस' },
      { en: 'What comes back is lent to the next member', hi: 'जो पैसा लौटता है, वह अगले सदस्य को उधार मिलता है' },
    ],
    outcome: {
      en: 'The pool opened. 12 members have borrowed so far, and ₹31,500 has already been paid back.',
      hi: 'कोष शुरू हो गया। अब तक 12 सदस्यों ने लोन लिया, और ₹31,500 वापस भी आ चुके हैं।',
    },
    amount: 6000000,
    proposedBy: 'Vinod Sharma',
    status: 'passed',
    opensAt: daysAgo(62, 9),
    closesAt: daysAgo(52, 18),
    tally: { yes: 61, no: 9, abstain: 5 },
    eligibleVoters: COOP_MEMBER_COUNT,
  },
  {
    id: 'prop_monsoon',
    category: 'relief',
    title: { en: 'Monsoon hardship support', hi: 'बरसात में आर्थिक सहायता' },
    summary: {
      en: 'One-time support for members who lost more than two weeks of work to flooding.',
      hi: 'उन सदस्यों को एक बार की मदद, जिनका बाढ़ की वजह से दो हफ़्ते से ज़्यादा काम छूटा।',
    },
    points: [
      { en: '₹1,000 for each member, once', hi: 'हर सदस्य को एक बार ₹1,000' },
      { en: 'For members who lost more than two weeks of work', hi: 'जिनका दो हफ़्ते से ज़्यादा काम छूटा' },
    ],
    outcome: {
      en: '45 members who lost work to the floods received ₹1,000 each.',
      hi: 'बाढ़ से काम छूटने वाले 45 सदस्यों को ₹1,000-₹1,000 मिले।',
    },
    amount: 4500000,
    proposedBy: 'Md. Irfan Ansari',
    status: 'passed',
    opensAt: daysAgo(30, 9),
    closesAt: daysAgo(20, 18),
    tally: { yes: 58, no: 7, abstain: 5 },
    eligibleVoters: COOP_MEMBER_COUNT,
  },
  {
    id: 'prop_uniforms',
    category: 'other',
    title: { en: 'Branded uniforms for every member', hi: 'हर सदस्य के लिए ब्रांडेड वर्दी' },
    summary: {
      en: 'Two uniform sets each, printed with the cooperative name.',
      hi: 'हर सदस्य को सहकारी के नाम वाली दो वर्दी।',
    },
    points: [
      { en: 'Two uniform sets for each member', hi: 'हर सदस्य को वर्दी के दो सेट' },
      { en: 'Printed with the cooperative name', hi: 'सहकारी के नाम की छपाई के साथ' },
    ],
    outcome: {
      en: 'Not approved. Most members felt the money was better kept for hard times.',
      hi: 'मंज़ूर नहीं हुआ। ज़्यादातर सदस्यों को लगा कि यह पैसा मुश्किल समय के लिए रखना बेहतर है।',
    },
    amount: 7100000,
    proposedBy: 'Vinod Sharma',
    status: 'rejected',
    opensAt: daysAgo(58, 9),
    closesAt: daysAgo(45, 18),
    tally: { yes: 19, no: 44, abstain: 8 },
    eligibleVoters: COOP_MEMBER_COUNT,
  },
] satisfies Proposal[];

/**
 * How this worker voted on the proposals already decided. None on the open
 * ones — those are the demo: the vote a presenter casts on stage.
 */
export const mockMyVotes: Record<string, VoteChoice> = {
  prop_loans: 'yes',
  prop_monsoon: 'yes',
  prop_uniforms: 'no',
};
