import { serviceCategories, subCategoriesByCategoryId, type Id, type ServiceCategory } from '@sahayo/shared';

import { mockBookings } from './bookings';
import { mockThreads } from './chats';
import { mockFundLedger, mockMyVotes, mockProposals } from './coopFund';
import { findCustomer, mockCustomers } from './customers';
import { customerByEntryId, mockEarnings, mockSettlements, subCategoryByEntryId } from './earnings';
import { mockJobRequests } from './jobRequests';
import { DEMO_PARTNER } from './partner';
import { mockRatings } from './ratings';
import { mockSupportRequests } from './support';
import type { Proposal } from '../types';

/**
 * The worker app's mock data, and the checks that keep it honest.
 *
 * Screens never import from here. They go through src/services, which read the
 * session store, which is seeded from these exports — so Phase 5 replaces the
 * seeding and nothing that renders.
 */
export { mockBookings } from './bookings';
export { mockThreads } from './chats';
export { CUSTOMER_REPLIES } from './chatScripts';
export { COOP_MEMBER_COUNT, COOPERATIVE_NAME, mockFundLedger, mockMyVotes, mockProposals } from './coopFund';
export { findCustomer, mockCustomers } from './customers';
export { SAMPLE_UPLOADS } from './documents';
export { customerByEntryId, mockEarnings, mockSettlements, subCategoryByEntryId } from './earnings';
export { mockJobRequests } from './jobRequests';
export { COORDINATOR, DEMO_COOPERATIVE_ID, DEMO_PARTNER, DEMO_REGISTRATION, DEMO_WORKER_BASE, DEMO_WORKER_ID } from './partner';
export { mockRatings } from './ratings';
export { mockSupportRequests } from './support';

/**
 * Ids are plain strings, so TypeScript cannot see a booking that points at a
 * customer who does not exist. Every problem is collected and thrown once, at
 * module load — a broken reference fails the build, not the demo.
 */
