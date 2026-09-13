import { z } from 'zod';
import type {
  DispatchSettings,
  EquityWeightSettings,
  PlatformDetails,
  PlatformSettings,
  RevenueSplitSettings,
  SettingsChange,
  TeamMember,
} from '../types/settings';
import { idSchema, isoDateTimeSchema } from './common';

const percentSchema = z.number().int().min(0).max(100);
const clockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const revenueSplitSettingsSchema = z
  .object({
    workerPercent: percentSchema,
    platformPercent: percentSchema,
    fundPercent: percentSchema,
  })
  .refine((split) => split.workerPercent + split.platformPercent + split.fundPercent === 100, {
    message: 'The worker, platform and fund shares must add up to 100%.',
  }) satisfies z.ZodType<RevenueSplitSettings>;

export const equityWeightSettingsSchema = z
  .object({
    proximityPercent: percentSchema,
    ratingPercent: percentSchema,
    inverseAllocationPercent: percentSchema,
  })
  .refine(
    (weights) => weights.proximityPercent + weights.ratingPercent + weights.inverseAllocationPercent === 100,
    { message: 'The three dispatch weights must add up to 100%.' },
  ) satisfies z.ZodType<EquityWeightSettings>;

export const dispatchSettingsSchema = z.object({
  broadcastRadiusKm: z.number().min(1).max(15),
  pingTimeoutSeconds: z.number().int().min(10).max(120),
  weights: equityWeightSettingsSchema,
}) satisfies z.ZodType<DispatchSettings>;

export const platformDetailsSchema = z.object({
  cooperativeName: z.string().trim().min(3),
  registrationNumber: z.string().trim().min(3),
  registeredOffice: z.string().trim().min(3),
  supportPhone: z.string().regex(/^\+91 \d{5} \d{5}$/),
  supportEmail: z.string().email(),
  serviceHoursStart: clockSchema,
  serviceHoursEnd: clockSchema,
}) satisfies z.ZodType<PlatformDetails>;

export const platformSettingsSchema = z.object({
  platform: platformDetailsSchema,
  dispatch: dispatchSettingsSchema,
  split: revenueSplitSettingsSchema,
}) satisfies z.ZodType<PlatformSettings>;

export const settingsChangeSchema = z.object({
  id: idSchema,
  section: z.enum(['PLATFORM', 'DISPATCH', 'PAYMENTS']),
  summary: z.string().min(1),
  before: z.string(),
  after: z.string(),
  adminId: idSchema,
  adminName: z.string().min(1),
  changedAt: isoDateTimeSchema,
}) satisfies z.ZodType<SettingsChange>;

export const teamMemberSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.string().email(),
  permissions: z.string().min(1),
  joinedAt: isoDateTimeSchema,
}) satisfies z.ZodType<TeamMember>;
