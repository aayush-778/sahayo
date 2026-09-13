import type { Id, IsoDateTime, Paise } from './common';

/**
 * Who raised the ticket.
 *
 * This platform's differentiator from an aggregator is that a **worker** can
 * open a dispute, not only a customer. The symmetry is the point, so the origin
 * is a first-class field rather than something inferred from the message thread.
 */
export const DisputeOrigin = {
  CUSTOMER: 'CUSTOMER',
  WORKER: 'WORKER',
} as const;
export type DisputeOrigin = (typeof DisputeOrigin)[keyof typeof DisputeOrigin];

export const DisputeStatus = {
  OPEN: 'OPEN',
  INVESTIGATING: 'INVESTIGATING',
  RESOLVED: 'RESOLVED',
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

/** How a ticket was settled. Three of these five move money. */
export const DisputeOutcome = {
  FULL_REFUND: 'FULL_REFUND',
  PARTIAL_REFUND: 'PARTIAL_REFUND',
  PENALTY_WAIVED: 'PENALTY_WAIVED',
  NO_ACTION: 'NO_ACTION',
  WARNING_ISSUED: 'WARNING_ISSUED',
} as const;
export type DisputeOutcome = (typeof DisputeOutcome)[keyof typeof DisputeOutcome];

/** Who wrote a message on a ticket. */
export const DisputeAuthor = {
  CUSTOMER: 'CUSTOMER',
  WORKER: 'WORKER',
  ADMIN: 'ADMIN',
} as const;
export type DisputeAuthor = (typeof DisputeAuthor)[keyof typeof DisputeAuthor];

export interface DisputeMessage {
  id: Id;
  author: DisputeAuthor;
  authorName: string;
  body: string;
  /**
   * An internal note is visible to administrators only and renders distinctly.
   * It is still part of the thread, so the reasoning behind a resolution stays
   * attached to the ticket.
   */
  internal: boolean;
  createdAt: IsoDateTime;
}

export interface DisputeResolution {
  outcome: DisputeOutcome;
  /** Set only for PARTIAL_REFUND. */
  refundAmount?: Paise;
  note: string;
  resolvedAt: IsoDateTime;
  resolvedByAdminId: Id;
  /**
   * Ledger entries this resolution created. Money never moves by editing an
   * existing row, so a resolution that refunds points at the new compensating
   * entries it appended.
   */
  ledgerEntryIds: Id[];
}

/**
 * Escalation to the Co-operative Ombudsman, required by the MSCS Amendment Act
 * 2023 for tickets left unresolved beyond the statutory window.
 */
export interface DisputeEscalation {
  /** The reference number quoted in correspondence with the Ombudsman. */
  referenceNumber: string;
  escalatedAt: IsoDateTime;
  escalatedByAdminId: Id;
}

export interface Dispute {
  id: Id;
  /** Short human-quotable handle, e.g. `DSP-0142`. */
  reference: string;
  bookingId: Id;
  raisedBy: DisputeOrigin;
  status: DisputeStatus;
  subject: string;
  /** Amount in contention, which is the booking's gross unless stated. */
  amountInDispute: Paise;
  customerId: Id;
  customerName: string;
  workerId: Id;
  workerName: string;
  messages: DisputeMessage[];
  resolution?: DisputeResolution;
  escalation?: DisputeEscalation;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
