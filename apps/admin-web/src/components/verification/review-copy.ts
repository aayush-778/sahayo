import { KycDocumentType, KycRejectionReason, KycStatus } from '@sahayo/shared';
import type { StatusVariant } from '@/components/ui-kit/StatusPill';

export const DOCUMENT_LABEL: Record<string, string> = {
  [KycDocumentType.AADHAAR]: 'Aadhaar',
  [KycDocumentType.PAN]: 'PAN card',
  [KycDocumentType.DRIVING_LICENCE]: 'Driving licence',
};

/**
 * The queue's four states.
 *
 * "Submitted" is a worker who has a document on file but whose record was never
 * moved into review; "Pending" is one waiting in the review queue. Both need a
 * decision, and the queue shows both.
 */
export const QUEUE_STATUS: Record<string, { label: string; pill: StatusVariant }> = {
  [KycStatus.PENDING]: { label: 'Pending', pill: 'pending' },
  [KycStatus.UNSUBMITTED]: { label: 'Submitted', pill: 'offline' },
  [KycStatus.VERIFIED]: { label: 'Verified', pill: 'verified' },
  [KycStatus.REJECTED]: { label: 'Rejected', pill: 'rejected' },
};

/**
 * Each rejection reason: what the reviewer picks, and what the worker is told.
 *
 * The message is written to the worker, not about them. It says what was wrong and
 * exactly what to do next, because a rejection is the difference between someone
 * earning this week and not, and "Document rejected" gives them nothing to act on.
 * The reject dialog previews it word for word.
 */
export const REJECTION_REASONS: Record<
  KycRejectionReason,
  { label: string; message: (documentLabel: string) => string }
> = {
  [KycRejectionReason.BLURRY_IMAGE]: {
    label: 'Blurry image',
    message: (doc) =>
      `The photo of your ${doc} was too blurry to read. Take it again in good light, holding the phone steady, with the whole document in the frame.`,
  },
  [KycRejectionReason.NAME_MISMATCH]: {
    label: 'Name mismatch',
    message: (doc) =>
      `The name on your ${doc} does not match the name on your Sahayo account. Upload a document in the same name, or ask us to correct your account name.`,
  },
  [KycRejectionReason.DOCUMENT_EXPIRED]: {
    label: 'Document expired',
    message: (doc) =>
      `Your ${doc} has expired. Upload one that is still valid and we will review it again.`,
  },
  [KycRejectionReason.WRONG_DOCUMENT_TYPE]: {
    label: 'Wrong document type',
    message: (doc) =>
      `The file you uploaded is not a ${doc}. Upload a photo of your Aadhaar, PAN card or driving licence.`,
  },
  [KycRejectionReason.FACE_NOT_VISIBLE]: {
    label: 'Face not visible',
    message: (doc) =>
      `We could not see the photo on your ${doc} clearly. Take the picture again without glare or fingers covering the face.`,
  },
};
