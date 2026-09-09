import { z } from 'zod';
import { UserRole, type User } from '../types/user';
import { idSchema, isoDateTimeSchema } from './common';

export const userRoleSchema = z.nativeEnum(UserRole);

/** E.164, which is what we will get back from the OTP provider. */
export const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, 'must be an E.164 phone number');

export const userSchema = z.object({
  id: idSchema,
  phone: phoneSchema,
  name: z.string().min(1).max(120),
  email: z.string().email().optional(),
  role: userRoleSchema,
  avatarUrl: z.string().url().optional(),
  locale: z.string().min(2).max(10).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
}) satisfies z.ZodType<User>;
