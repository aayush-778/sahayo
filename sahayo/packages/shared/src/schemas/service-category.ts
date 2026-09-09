import { z } from 'zod';
import type { ServiceCategory } from '../types/service-category';
import { idSchema, paiseSchema } from './common';

export const serviceCategorySchema = z.object({
  id: idSchema,
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'must be lowercase kebab-case'),
  name: z.string().min(1).max(120),
  nameLocalized: z.record(z.string(), z.string()).optional(),
  description: z.string().max(1000).optional(),
  iconKey: z.string().min(1).optional(),
  baseFare: paiseSchema,
  estimatedDurationMin: z.number().int().positive(),
  active: z.boolean(),
}) satisfies z.ZodType<ServiceCategory>;
