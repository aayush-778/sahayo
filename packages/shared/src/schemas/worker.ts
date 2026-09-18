import { z } from 'zod';
import {
  KycStatus,
  WorkerAvailability,
  WorkerCategory,
  type AdminWorker,
  type EquityScoreInputs,
  type WorkerProfile,
} from '../types/worker';
import { geoPointSchema, idSchema, isoDateTimeSchema, paiseSchema } from './common';

export const kycStatusSchema = z.nativeEnum(KycStatus);
export const workerAvailabilitySchema = z.nativeEnum(WorkerAvailability);

export const workerProfileSchema = z.object({
  id: idSchema,
  userId: idSchema,
  cooperativeId: idSchema.optional(),
  serviceCategoryIds: z.array(idSchema),
  kycStatus: kycStatusSchema,
  availability: workerAvailabilitySchema,
  lastLocation: geoPointSchema.optional(),
  lastLocationAt: isoDateTimeSchema.optional(),
  serviceRadiusM: z.number().int().positive().optional(),
  ratingAvg: z.number().min(0).max(5),
  ratingCount: z.number().int().nonnegative(),
  completedJobs: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
}) satisfies z.ZodType<WorkerProfile>;

export const workerCategorySchema = z.nativeEnum(WorkerCategory);

export const equityScoreInputsSchema = z.object({
  proximity: z.number().min(0).max(1),
  rating: z.number().min(0).max(1),
  inverseAllocation: z.number().min(0).max(1),
}) satisfies z.ZodType<EquityScoreInputs>;

export const adminWorkerSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  avatarUrl: z.string().url(),
  category: workerCategorySchema,
  serviceCategoryIds: z.array(idSchema).min(1),
  zoneId: idSchema,
  location: geoPointSchema,
  phone: z.string().regex(/^\+91 \d{5} \d{5}$/, 'Expected "+91 XXXXX XXXXX"'),
  rating: z.number().min(0).max(5),
  ratingCount: z.number().int().nonnegative(),
  kycStatus: kycStatusSchema,
  isOnline: z.boolean(),
  isOnJob: z.boolean(),
  jobsThisWeek: z.number().int().nonnegative(),
  lifetimeJobs: z.number().int().nonnegative(),
  walletBalance: paiseSchema,
  fundContributed: paiseSchema,
  lifetimeEarnings: paiseSchema,
  joinedAt: isoDateTimeSchema,
  equityScore: z.number().min(0).max(1),
  equityInputs: equityScoreInputsSchema,
  weeklyJobHistory: z.array(z.number().int().nonnegative()).length(12),
  completionRate: z.number().min(0).max(1),
}) satisfies z.ZodType<AdminWorker>;
