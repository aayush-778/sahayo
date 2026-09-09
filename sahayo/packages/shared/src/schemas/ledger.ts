import { z } from 'zod';
import {
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  type LedgerEntry,
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
  createdAt: isoDateTimeSchema,
}) satisfies z.ZodType<LedgerEntry>;
