import {
  DisputeAuthor,
  DisputeOrigin,
  DisputeOutcome,
  DisputeStatus,
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  type Dispute,
  type DisputeMessage,
  type DisputeResolution,
  type LedgerEntry,
  type Paise,
} from '@sahayo/shared';
import { CURRENT_ADMIN } from '@/lib/nav/session';
import { DAY_MS, SEED_NOW } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';
import { appendEntries } from './ledger.service';

/**
 * Days after which an unresolved ticket may be escalated to the Co-operative
 * Ombudsman, per the MSCS Amendment Act 2023.
 */
export const OMBUDSMAN_ESCALATION_DAYS = 14;

export interface DisputeFilter {
  raisedBy?: DisputeOrigin;
  status?: DisputeStatus;
  search?: string;
}

export async function listDisputes(filter: DisputeFilter = {}): Promise<Dispute[]> {
  const { disputes } = adminState();
  const needle = filter.search?.trim().toLowerCase();

  const matched = disputes.filter((dispute) => {
    if (filter.raisedBy && dispute.raisedBy !== filter.raisedBy) return false;
    if (filter.status && dispute.status !== filter.status) return false;
    if (needle) {
      const haystack =
        `${dispute.reference} ${dispute.subject} ${dispute.customerName} ${dispute.workerName}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  /* Newest first, so a ticket raised this morning is at the top of the queue. */
  return respond([...matched].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
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

  const message: DisputeMessage = {
    id: `msg_${disputeId}_${dispute.messages.length + 1}`,
    author: DisputeAuthor.ADMIN,
    authorName: CURRENT_ADMIN.name,
    body,
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

/** Outcomes that move money, and therefore write ledger entries. */
const MONEY_MOVING: ReadonlySet<DisputeOutcome> = new Set([
  DisputeOutcome.FULL_REFUND,
  DisputeOutcome.PARTIAL_REFUND,
]);

/**
 * Builds the entries a resolution would write, WITHOUT writing them.
 *
 * The resolution modal shows these before the administrator confirms, so the
 * consequence of an outcome is visible before it is chosen rather than explained
 * afterwards. `resolveDispute` calls the same function, so what was previewed is
 * exactly what is posted.
 */
export function previewResolutionEntries(
  dispute: Dispute,
  outcome: DisputeOutcome,
  refundAmount?: Paise,
): LedgerEntry[] {
  if (!MONEY_MOVING.has(outcome)) return [];

  const amount =
    outcome === DisputeOutcome.FULL_REFUND ? dispute.amountInDispute : (refundAmount ?? 0);
  if (amount <= 0) return [];

  const at = SEED_NOW.toISOString();

  /*
   * A refund is a DEBIT against the customer account, appended — never an edit of
   * the original charge. The original booking's three split entries stay
   * byte-identical forever; this is a new movement that happens to offset them.
   */
  return [
    {
      id: `led_${dispute.id}_refund`,
      type: LedgerEntryType.REFUND,
      account: LedgerAccount.CUSTOMER,
      direction: LedgerDirection.DEBIT,
      amount,
      subjectId: dispute.customerId,
      bookingId: dispute.bookingId,
      description:
        outcome === DisputeOutcome.FULL_REFUND
          ? `Full refund on ${dispute.reference}`
          : `Partial refund on ${dispute.reference}`,
      referenceKey: `${dispute.id}:refund`,
      createdAt: at,
    },
  ];
}

/**
 * Resolves a ticket.
 *
 * Every outcome that moves money appends new ledger entries through
 * `ledger.service` first, then records their ids on the resolution. The
 * resolution card then links to real rows rather than asserting that money moved.
 * Nothing here edits an existing ledger entry, and nothing may.
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

  if (outcome === DisputeOutcome.PARTIAL_REFUND) {
    if (!refundAmount || refundAmount <= 0) {
      throw new Error('A partial refund needs an amount.');
    }
    if (refundAmount > dispute.amountInDispute) {
      throw new Error('A partial refund cannot exceed the amount in dispute.');
    }
  }

  const entries = previewResolutionEntries(dispute, outcome, refundAmount);
  if (entries.length > 0) {
    await appendEntries(entries);
  }

  const resolution: DisputeResolution = {
    outcome,
    ...(outcome === DisputeOutcome.PARTIAL_REFUND ? { refundAmount } : {}),
    note,
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

/** Whether a ticket is old enough and open enough to escalate. */
export function canEscalate(dispute: Dispute): boolean {
  if (dispute.status === DisputeStatus.RESOLVED) return false;
  if (dispute.escalation) return false;
  const ageDays = (SEED_NOW.getTime() - new Date(dispute.createdAt).getTime()) / DAY_MS;
  return ageDays > OMBUDSMAN_ESCALATION_DAYS;
}

/**
 * Escalates a ticket to the Co-operative Ombudsman.
 *
 * Required by the MSCS Amendment Act 2023 for disputes left unresolved beyond the
 * statutory window. The reference number is what appears in correspondence, so it
 * is generated once and stored rather than recomputed for display.
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
