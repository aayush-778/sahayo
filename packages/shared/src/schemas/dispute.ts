import { z } from 'zod';
import {
  DisputeAuthor,
  DisputeOrigin,
  DisputeOutcome,
  DisputeStatus,
  type Dispute,
  type DisputeEscalation,
  type DisputeMessage,
  type DisputeResolution,
} from '../types/dispute';
import { idSchema, isoDateTimeSchema, paiseSchema } from './common';

export const disputeOriginSchema = z.nativeEnum(DisputeOrigin);
export const disputeStatusSchema = z.nativeEnum(DisputeStatus);
export const disputeOutcomeSchema = z.nativeEnum(DisputeOutcome);
export const disputeAuthorSchema = z.nativeEnum(DisputeAuthor);

export const disputeMessageSchema = z.object({
  id: idSchema,
  author: disputeAuthorSchema,
  authorName: z.string().min(1),
  body: z.string().min(1).max(2000),
  internal: z.boolean(),
  createdAt: isoDateTimeSchema,
}) satisfies z.ZodType<DisputeMessage>;

export const disputeResolutionSchema = z.object({
  outcome: disputeOutcomeSchema,
  refundAmount: paiseSchema.optional(),
  note: z.string().min(1).max(1000),
  resolvedAt: isoDateTimeSchema,
  resolvedByAdminId: idSchema,
  ledgerEntryIds: z.array(idSchema),
}) satisfies z.ZodType<DisputeResolution>;

export const disputeEscalationSchema = z.object({
  referenceNumber: z.string().min(1),
  escalatedAt: isoDateTimeSchema,
  escalatedByAdminId: idSchema,
}) satisfies z.ZodType<DisputeEscalation>;

export const disputeSchema = z.object({
  id: idSchema,
  reference: z.string().regex(/^DSP-\d{4}$/),
  bookingId: idSchema,
  raisedBy: disputeOriginSchema,
  status: disputeStatusSchema,
  subject: z.string().min(1).max(200),
  amountInDispute: paiseSchema,
  customerId: idSchema,
  customerName: z.string().min(1),
  workerId: idSchema,
  workerName: z.string().min(1),
  messages: z.array(disputeMessageSchema),
  resolution: disputeResolutionSchema.optional(),
  escalation: disputeEscalationSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
}) satisfies z.ZodType<Dispute>;
