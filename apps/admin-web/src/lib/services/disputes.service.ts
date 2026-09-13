import {
  BookingEventKind,
  DisputeAuthor,
  DisputeOrigin,
  DisputeOutcome,
  DisputeStatus,
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  type AdminBooking,
  type BookingEvent,
  type Dispute,
  type DisputeMessage,
  type DisputeResolution,
  type LedgerEntry,
  type Paise,
} from '@sahayo/shared';
import { CURRENT_ADMIN } from '@/lib/nav/session';
import { DAY_MS, SEED_NOW, splitAmount } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';
import { appendEntries } from './ledger.service';
import { compareIso } from '@/lib/dates';

/**
 * Days after which an unresolved ticket may be escalated to the Co-operative
 * Ombudsman, per the MSCS Amendment Act 2023.
 */
export const OMBUDSMAN_ESCALATION_DAYS = 14;

export interface DisputeFilter {
  raisedBy?: DisputeOrigin;
  status?: DisputeStatus;
  /** Open means not yet resolved, which covers both OPEN and INVESTIGATING. */
  unresolvedOnly?: boolean;
  search?: string;
}

export async function listDisputes(filter: DisputeFilter = {}): Promise<Dispute[]> {
  const { disputes } = adminState();
  const needle = filter.search?.trim().toLowerCase();

  const matched = disputes.filter((dispute) => {
    if (filter.raisedBy && dispute.raisedBy !== filter.raisedBy) return false;
    if (filter.status && dispute.status !== filter.status) return false;
    if (filter.unresolvedOnly && dispute.status === DisputeStatus.RESOLVED) return false;
    if (needle) {
      const haystack =
        `${dispute.reference} ${dispute.subject} ${dispute.customerName} ${dispute.workerName}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  /* Newest first, so a ticket raised this morning is at the top of the queue. */
  return respond([...matched].sort((a, b) => compareIso(b.createdAt, a.createdAt)));
}

export async function getDispute(disputeId: string): Promise<Dispute | undefined> {
  const { disputes } = adminState();
  return respond(disputes.find((dispute) => dispute.id === disputeId));
}

/**
 * How many tickets each side raised.
 *
 * The queue prints this above its filter tabs, because the symmetry is the
 * platform's differentiator and a reader should see it without filtering for it.
 */
export async function countDisputesByOrigin(): Promise<{ customer: number; worker: number }> {
  const { disputes } = adminState();
  const customer = disputes.filter((d) => d.raisedBy === DisputeOrigin.CUSTOMER).length;
  return respond({ customer, worker: disputes.length - customer });
}

/** Adds a message to the thread. `internal` notes are visible to admins only. */
export async function postMessage(
  disputeId: string,
  body: string,
  internal = false,
): Promise<Dispute> {
  const state = adminState();
  const dispute = state.disputes.find((candidate) => candidate.id === disputeId);
  if (!dispute) throw new Error(`No dispute with id ${disputeId}`);

  const trimmed = body.trim();
  if (!trimmed) throw new Error('Write something before sending.');
  if (dispute.status === DisputeStatus.RESOLVED && !internal) {
    throw new Error(
      'This ticket is resolved, so a reply would reach nobody. Add an internal note instead.',
    );
  }

  const message: DisputeMessage = {
    id: `msg_${disputeId}_${dispute.messages.length + 1}`,
    author: DisputeAuthor.ADMIN,
    authorName: CURRENT_ADMIN.name,
    body: trimmed,
    internal,
    createdAt: SEED_NOW.toISOString(),
  };

  state.updateDispute(disputeId, {
    messages: [...dispute.messages, message],
    /* A reply moves an untouched ticket into investigation. */
    status: dispute.status === DisputeStatus.OPEN ? DisputeStatus.INVESTIGATING : dispute.status,
    updatedAt: message.createdAt,
  });

  const updated = adminState().disputes.find((candidate) => candidate.id === disputeId);
  return respond(updated as Dispute);
}

/** What a booking actually paid out, which is the ceiling on any refund of it. */
function postedSplit(bookingId: string): { worker: Paise; platform: Paise; coopFund: Paise } {
  let worker = 0;
  let platform = 0;
  let coopFund = 0;
  for (const entry of adminState().ledger) {
    if (entry.bookingId !== bookingId || entry.reversalOf) continue;
    if (entry.type === LedgerEntryType.WORKER_PAYOUT) worker += entry.amount;
    else if (entry.type === LedgerEntryType.PLATFORM_FEE) platform += entry.amount;
    else if (entry.type === LedgerEntryType.COOP_FUND_CONTRIBUTION) coopFund += entry.amount;
  }
  return { worker, platform, coopFund };
}

/**
 * How much of a disputed booking could still be refunded.
 *
 * Zero when nothing was ever paid for the job — a cancelled or in-progress booking
 * has no split in the ledger, and refunding money that never moved would post rows
 * describing a transfer that did not happen.
 */
export function refundableAmount(dispute: Dispute): Paise {
  const split = postedSplit(dispute.bookingId);
  return split.worker + split.platform + split.coopFund;
}

/**
 * The ledger rows a resolution would post, WITHOUT posting them.
 *
 * A refund of R is four rows, and they net to zero:
 *
 *   the customer receives R back                        CUSTOMER    +R
 *   R is recovered from where the booking's money went  WORKER      −worker share of R
 *                                                       PLATFORM    −platform share of R
 *                                                       COOP_FUND   −fund share of R
 *
 * The recovery uses splitAmount on R at the shares this booking was actually paid at,
 * read back from its own ledger rows — not the split currently set in Settings, which
 * may have changed since. The three clawbacks sum to R exactly and every party gives
 * back in the proportion they were paid. No existing row is touched; the original three
 * split rows stay exactly as they are and these are new rows beside them. The finance
 * hub's split nets them out, so its totals move by exactly R.
 *
 * The resolve modal shows these rows before confirming, and resolveDispute posts this
 * same list — what was previewed is exactly what is written.
 */
export function previewResolutionEntries(
  dispute: Dispute,
  outcome: DisputeOutcome,
  refundAmount?: Paise,
): LedgerEntry[] {
  if (outcome !== DisputeOutcome.FULL_REFUND && outcome !== DisputeOutcome.PARTIAL_REFUND) {
    return [];
  }

  const ceiling = refundableAmount(dispute);
  const amount = outcome === DisputeOutcome.FULL_REFUND ? ceiling : (refundAmount ?? 0);
  if (amount <= 0 || amount > ceiling) return [];

  const posted = postedSplit(dispute.bookingId);
  const parts = splitAmount(amount, {
    worker: posted.worker / ceiling,
    platform: posted.platform / ceiling,
    coopFund: posted.coopFund / ceiling,
  });
  const at = SEED_NOW.toISOString();
  const label = outcome === DisputeOutcome.FULL_REFUND ? 'Full refund' : 'Partial refund';

  const row = (
    suffix: string,
    account: LedgerEntry['account'],
    direction: LedgerEntry['direction'],
    value: Paise,
    description: string,
    subjectId?: string,
  ): LedgerEntry => ({
    id: `led_${dispute.id}_${suffix}`,
    type: LedgerEntryType.REFUND,
    account,
    direction,
    amount: value,
    ...(subjectId ? { subjectId } : {}),
    bookingId: dispute.bookingId,
    description,
    referenceKey: `${dispute.id}:${suffix}`,
    createdAt: at,
  });

  return [
    row(
      'refund',
      LedgerAccount.CUSTOMER,
      LedgerDirection.CREDIT,
      amount,
      `${label} to ${dispute.customerName} on ${dispute.reference}`,
      dispute.customerId,
    ),
    row(
      'refund-worker',
      LedgerAccount.WORKER,
      LedgerDirection.DEBIT,
      parts.worker,
      `Worker share recovered for ${dispute.reference}`,
      dispute.workerId,
    ),
    row(
      'refund-platform',
      LedgerAccount.PLATFORM,
      LedgerDirection.DEBIT,
      parts.platform,
      `Platform share recovered for ${dispute.reference}`,
    ),
    row(
      'refund-fund',
      LedgerAccount.COOP_FUND,
      LedgerDirection.DEBIT,
      parts.coopFund,
      `Cooperative fund share recovered for ${dispute.reference}`,
    ),
  ].filter((entry) => entry.amount > 0);
}

/**
 * Resolves a ticket.
 *
 * Every outcome that moves money appends new ledger rows through ledger.service
 * FIRST, then records their ids on the resolution, so the summary card links to real
 * rows rather than asserting that money moved. Nothing here changes an existing
 * ledger row, and nothing may.
 */
export async function resolveDispute(
  disputeId: string,
  outcome: DisputeOutcome,
  note: string,
  refundAmount?: Paise,
): Promise<Dispute> {
  const state = adminState();
  const dispute = state.disputes.find((candidate) => candidate.id === disputeId);
  if (!dispute) throw new Error(`No dispute with id ${disputeId}`);
  if (dispute.status === DisputeStatus.RESOLVED) {
    throw new Error('This ticket is already resolved. Open a new one if the problem came back.');
  }

  const trimmed = note.trim();
  if (!trimmed) {
    throw new Error('Explain the decision in a line. Both parties can ask why.');
  }

  const movesMoney =
    outcome === DisputeOutcome.FULL_REFUND || outcome === DisputeOutcome.PARTIAL_REFUND;
  if (movesMoney) {
    const ceiling = refundableAmount(dispute);
    if (ceiling === 0) {
      throw new Error(
        'Nothing has been paid for this job yet, so there is nothing to refund. Choose another outcome.',
      );
    }
    if (outcome === DisputeOutcome.PARTIAL_REFUND) {
      if (!refundAmount || refundAmount <= 0) {
        throw new Error('Enter how much to refund.');
      }
      if (refundAmount > ceiling) {
        throw new Error('A partial refund cannot be more than the job was paid.');
      }
    }
  }

  const entries = previewResolutionEntries(dispute, outcome, refundAmount);
  if (entries.length > 0) await appendEntries(entries);

  const resolution: DisputeResolution = {
    outcome,
    ...(outcome === DisputeOutcome.PARTIAL_REFUND ? { refundAmount } : {}),
    ...(outcome === DisputeOutcome.FULL_REFUND ? { refundAmount: entries[0]?.amount } : {}),
    note: trimmed,
    resolvedAt: SEED_NOW.toISOString(),
    resolvedByAdminId: CURRENT_ADMIN.id,
    ledgerEntryIds: entries.map((entry) => entry.id),
  };

  state.updateDispute(disputeId, {
    status: DisputeStatus.RESOLVED,
    resolution,
    updatedAt: resolution.resolvedAt,
  });

  const updated = adminState().disputes.find((candidate) => candidate.id === disputeId);
  return respond(updated as Dispute);
}

/** Days since a ticket was raised, against the dataset's fixed "now". */
export function disputeAgeDays(dispute: Dispute): number {
  return Math.floor((SEED_NOW.getTime() - new Date(dispute.createdAt).getTime()) / DAY_MS);
}

/** Whether a ticket is old enough and open enough to escalate. */
export function canEscalate(dispute: Dispute): boolean {
  if (dispute.status === DisputeStatus.RESOLVED) return false;
  if (dispute.escalation) return false;
  return disputeAgeDays(dispute) > OMBUDSMAN_ESCALATION_DAYS;
}

/**
 * Escalates a ticket to the Co-operative Ombudsman.
 *
 * Required by the MSCS Amendment Act 2023 for disputes left unresolved beyond the
 * statutory window. The reference number is what appears in correspondence, so it is
 * generated once and stored rather than recomputed for display.
 */
export async function escalateToOmbudsman(disputeId: string): Promise<Dispute> {
  const state = adminState();
  const dispute = state.disputes.find((candidate) => candidate.id === disputeId);
  if (!dispute) throw new Error(`No dispute with id ${disputeId}`);

  if (!canEscalate(dispute)) {
    throw new Error(
      `Only unresolved tickets older than ${OMBUDSMAN_ESCALATION_DAYS} days can be escalated, ` +
        'and a ticket can only be escalated once.',
    );
  }

  const escalatedAt = SEED_NOW.toISOString();
  state.updateDispute(disputeId, {
    escalation: {
      referenceNumber: `OMB/${escalatedAt.slice(0, 4)}/${dispute.reference}`,
      escalatedAt,
      escalatedByAdminId: CURRENT_ADMIN.id,
    },
    updatedAt: escalatedAt,
  });

  const updated = adminState().disputes.find((candidate) => candidate.id === disputeId);
  return respond(updated as Dispute);
}

/* ------------------------------------------------------------------------- */
/* The ticket's context: booking, timeline, route, and the disputed moment.   */
/* ------------------------------------------------------------------------- */

/** One node on the reconstructed timeline. */
export type TimelineNode =
  | { kind: 'event'; at: string; event: BookingEvent; disputed: boolean }
  | { kind: 'route'; at: string; points: { x: number; y: number }[]; distanceKm: number }
  | { kind: 'message'; at: string; message: DisputeMessage }
  | {
      kind: 'split';
      at: string;
      worker: Paise;
      platform: Paise;
      coopFund: Paise;
    };

export interface DisputeContext {
  dispute: Dispute;
  booking?: AdminBooking;
  workerAvatarUrl?: string;
  /** Oldest first: the ticket reads as the story of the job. */
  timeline: TimelineNode[];
  refundable: Paise;
  ageDays: number;
  escalatable: boolean;
  zoneName?: string;
}

/**
 * Which booking event a complaint is about.
 *
 * Read from the subject, because that is where the complainant said what went wrong.
 * The timeline marks that node in coral so a reviewer goes straight to the disputed
 * moment instead of reading the whole job top to bottom.
 */
function disputedEventKind(subject: string): BookingEvent['kind'] {
  const s = subject.toLowerCase();
  if (s.includes('pay') || s.includes('charged') || s.includes('payout')) {
    return BookingEventKind.PAID;
  }
  if (s.includes('late') || s.includes('did not arrive') || s.includes('cancelled after')) {
    return BookingEventKind.ACCEPTED;
  }
  if (s.includes('unfinished') || s.includes('wrong service') || s.includes('damage')) {
    return BookingEventKind.COMPLETED;
  }
  return BookingEventKind.STARTED;
}

/** A small deterministic 32-bit hash, for shaping a route that stays put on reload. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The worker's route to the job, as a small sparkline.
 *
 * The prototype has no GPS log, so the breadcrumbs are derived from the booking id —
 * stable on every reload, shaped like a real drive with a couple of turns, and never
 * presented as more than an illustration of the path: the timeline labels it
 * "Route to the job", with no claim to a precise address. In production this reads
 * the worker app's location pings for the booking window.
 */
function routeFor(bookingId: string): { points: { x: number; y: number }[]; distanceKm: number } {
  const seed = hash(bookingId);
  const points: { x: number; y: number }[] = [];
  let y = 12 + (seed % 8);
  for (let i = 0; i <= 9; i += 1) {
    const wobble = (((seed >> (i * 3)) & 7) - 3.5) * 1.6;
    y = Math.max(3, Math.min(29, y + wobble));
    points.push({ x: (i / 9) * 100, y });
  }
  return { points, distanceKm: Math.round((1.2 + (seed % 38) / 10) * 10) / 10 };
}

/**
 * Everything the ticket pane shows, assembled once.
 *
 * The timeline merges the booking's own events, the route, the conversation and the
 * payment split into one chronology. Merging here rather than in the page keeps the
 * ordering rule — and the rule for which moment is disputed — in one place.
 */
export async function getDisputeContext(disputeId: string): Promise<DisputeContext | undefined> {
  const { disputes, bookings, workers, zones } = adminState();
  const dispute = disputes.find((candidate) => candidate.id === disputeId);
  if (!dispute) return respond(undefined);

  const booking = bookings.find((candidate) => candidate.id === dispute.bookingId);
  const worker = workers.find((candidate) => candidate.id === dispute.workerId);
  const disputedKind = disputedEventKind(dispute.subject);

  const timeline: TimelineNode[] = [];

  for (const event of booking?.timeline ?? []) {
    timeline.push({ kind: 'event', at: event.at, event, disputed: event.kind === disputedKind });

    /* The route sits between accepting and starting: it is the drive to the job. */
    if (event.kind === BookingEventKind.ACCEPTED) {
      const route = routeFor(dispute.bookingId);
      timeline.push({ kind: 'route', at: event.at, ...route });
    }

    /* The split lands with the payment. */
    if (event.kind === BookingEventKind.PAID) {
      const split = postedSplit(dispute.bookingId);
      timeline.push({ kind: 'split', at: event.at, ...split });
    }
  }

  for (const message of dispute.messages) {
    timeline.push({ kind: 'message', at: message.createdAt, message });
  }

  /* Stable order: by time, and at equal times keep insertion order. */
  const ordered = timeline
    .map((node, index) => ({ node, index }))
    .sort((a, b) => compareIso(a.node.at, b.node.at) || a.index - b.index)
    .map(({ node }) => node);

  return respond({
    dispute,
    booking,
    workerAvatarUrl: worker?.avatarUrl,
    timeline: ordered,
    refundable: refundableAmount(dispute),
    ageDays: disputeAgeDays(dispute),
    escalatable: canEscalate(dispute),
    zoneName: booking ? zones.find((zone) => zone.id === booking.zoneId)?.name : undefined,
  });
}
