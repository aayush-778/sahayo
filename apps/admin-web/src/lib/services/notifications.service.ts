import {
  BookingStatus,
  DisputeStatus,
  LoanStatus,
  ProposalStatus,
} from '@sahayo/shared';
import { DAY_MS, SEED_NOW } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { canEscalate } from './disputes.service';
import { listKycQueue } from './kyc.service';
import { getZoneDemand } from './dispatch.service';
import { listPayouts } from './finance.service';
import { respond } from './latency';
import { count, rupees } from '@/lib/format';

/**
 * What needs an administrator's attention, derived from the data rather than stored.
 *
 * Each notification summarises a queue that already exists — waiting documents, open
 * disputes, loan requests — and links to it, so the bell can never announce work that
 * the page it points at does not show. Its id carries the count, so when a queue grows
 * the notification counts as unread again.
 */

export const NotificationKind = {
  VERIFICATION: 'VERIFICATION',
  OMBUDSMAN: 'OMBUDSMAN',
  DISPUTE_REPLY: 'DISPUTE_REPLY',
  LOAN: 'LOAN',
  VOTE_CLOSING: 'VOTE_CLOSING',
  PAYOUTS: 'PAYOUTS',
  UNACCEPTED: 'UNACCEPTED',
  THIN_COVER: 'THIN_COVER',
} as const;
export type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind];

/** What each kind is, for the preferences on the account page. */
export const NOTIFICATION_KINDS: ReadonlyArray<{ kind: NotificationKind; label: string; description: string }> = [
  { kind: 'VERIFICATION', label: 'Documents to verify', description: 'Workers waiting for their identity documents to be checked.' },
  { kind: 'OMBUDSMAN', label: 'Disputes past 14 days', description: 'Tickets old enough that they may go to the Co-operative Ombudsman.' },
  { kind: 'DISPUTE_REPLY', label: 'New disputes', description: 'Tickets nobody has replied to yet.' },
  { kind: 'LOAN', label: 'Loan requests', description: 'Members asking to borrow from the cooperative fund.' },
  { kind: 'VOTE_CLOSING', label: 'Votes closing soon', description: 'Proposals whose voting window ends within three days.' },
  { kind: 'PAYOUTS', label: 'Payouts to release', description: "Earned payouts waiting to be sent to workers' banks." },
  { kind: 'UNACCEPTED', label: 'Requests without a worker', description: 'Live requests that no worker has accepted yet.' },
  { kind: 'THIN_COVER', label: 'Thin cover', description: 'Zones where orders outnumber available workers.' },
];

export interface AdminNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  href: string;
  /** coral needs action soon; marigold is a queue; lavender is information. */
  tone: 'coral' | 'marigold' | 'lavender';
  read: boolean;
}

export interface NotificationFeed {
  items: AdminNotification[];
  unread: number;
}

