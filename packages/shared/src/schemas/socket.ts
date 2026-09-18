import { z } from 'zod';
import type {
  GigAcceptPayload,
  GigDeclinePayload,
  WorkerLocationPayload,
  WorkerOfflinePayload,
  WorkerOnlinePayload,
} from '../events';
import { geoPointSchema, idSchema, isoDateTimeSchema } from './common';

/**
 * Client-to-server socket payloads. The gateway parses every event with one of these
 * before acting on it, exactly as the REST routes parse bodies.
 */

export const workerOnlinePayloadSchema = z.object({
  workerId: idSchema,
  serviceCategoryIds: z.array(idSchema),
  location: geoPointSchema,
}) satisfies z.ZodType<WorkerOnlinePayload>;

export const workerOfflinePayloadSchema = z.object({
  workerId: idSchema,
}) satisfies z.ZodType<WorkerOfflinePayload>;

export const workerLocationPayloadSchema = z.object({
  workerId: idSchema,
  location: geoPointSchema,
  heading: z.number().min(0).max(360).optional(),
  at: isoDateTimeSchema,
}) satisfies z.ZodType<WorkerLocationPayload>;

export const gigAcceptPayloadSchema = z.object({
  workerId: idSchema,
  bookingId: idSchema,
  offerId: idSchema,
  confirmOverlap: z.boolean().optional(),
}) satisfies z.ZodType<GigAcceptPayload>;

export const gigDeclinePayloadSchema = z.object({
  workerId: idSchema,
  bookingId: idSchema,
  offerId: idSchema,
  reason: z.string().max(200).optional(),
}) satisfies z.ZodType<GigDeclinePayload>;
