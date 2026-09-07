import { z } from 'zod';
import { KycStatus, WorkerAvailability, type WorkerProfile } from '../types/worker';
import { geoPointSchema, idSchema, isoDateTimeSchema } from './common';

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
