import { z } from 'zod';
import {
  CustomerSegment,
  CustomerStatus,
  CustomerType,
  type AdminCustomer,
  type CustomerSuspension,
} from '../types/customer';
import { idSchema, isoDateTimeSchema } from './common';

export const customerTypeSchema = z.nativeEnum(CustomerType);
export const customerStatusSchema = z.nativeEnum(CustomerStatus);
export const customerSegmentSchema = z.nativeEnum(CustomerSegment);

export const customerSuspensionSchema = z.object({
  reason: z.string().trim().min(1),
  suspendedAt: isoDateTimeSchema,
  adminId: idSchema,
  adminName: z.string().min(1),
}) satisfies z.ZodType<CustomerSuspension>;

export const adminCustomerSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  phone: z.string().regex(/^\+91 \d{5} \d{5}$/),
  email: z.string().email().optional(),
  type: customerTypeSchema,
  businessName: z.string().min(1).optional(),
  zoneId: idSchema,
  address: z.string().min(1),
  joinedAt: isoDateTimeSchema,
  status: customerStatusSchema,
  suspension: customerSuspensionSchema.optional(),
}) satisfies z.ZodType<AdminCustomer>;
