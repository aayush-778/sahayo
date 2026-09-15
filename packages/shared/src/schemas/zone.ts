import { z } from 'zod';
import type { Zone, ZoneDemand } from '../types/zone';
import { geoPointSchema, idSchema } from './common';

export const zoneSchema = z.object({
  id: idSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  centroid: geoPointSchema,
  bounds: z.object({
    south: z.number(),
    west: z.number(),
    north: z.number(),
    east: z.number(),
  }),
}) satisfies z.ZodType<Zone>;

export const zoneDemandSchema = z.object({
  zoneId: idSchema,
  orderCount: z.number().int().nonnegative(),
  workerCount: z.number().int().nonnegative(),
  avgWaitMinutes: z.number().nonnegative(),
  demandIndex: z.number().min(0).max(1),
}) satisfies z.ZodType<ZoneDemand>;
