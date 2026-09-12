import {
  DisputeStatus,
  KycStatus,
  LedgerEntryType,
  LoanStatus,
  ProposalStatus,
  type Paise,
} from '@sahayo/shared';
import { zoneName } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';
import { compareIso } from '@/lib/dates';

/** The kinds of thing that show up in the activity feed. */
export const ActivityKind = {
  BOOKING_COMPLETED: 'BOOKING_COMPLETED',
  KYC_APPROVED: 'KYC_APPROVED',
  DISPUTE_RAISED: 'DISPUTE_RAISED',
  PROPOSAL_PASSED: 'PROPOSAL_PASSED',
  LOAN_DISBURSED: 'LOAN_DISBURSED',
} as const;
export type ActivityKind = (typeof ActivityKind)[keyof typeof ActivityKind];

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** One plain-language line. No jargon, no passive voice. */
  text: string;
  /** Shown where money is part of the event, otherwise absent. */
  amount?: Paise;
  at: string;
}

/**
 * The recent activity feed, newest first.
 *
 * Assembled from the collections that already exist rather than from a separate
 * events table, because there is no such table and inventing one would mean the
 * feed could disagree with the pages it summarises. Every line here is derived
 * from a record the reader can go and open.
 */
export async function listRecentActivity(limit = 12): Promise<ActivityItem[]> {
  const { bookings, workers, disputes, proposals, loanRequests, ledger, kycQueue } = adminState();
  const items: ActivityItem[] = [];

  for (const booking of bookings) {
    if (!booking.completedAt) continue;
    items.push({
      id: `act_booking_${booking.id}`,
      kind: ActivityKind.BOOKING_COMPLETED,
      text: `${booking.workerName ?? 'A worker'} finished a ${booking.category.toLowerCase()} job in ${zoneName(booking.zoneId)}`,
      amount: booking.amount,
      at: booking.completedAt,
    });
  }

  const workerById = new Map(workers.map((worker) => [worker.id, worker]));
  for (const submission of kycQueue) {
    if (!submission.reviewedAt) continue;
    const worker = workerById.get(submission.workerId);
    if (!worker || worker.kycStatus !== KycStatus.VERIFIED) continue;
    items.push({
      id: `act_kyc_${submission.id}`,
      kind: ActivityKind.KYC_APPROVED,
      text: `${worker.name} is verified and can take work`,
      at: submission.reviewedAt,
    });
  }

  for (const dispute of disputes) {
    items.push({
      id: `act_dispute_${dispute.id}`,
      kind: ActivityKind.DISPUTE_RAISED,
      text: `${dispute.raisedBy === 'WORKER' ? dispute.workerName : dispute.customerName} raised a ticket: ${dispute.subject.toLowerCase()}`,
      ...(dispute.status === DisputeStatus.RESOLVED ? {} : { amount: dispute.amountInDispute }),
      at: dispute.createdAt,
    });
  }

  for (const proposal of proposals) {
    if (proposal.status !== ProposalStatus.PASSED) continue;
    items.push({
      id: `act_proposal_${proposal.id}`,
      kind: ActivityKind.PROPOSAL_PASSED,
      text: `Members voted through "${proposal.title}"`,
      amount: proposal.amountRequested,
      at: proposal.closesAt,
    });
  }

  const disbursements = new Map(
    ledger
      .filter((entry) => entry.type === LedgerEntryType.COOP_FUND_DISBURSEMENT)
      .map((entry) => [entry.referenceKey, entry]),
  );
  for (const loan of loanRequests) {
    if (loan.status !== LoanStatus.DISBURSED || !loan.decidedAt) continue;
    const entry = disbursements.get(`${loan.id}:disbursement`);
    items.push({
      id: `act_loan_${loan.id}`,
      kind: ActivityKind.LOAN_DISBURSED,
      text: `The fund lent ${loan.workerName} money to ${loan.purpose.toLowerCase()}`,
      amount: entry?.amount ?? loan.amount,
      at: loan.decidedAt,
    });
  }

  return respond(items.sort((a, b) => compareIso(b.at, a.at)).slice(0, limit));
}