export async function listNotifications(): Promise<NotificationFeed> {
  const state = adminState();
  const { disputes, loanRequests, proposals, bookings, readNotificationIds, mutedNotificationKinds } = state;
  const drafts: Array<Omit<AdminNotification, 'read'>> = [];
  const plural = (n: number, one: string, many: string): string => `${count(n)} ${n === 1 ? one : many}`;

  /* The queue the verification page shows, not a count of worker statuses, so the two always agree. */
  const pendingKyc = (await listKycQueue()).length;
  if (pendingKyc > 0) {
    drafts.push({
      id: `VERIFICATION:${pendingKyc}`,
      kind: 'VERIFICATION',
      title: `${plural(pendingKyc, 'worker is', 'workers are')} waiting to be verified`,
      detail: 'They cannot be offered jobs until their documents are checked.',
      href: '/verification',
      tone: 'marigold',
    });
  }

  const escalatable = disputes.filter(canEscalate);
  if (escalatable.length > 0) {
    drafts.push({
      id: `OMBUDSMAN:${escalatable.map((dispute) => dispute.id).join(',')}`,
      kind: 'OMBUDSMAN',
      title: `${plural(escalatable.length, 'dispute has', 'disputes have')} been open more than 14 days`,
      detail: `${escalatable.slice(0, 3).map((dispute) => dispute.reference).join(', ')}${escalatable.length > 3 ? ' and more' : ''} can now be referred to the Ombudsman.`,
      href: `/disputes?id=${escalatable[0]?.id}`,
      tone: 'coral',
    });
  }

  const unanswered = disputes.filter((dispute) => dispute.status === DisputeStatus.OPEN);
  if (unanswered.length > 0) {
    drafts.push({
      id: `DISPUTE_REPLY:${unanswered.length}`,
      kind: 'DISPUTE_REPLY',
      title: `${plural(unanswered.length, 'dispute needs', 'disputes need')} a first reply`,
      detail: 'Nobody has written back to the customer or worker who raised them.',
      href: '/disputes',
      tone: 'coral',
    });
  }

  const pendingLoans = loanRequests.filter((loan) => loan.status === LoanStatus.PENDING);
  if (pendingLoans.length > 0) {
    drafts.push({
      id: `LOAN:${pendingLoans.length}`,
      kind: 'LOAN',
      title: `${plural(pendingLoans.length, 'member is', 'members are')} asking to borrow`,
      detail: `${rupees(pendingLoans.reduce((sum, loan) => sum + loan.amount, 0))} requested from the cooperative fund.`,
      href: '/fund',
      tone: 'marigold',
    });
  }

  const soon = SEED_NOW.getTime() + 3 * DAY_MS;
  for (const proposal of proposals) {
    if (proposal.status !== ProposalStatus.OPEN) continue;
    const closes = Date.parse(proposal.closesAt);
    if (closes > soon) continue;
    const days = Math.max(0, Math.ceil((closes - SEED_NOW.getTime()) / DAY_MS));
    const cast = proposal.votesFor + proposal.votesAgainst;
    drafts.push({
      id: `VOTE_CLOSING:${proposal.id}:${cast}`,
      kind: 'VOTE_CLOSING',
      title: `Voting on "${proposal.title}" closes ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`,
      detail: `${count(cast)} of ${count(proposal.quorum)} votes needed for the result to count.`,
      href: '/fund',
      tone: cast < proposal.quorum ? 'coral' : 'lavender',
    });
  }

  const pendingPayouts = await listPayouts('PENDING');
  if (pendingPayouts.length > 0) {
    drafts.push({
      id: `PAYOUTS:${pendingPayouts.length}`,
      kind: 'PAYOUTS',
      title: `${rupees(pendingPayouts.reduce((sum, row) => sum + row.payout.amount, 0))} of payouts are ready to release`,
      detail: `${plural(pendingPayouts.length, 'payout is', 'payouts are')} waiting to go to workers' banks.`,
      href: '/finance',
      tone: 'marigold',
    });
  }

  const waiting = bookings.filter(
    (booking) => booking.status === BookingStatus.REQUESTED || booking.status === BookingStatus.BROADCAST,
  );
  if (waiting.length > 0) {
    drafts.push({
      id: `UNACCEPTED:${waiting.map((booking) => booking.id).join(',')}`,
      kind: 'UNACCEPTED',
      title: `${plural(waiting.length, 'request has', 'requests have')} no worker yet`,
      detail: 'Offered out and waiting for someone to accept.',
      href: '/dispatch',
      tone: 'lavender',
    });
  }

  const thin = (await getZoneDemand()).filter((zone) => zone.underserved);
  if (thin.length > 0) {
    drafts.push({
      id: `THIN_COVER:${thin.map((zone) => zone.zoneId).join(',')}`,
      kind: 'THIN_COVER',
      title: `Cover is thin in ${thin[0]?.zoneName}${thin.length > 1 ? ` and ${thin.length - 1} more ${thin.length === 2 ? 'zone' : 'zones'}` : ''}`,
      detail: 'More orders than available workers this week.',
      href: `/dispatch?zone=${thin[0]?.zoneId}`,
      tone: 'lavender',
    });
  }

  const read = new Set(readNotificationIds);
  const muted = new Set(mutedNotificationKinds);
  const items = drafts
    .filter((draft) => !muted.has(draft.kind))
    .map((draft) => ({ ...draft, read: read.has(draft.id) }));

  return respond({ items, unread: items.filter((item) => !item.read).length });
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  adminState().markNotificationsRead(ids);
  return respond(undefined);
}

export async function getMutedNotificationKinds(): Promise<string[]> {
  return respond(adminState().mutedNotificationKinds);
}

export async function setNotificationKindEnabled(kind: NotificationKind, enabled: boolean): Promise<void> {
  adminState().setNotificationKindMuted(kind, !enabled);
  return respond(undefined);
}
