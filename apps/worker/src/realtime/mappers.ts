import {
  BookingEventKind,
  BookingStatus,
  ProposalStatus,
  UserRole,
  VoteDirection,
  type BookingEvent,
  type GigOfferPayload,
  type Id,
  type LedgerEntry,
  type Proposal as ServerProposal,
  type User,
} from '@sahayo/shared';
import { FUND_PROGRAMMES } from '@sahayo/shared/seed/fund-programmes';

import type { JobRequest, JobTimeline, Proposal, ProposalCategory, Settlement, VoteChoice } from '../types';

/**
 * The server's records in the shapes the worker app's screens were built on. Screens
 * never see the wire format; the session store holds what these return.
 */

/**
 * A live offer as a job request.
 *
 * An instant offer's deadline is re-expressed on this phone's clock: the server says how long the
 * window is (`expiresAt - issuedAt`, both on the server's clock), and the window starts
 * when the offer arrives. A phone whose clock is a minute out still counts down the
 * true thirty seconds — at the cost of the few milliseconds the offer spent in flight.
 */
export function jobRequestFromOffer(offer: GigOfferPayload, receivedAt: number): JobRequest {
  const windowMs = Math.max(0, Date.parse(offer.expiresAt) - Date.parse(offer.issuedAt));
  /* A scheduled offer runs to the slot itself, a fixed instant both clocks agree on. */
  const expiresAt = offer.kind === 'SCHEDULED' ? offer.expiresAt : new Date(receivedAt + windowMs).toISOString();
  const customer: User = {
    id: offer.booking.customerId,
    phone: '',
    name: offer.customerName,
    role: UserRole.CUSTOMER,
    createdAt: offer.booking.createdAt,
    updatedAt: offer.booking.updatedAt,
  };
  return {
    id: offer.offerId,
    booking: offer.booking,
    customer,
    distanceM: offer.distanceM,
    estimatedMinutes: offer.estimatedMinutes,
    expiresAt,
    source: 'live',
    ...(offer.kind === 'SCHEDULED' ? { scheduled: true as const } : {}),
  };
}

const STATUS_FOR_EVENT: Partial<Record<BookingEvent['kind'], BookingStatus>> = {
  [BookingEventKind.ACCEPTED]: BookingStatus.ACCEPTED,
  [BookingEventKind.EN_ROUTE]: BookingStatus.EN_ROUTE,
  [BookingEventKind.ARRIVED]: BookingStatus.ARRIVED,
  [BookingEventKind.STARTED]: BookingStatus.IN_PROGRESS,
  [BookingEventKind.COMPLETED]: BookingStatus.COMPLETED,
  /*
   * PAID is deliberately absent. It records money moving — the split being posted, or the
   * customer paying — not the booking reaching SETTLED, which is the worker's payout
   * being released. Mapping it would show jobs as paid out that are not.
   */
};

/** When each status was reached, from the booking's history. */
export function timelineFromEvents(events: BookingEvent[]): JobTimeline {
  const timeline: JobTimeline = {};
  for (const event of events) {
    const status = event.status ?? STATUS_FOR_EVENT[event.kind];
    if (status && !timeline[status]) timeline[status] = event.at;
  }
  return timeline;
}

/**
 * Transfers to the bank, as the Earnings screen's settlements: every payout released on
 * the same day is one transfer.
 */
export function settlementsFromReleases(releases: LedgerEntry[]): Settlement[] {
  const byDay = new Map<string, LedgerEntry[]>();
  for (const release of releases) {
    const day = release.createdAt.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), release]);
  }
  return [...byDay.entries()].map(([day, rows]) => ({
    id: `stl_${day}`,
    amount: rows.reduce((sum, row) => sum + row.amount, 0),
    entryIds: rows.map((row) => row.releaseOf).filter((id): id is Id => Boolean(id)),
    settledAt: rows[rows.length - 1]!.createdAt,
    reference: rows[0]!.traceId ?? `UTR${day.replace(/-/g, '')}`,
    method: 'upi',
  }));
}

const CATEGORY_BY_PROGRAMME: Record<string, ProposalCategory> = {
  'monsoon-gear': 'equipment',
  'accident-cover': 'relief',
  'tool-loans': 'loan',
  training: 'training',
  'health-insurance': 'health',
  childcare: 'relief',
  'fuel-advance': 'loan',
};

/**
 * A proposal as the worker app shows it. The tally is the OTHER members' votes — this
 * worker's own vote is returned separately by `myVoteOn`.
 */
export function proposalFromServer(proposal: ServerProposal, workerId: Id): Proposal {
  const programme = FUND_PROGRAMMES.find((entry) => entry.title === proposal.title);
  const mine = proposal.ballots.find((ballot) => ballot.workerId === workerId);
  return {
    id: proposal.id,
    title: { en: proposal.title, hi: proposal.titleLocalized?.hi ?? proposal.title },
    summary: { en: proposal.description, hi: proposal.descriptionLocalized?.hi ?? proposal.description },
    amount: proposal.amountRequested,
    proposedBy: proposal.proposerName,
    status: proposal.status === ProposalStatus.OPEN ? 'active' : proposal.status === ProposalStatus.PASSED ? 'passed' : 'rejected',
    opensAt: proposal.openedAt,
    closesAt: proposal.closesAt,
    tally: {
      yes: proposal.votesFor - (mine?.direction === VoteDirection.FOR ? 1 : 0),
      no: proposal.votesAgainst - (mine?.direction === VoteDirection.AGAINST ? 1 : 0),
      abstain: 0,
    },
    eligibleVoters: proposal.electorate,
    category: programme ? (CATEGORY_BY_PROGRAMME[programme.key] ?? 'other') : 'other',
    points: [],
    ...(proposal.outcomeNote ? { outcome: { en: proposal.outcomeNote, hi: proposal.outcomeNote } } : {}),
  };
}

export function myVoteOn(proposal: ServerProposal, workerId: Id): VoteChoice | undefined {
  const mine = proposal.ballots.find((ballot) => ballot.workerId === workerId);
  if (!mine) return undefined;
  return mine.direction === VoteDirection.FOR ? 'yes' : 'no';
}
