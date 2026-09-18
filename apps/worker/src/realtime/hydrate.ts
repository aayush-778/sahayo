import {
  startCodeFor,
  type BookingListResult,
  type CoopFundSummary,
  type Id,
  type User,
  type WorkerEarnings,
} from '@sahayo/shared';

import { useSessionStore } from '../store/session';
import type { VoteChoice } from '../types';
import { api } from './api';
import { myVoteOn, proposalFromServer, settlementsFromReleases, timelineFromEvents } from './mappers';

/**
 * Replaces the session's demo data with the server's: this worker's bookings, their
 * earnings and payouts, and the cooperative fund — the same records the admin portal
 * shows. Offers, chat threads, ratings and support requests are left as they are.
 */
export async function hydrateFromServer(workerId: Id): Promise<void> {
  const [bookings, earnings, fund] = await Promise.all([
    api<BookingListResult>('GET', `/bookings?role=WORKER&userId=${encodeURIComponent(workerId)}`),
    api<WorkerEarnings>('GET', `/earnings/${encodeURIComponent(workerId)}`),
    api<CoopFundSummary>('GET', '/coop/fund'),
  ]);

  useSessionStore.setState((state) => ({
    bookings: bookings.records.map((record) => record.booking),
    timelines: Object.fromEntries(bookings.records.map((record) => [record.booking.id, timelineFromEvents(record.timeline)])),
    startCodes: Object.fromEntries(bookings.records.map((record) => [record.booking.id, startCodeFor(record.booking.id)])),
    customers: { ...state.customers, ...byId(bookings.customers), ...byId(earnings.customers) },
    ...earningsSlice(earnings),
    ...fundSlice(fund, workerId),
  }));
}

/** After a completion: the new payout and the fund's new balance. */
export async function refreshEarningsAndFund(workerId: Id): Promise<void> {
  const [earnings, fund] = await Promise.all([
    api<WorkerEarnings>('GET', `/earnings/${encodeURIComponent(workerId)}`),
    api<CoopFundSummary>('GET', '/coop/fund'),
  ]);
  useSessionStore.setState((state) => ({
    customers: { ...state.customers, ...byId(earnings.customers) },
    ...earningsSlice(earnings),
    ...fundSlice(fund, workerId),
  }));
}

function byId(users: User[]): Record<Id, User> {
  return Object.fromEntries(users.map((user) => [user.id, user]));
}

function earningsSlice(earnings: WorkerEarnings) {
  const facts = earnings.bookingFacts;
  return {
    earnings: earnings.payouts,
    settlements: settlementsFromReleases(earnings.releases),
    subCategoryByEntryId: Object.fromEntries(
      earnings.payouts.flatMap((payout) => (payout.bookingId && facts[payout.bookingId] ? [[payout.id, facts[payout.bookingId]!.serviceCategoryId]] : [])),
    ),
    customerByEntryId: Object.fromEntries(
      earnings.payouts.flatMap((payout) => (payout.bookingId && facts[payout.bookingId] ? [[payout.id, facts[payout.bookingId]!.customerId]] : [])),
    ),
  };
}

function fundSlice(fund: CoopFundSummary, workerId: Id) {
  const votes: Record<Id, VoteChoice> = {};
  for (const proposal of fund.proposals) {
    const vote = myVoteOn(proposal, workerId);
    if (vote) votes[proposal.id] = vote;
  }
  return {
    fundLedger: fund.ledger,
    fundMemberCount: fund.memberCount,
    proposals: fund.proposals.map((proposal) => proposalFromServer(proposal, workerId)),
    votes,
  };
}