(function assertWorkerMockIntegrity() {
  const problems: string[] = [];

  const byCategory: Record<Id, ServiceCategory[]> = subCategoriesByCategoryId;
  const categoryIds = new Set(serviceCategories.map((entry) => entry.id));
  const subIds = new Set(
    Object.values(byCategory)
      .flat()
      .map((entry) => entry.id),
  );
  const bookingIds = new Set(mockBookings.map((entry) => entry.id));

  const unique = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`${label}: duplicate id ${id}`);
      seen.add(id);
    }
  };
  unique('customers', mockCustomers.map((e) => e.id));
  unique('bookings', mockBookings.map((e) => e.id));
  unique('job requests', mockJobRequests.map((e) => e.id));
  unique('job request bookings', mockJobRequests.map((e) => e.booking.id));
  unique('earnings', mockEarnings.map((e) => e.id));
  unique('proposals', mockProposals.map((e) => e.id));
  unique('threads', mockThreads.map((e) => e.id));
  unique('ratings', mockRatings.map((e) => e.id));
  unique('support requests', mockSupportRequests.map((e) => e.id));

  if (!categoryIds.has(DEMO_PARTNER.primaryCategory)) {
    problems.push(`partner: unknown worker type ${DEMO_PARTNER.primaryCategory}`);
  }
  const partnerSubs = new Set((byCategory[DEMO_PARTNER.primaryCategory] ?? []).map((e) => e.id));
  for (const sub of DEMO_PARTNER.subCategories) {
    if (!partnerSubs.has(sub)) problems.push(`partner: ${sub} is not under ${DEMO_PARTNER.primaryCategory}`);
  }
  const approvedSubs = new Set(DEMO_PARTNER.subCategories);

  for (const booking of [...mockBookings, ...mockJobRequests.map((e) => e.booking)]) {
    if (!findCustomer(booking.customerId)) problems.push(`${booking.id}: unknown customer ${booking.customerId}`);
    if (!subIds.has(booking.serviceCategoryId)) {
      problems.push(`${booking.id}: unknown sub-category ${booking.serviceCategoryId}`);
    }
    const fare = booking.fare;
    if (fare && fare.workerShare + fare.platformShare + fare.coopFundShare !== fare.total) {
      problems.push(`${booking.id}: fare shares do not sum to the total`);
    }
  }
  for (const request of mockJobRequests) {
    if (!approvedSubs.has(request.booking.serviceCategoryId)) {
      problems.push(`${request.id}: offered outside the partner's approved sub-categories`);
    }
  }

  for (const entry of mockEarnings) {
    if (entry.bookingId && !bookingIds.has(entry.bookingId)) {
      problems.push(`${entry.id}: unknown booking ${entry.bookingId}`);
    }
    if (!subIds.has(subCategoryByEntryId[entry.id] ?? '')) problems.push(`${entry.id}: no sub-category recorded`);
    if (!findCustomer(customerByEntryId[entry.id] ?? '')) problems.push(`${entry.id}: no customer recorded`);
  }
  const earningIds = new Set(mockEarnings.map((e) => e.id));
  const settledOnce = new Set<string>();
  for (const settlement of mockSettlements) {
    const sum = mockEarnings
      .filter((e) => settlement.entryIds.includes(e.id))
      .reduce((total, e) => total + e.amount, 0);
    if (sum !== settlement.amount) {
      problems.push(`${settlement.id}: amount ${settlement.amount} does not match its entries (${sum})`);
    }
    for (const id of settlement.entryIds) {
      if (!earningIds.has(id)) problems.push(`${settlement.id}: unknown entry ${id}`);
      if (settledOnce.has(id)) problems.push(`${settlement.id}: entry ${id} settled twice`);
      settledOnce.add(id);
    }
  }
  for (const booking of mockBookings) {
    const entryId = `earn_${booking.id}`;
    if (booking.status === 'SETTLED' && !settledOnce.has(entryId)) {
      problems.push(`${booking.id}: SETTLED but its payout is in no settlement`);
    }
    if (booking.status === 'COMPLETED' && settledOnce.has(entryId)) {
      problems.push(`${booking.id}: COMPLETED but its payout is already settled`);
    }
  }

  for (const row of mockFundLedger) {
    if (
      row.type === 'COOP_FUND_DISBURSEMENT' &&
      !mockProposals.some((p) => p.id === row.description && p.status === 'passed')
    ) {
      problems.push(`${row.id}: disbursement without a passed proposal`);
    }
  }
  // Typed as Proposal: the literal mock types make outcome look impossible to miss.
  for (const proposal of mockProposals as readonly Proposal[]) {
    const cast = proposal.tally.yes + proposal.tally.no + proposal.tally.abstain;
    if (cast >= proposal.eligibleVoters) problems.push(`${proposal.id}: tally leaves no room for this worker's vote`);
    if (proposal.status !== 'active' && !proposal.outcome) problems.push(`${proposal.id}: closed without an outcome`);
    if (proposal.status === 'passed' && !mockFundLedger.some((row) => row.description === proposal.id)) {
      problems.push(`${proposal.id}: passed but never paid out`);
    }
  }
  for (const proposalId of Object.keys(mockMyVotes)) {
    const proposal = mockProposals.find((p) => p.id === proposalId);
    if (!proposal) problems.push(`vote: unknown proposal ${proposalId}`);
    else if (proposal.status === 'active') problems.push(`vote: ${proposalId} is still open — a seeded vote would block the demo vote`);
  }

  for (const thread of mockThreads) {
    const booking = mockBookings.find((b) => b.id === thread.bookingId);
    if (!booking) problems.push(`${thread.id}: unknown booking ${thread.bookingId}`);
    else if (booking.customerId !== thread.customerId) problems.push(`${thread.id}: customer does not match its booking`);
  }
  for (const rating of mockRatings) {
    const booking = mockBookings.find((b) => b.id === rating.bookingId);
    if (!booking) problems.push(`${rating.id}: unknown booking ${rating.bookingId}`);
    else if (booking.status !== 'COMPLETED' && booking.status !== 'SETTLED') {
      problems.push(`${rating.id}: rates an unfinished booking`);
    } else if (booking.customerId !== rating.customerId) {
      problems.push(`${rating.id}: customer does not match its booking`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Worker mock data is inconsistent:\n  - ${problems.join('\n  - ')}`);
  }
})();
