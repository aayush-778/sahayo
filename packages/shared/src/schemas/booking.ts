import { z } from 'zod';
import {
  BookingStatus,
  type Booking,
  type BookingAddress,
  type BookingFare,
} from '../types/booking';
import { geoPointSchema, idSchema, isoDateTimeSchema, paiseSchema } from './common';

export const bookingStatusSchema = z.nativeEnum(BookingStatus);

export const bookingAddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'must be a 6-digit Indian PIN code'),
  point: geoPointSchema,
}) satisfies z.ZodType<BookingAddress>;

export const bookingFareSchema = z.object({
  total: paiseSchema,
  workerShare: paiseSchema,
  platformShare: paiseSchema,
  coopFundShare: paiseSchema,
}) satisfies z.ZodType<BookingFare>;

export const bookingSchema = z.object({
  id: idSchema,
  customerId: idSchema,
  workerId: idSchema.optional(),
  serviceCategoryId: idSchema,
  status: bookingStatusSchema,
  address: bookingAddressSchema,
  notes: z.string().max(1000).optional(),
  scheduledFor: isoDateTimeSchema.optional(),
  fare: bookingFareSchema.optional(),
  cancellationReason: z.string().max(500).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
}) satisfies z.ZodType<Booking>;
