import { z } from 'zod';
import {
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  type LedgerEntry,
  type LedgerParty,
  type SplitSummary,
} from '../types/ledger';
import { idSchema, isoDateTimeSchema, paiseSchema } from './common';

export const ledgerEntryTypeSchema = z.nativeEnum(LedgerEntryType);
export const ledgerAccountSchema = z.nativeEnum(LedgerAccount);
export const ledgerDirectionSchema = z.nativeEnum(LedgerDirection);

export const ledgerEntrySchema = z.object({
  id: idSchema,
  type: ledgerEntryTypeSchema,
  account: ledgerAccountSchema,
  direction: ledgerDirectionSchema,
  amount: paiseSchema,
  subjectId: idSchema.optional(),
  bookingId: idSchema.optional(),
  cooperativeId: idSchema.optional(),
  description: z.string().max(500).optional(),
  referenceKey: z.string().min(1).max(200).optional(),
  traceId: z.string().regex(/^tr_[A-Za-z0-9]{16}$/).optional(),
  reversalOf: idSchema.optional(),
  createdAt: isoDateTimeSchema,
}) satisfies z.ZodType<LedgerEntry>;

export const ledgerPartySchema = z.object({
  account: ledgerAccountSchema,
  name: z.string().min(1).optional(),
}) satisfies z.ZodType<LedgerParty>;

export const splitSummarySchema = z.object({
  gross: paiseSchema,
  worker: paiseSchema,
  platform: paiseSchema,
  coopFund: paiseSchema,
  bookingCount: z.number().int().nonnegative(),
}) satisfies z.ZodType<SplitSummary>;
