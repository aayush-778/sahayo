import { z } from 'zod';
import {
  BookingEventKind,
  BookingStatus,
  type AdminBooking,
  type Booking,
  type BookingActor,
  type BookingAddress,
  type BookingEvent,
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

export const bookingEventKindSchema = z.nativeEnum(BookingEventKind);

export const bookingActorSchema = z.object({
  role: z.enum(['CUSTOMER', 'WORKER', 'ADMIN', 'SYSTEM']),
  id: idSchema.optional(),
}) satisfies z.ZodType<BookingActor>;

export const bookingEventSchema = z.object({
  id: idSchema,
  kind: bookingEventKindSchema,
  at: isoDateTimeSchema,
  actor: bookingActorSchema.optional(),
  status: bookingStatusSchema.optional(),
  detail: z.string().min(1).max(300),
  workersPinged: z.number().int().nonnegative().optional(),
  equityRank: z.number().int().positive().optional(),
  disputed: z.boolean().optional(),
}) satisfies z.ZodType<BookingEvent>;

export const adminBookingSchema = z.object({
  id: idSchema,
  reference: z.string().regex(/^BKG-\d{5}$/),
  customerId: idSchema,
  customerName: z.string().min(1),
  workerId: idSchema.optional(),
  workerName: z.string().min(1).optional(),
  category: z.string().min(1),
  zoneId: idSchema,
  location: geoPointSchema,
  status: bookingStatusSchema,
  amount: paiseSchema,
  createdAt: isoDateTimeSchema,
  acceptedAt: isoDateTimeSchema.optional(),
  completedAt: isoDateTimeSchema.optional(),
  timeline: z.array(bookingEventSchema),
}) satisfies z.ZodType<AdminBooking>;
