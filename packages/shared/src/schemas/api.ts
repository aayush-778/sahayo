import { z } from 'zod';
import type {
  KycDecisionRequest,
  PaymentRequest,
  CreateBookingRequest,
  LoginRequest,
  QuoteRequest,
  TransitionRequest,
  VoteRequest,
} from '../types/api';
import { bookingActorSchema, bookingAddressSchema, bookingStatusSchema } from './booking';
import { geoPointSchema, idSchema, isoDateTimeSchema } from './common';

/** Request bodies. The backend parses every body with one of these; nothing is validated by hand. */

export const loginRequestSchema = z.object({
  phone: z.string().regex(/^[+\d\s-]{10,16}$/, 'must be a mobile number, like 94310 67203'),
}) satisfies z.ZodType<LoginRequest>;

export const quoteRequestSchema = z.object({
  serviceItemId: idSchema,
  point: geoPointSchema,
  scheduledFor: isoDateTimeSchema.optional(),
}) satisfies z.ZodType<QuoteRequest>;

export const createBookingRequestSchema = z.object({
  customerId: idSchema,
  serviceItemId: idSchema,
  address: bookingAddressSchema,
  notes: z.string().max(1000).optional(),
  scheduledFor: isoDateTimeSchema.optional(),
}) satisfies z.ZodType<CreateBookingRequest>;

export const transitionRequestSchema = z.object({
  to: bookingStatusSchema,
  actor: bookingActorSchema,
  startCode: z.string().regex(/^\d{4}$/, 'must be the four digits the customer reads out').optional(),
  reason: z.string().min(1).max(500).optional(),
}) satisfies z.ZodType<TransitionRequest>;

export const voteRequestSchema = z.object({
  workerId: idSchema,
  direction: z.enum(['FOR', 'AGAINST']),
}) satisfies z.ZodType<VoteRequest>;

export const paymentRequestSchema = z.object({
  customerId: idSchema,
  method: z.enum(['upi', 'card', 'wallet', 'cash']),
  transactionId: z.string().min(1).max(64).optional(),
}) satisfies z.ZodType<PaymentRequest>;

export const kycDecisionRequestSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  adminId: idSchema,
  reason: z.string().min(1).max(500).optional(),
}) satisfies z.ZodType<KycDecisionRequest>;

/** Query strings. */
export const bookingListQuerySchema = z.object({
  role: z.enum(['CUSTOMER', 'WORKER']),
  userId: idSchema,
});
