import type { SupportRequest } from '../types';
import { daysAgo } from './time';

/**
 * Help this worker has already asked the fund for.
 *
 * A tool loan, fully repaid — the loan pool doing what it was voted for — and
 * an accident claim still with the coordinator. The loan is closed on purpose,
 * so the loan form is open for a new request during the demo.
 */
export const mockSupportRequests = [
  {
    id: 'sup_loan_01',
    kind: 'loan',
    amount: 300000,
    purpose: 'tools',
    details: 'New cordless drill. My old one burnt out on a job.',
    repaymentMonths: 6,
    repaidPaise: 300000,
    status: 'closed',
    note: {
      en: 'Fully repaid. Thank you — the money is back in the pool for the next member.',
      hi: 'पूरा लौटा दिया। धन्यवाद — यह पैसा अगले सदस्य के लिए कोष में वापस आ गया है।',
    },
    createdAt: daysAgo(48, 11),
    updatedAt: daysAgo(5, 10),
  },
  {
    id: 'sup_claim_01',
    kind: 'claim',
    amount: 450000,
    purpose: 'accident',
    details: 'Slipped from a ladder at a site on Boring Road. X-ray and plaster on the left wrist.',
    status: 'under_review',
    note: {
      en: 'Your coordinator will call you about the hospital bills.',
      hi: 'अस्पताल के बिल के बारे में आपके कोऑर्डिनेटर आपको फ़ोन करेंगे।',
    },
    createdAt: daysAgo(3, 16),
    updatedAt: daysAgo(2, 11),
  },
] satisfies SupportRequest[];
