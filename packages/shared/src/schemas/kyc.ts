import { z } from 'zod';
import {
  AadhaarAccessPurpose,
  KycDocumentType,
  KycRejectionReason,
  type AadhaarAccessLogEntry,
  type KycSubmission,
} from '../types/kyc';
import { idSchema, isoDateTimeSchema } from './common';

export const kycDocumentTypeSchema = z.nativeEnum(KycDocumentType);
export const kycRejectionReasonSchema = z.nativeEnum(KycRejectionReason);
export const aadhaarAccessPurposeSchema = z.nativeEnum(AadhaarAccessPurpose);

export const kycSubmissionSchema = z.object({
  id: idSchema,
  workerId: idSchema,
  documentType: kycDocumentTypeSchema,
  documentImageUrl: z.string().url(),
  submittedAt: isoDateTimeSchema,
  reviewedAt: isoDateTimeSchema.optional(),
  reviewedByAdminId: idSchema.optional(),
  rejectionReason: kycRejectionReasonSchema.optional(),
  rejectionNote: z.string().max(500).optional(),
  /*
   * An opaque reference key, and the schema enforces that it cannot be an
   * Aadhaar number: the prefix is required and the tail is not 12 digits. A
   * validation failure here is the last line of defence if a seed or a future
   * integration ever tries to put a real number in this field.
   */
  aadhaarRef: z
    .string()
    .regex(/^aref_[A-Za-z0-9]{20}$/, 'must be an opaque reference, never an Aadhaar number')
    .optional(),
  /* The only digits of an Aadhaar that may be stored or shown. */
  aadhaarLast4: z.string().regex(/^\d{4}$/).optional(),
}) satisfies z.ZodType<KycSubmission>;

export const aadhaarAccessLogEntrySchema = z.object({
  id: idSchema,
  submissionId: idSchema,
  workerId: idSchema,
  adminId: idSchema,
  adminName: z.string().min(1),
  purpose: aadhaarAccessPurposeSchema,
  accessedAt: isoDateTimeSchema,
}) satisfies z.ZodType<AadhaarAccessLogEntry>;
