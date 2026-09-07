import { z } from 'zod';
import type { GeoPoint } from '../types/common';

export const idSchema = z.string().min(1);

export const isoDateTimeSchema = z.string().datetime();

/** Money in paise: integer, never negative, never a float. */
export const paiseSchema = z.number().int().nonnegative();

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
}) satisfies z.ZodType<GeoPoint>;
