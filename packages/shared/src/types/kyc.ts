import type { Id, IsoDateTime } from './common';

/**
 * Identity documents a worker may submit for verification.
 *
 * UIDAI Circular 14 of 2025 governs how the Aadhaar case is handled, and the
 * rules are absolute — see `KycSubmission.aadhaarRef` below and the compliance
 * section of CLAUDE.md.
 */
export const KycDocumentType = {
  AADHAAR: 'AADHAAR',
  PAN: 'PAN',
  DRIVING_LICENCE: 'DRIVING_LICENCE',
} as const;
export type KycDocumentType = (typeof KycDocumentType)[keyof typeof KycDocumentType];

/** The fixed set of reasons a reviewer may reject a submission. */
export const KycRejectionReason = {
  BLURRY_IMAGE: 'BLURRY_IMAGE',
  NAME_MISMATCH: 'NAME_MISMATCH',
  DOCUMENT_EXPIRED: 'DOCUMENT_EXPIRED',
  WRONG_DOCUMENT_TYPE: 'WRONG_DOCUMENT_TYPE',
  FACE_NOT_VISIBLE: 'FACE_NOT_VISIBLE',
} as const;
export type KycRejectionReason = (typeof KycRejectionReason)[keyof typeof KycRejectionReason];

/** What a reviewer has to say they are doing before an Aadhaar can be revealed. */
export const AadhaarAccessPurpose = {
  IDENTITY_VERIFICATION: 'IDENTITY_VERIFICATION',
  DISPUTE_INVESTIGATION: 'DISPUTE_INVESTIGATION',
  PAYOUT_RECONCILIATION: 'PAYOUT_RECONCILIATION',
  REGULATORY_REQUEST: 'REGULATORY_REQUEST',
} as const;
export type AadhaarAccessPurpose =
  (typeof AadhaarAccessPurpose)[keyof typeof AadhaarAccessPurpose];

export interface KycSubmission {
  id: Id;
  workerId: Id;
  documentType: KycDocumentType;
  /** Scan or photograph of the document, for the reviewer's preview pane. */
  documentImageUrl: string;
  submittedAt: IsoDateTime;
  reviewedAt?: IsoDateTime;
  reviewedByAdminId?: Id;
  rejectionReason?: KycRejectionReason;
  rejectionNote?: string;
  /**
   * A REFERENCE KEY, never an Aadhaar number.
   *
   * No raw 12-digit Aadhaar number exists anywhere in this codebase — not in a
   * type, not in the seed, not in the store, not in a URL, not in a log. This
   * field is an opaque handle that an authorised reveal exchanges, server-side,
   * for a value shown briefly and never persisted. The only Aadhaar-shaped
   * string in the product is the masked display form `XXXX-XXXX-4567`.
   *
   * Hashing an Aadhaar number is also banned: a hash of a 12-digit space is
   * trivially reversible, so a hash is the number. Routes use UUIDs.
   */
  aadhaarRef?: string;
  /** Last four digits, the only part that may be stored or displayed. */
  aadhaarLast4?: string;
}

/**
 * One line of the Aadhaar access log.
 *
 * Written BEFORE any value is displayed, never after. This log is the
 * auditability proof an evaluator will ask for, so a reveal that fails to log
 * must fail to reveal.
 */
export interface AadhaarAccessLogEntry {
  id: Id;
  submissionId: Id;
  workerId: Id;
  adminId: Id;
  adminName: string;
  purpose: AadhaarAccessPurpose;
  accessedAt: IsoDateTime;
}
