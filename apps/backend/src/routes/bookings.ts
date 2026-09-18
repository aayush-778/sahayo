import { Router } from 'express';
import {
  bookingListQuerySchema,
  createBookingRequestSchema,
  paymentRequestSchema,
  transitionRequestSchema,
  type BookingListResult,
  type User,
} from '@sahayo/shared';
import { applyTransition, createBooking, recordPayment } from '../domain/booking-flow';
import { notFound, parse, route } from '../lib/http';
import * as bookings from '../repositories/bookings';
import * as users from '../repositories/users';
import type { RouteContext } from './index';

export function bookingsRouter({ dispatcher }: RouteContext): Router {
  const router = Router();

  /** POST /bookings — create a booking at the server's price, and start dispatching it. */
  router.post(
    '/',
    route(async (req, res) => {
      const body = parse(createBookingRequestSchema, req.body);
      res.status(201).json(await createBooking(body, dispatcher));
    }),
  );

  /** GET /bookings?role=CUSTOMER|WORKER&userId= — one person's bookings, newest first. */
  router.get(
    '/',
    route((req, res) => {
      const { role, userId } = parse(bookingListQuerySchema, req.query);
      const stored = role === 'WORKER' ? bookings.listForWorker(userId) : bookings.listForCustomer(userId);
      const customers = new Map<string, User>();
      for (const booking of stored) {
        const user = users.findById(booking.customerId);
        if (user) customers.set(user.id, user);
      }
      const result: BookingListResult = { records: stored.map(bookings.toRecord), customers: [...customers.values()] };
      res.json(result);
    }),
  );

  /** GET /bookings/:id */
  router.get(
    '/:id',
    route((req, res) => {
      const stored = bookings.findById(req.params.id!);
      if (!stored) throw notFound('booking', req.params.id!);
      res.json(bookings.toRecord(stored));
    }),
  );

  /** POST /bookings/:id/transitions — move a booking one step, checked against the state machine. */
  router.post(
    '/:id/transitions',
    route((req, res) => {
      const body = parse(transitionRequestSchema, req.body);
      res.json(applyTransition(req.params.id!, body, dispatcher));
    }),
  );

  /** POST /bookings/:id/payment — the customer pays for the finished job. */
  router.post(
    '/:id/payment',
    route((req, res) => {
      res.json(recordPayment(req.params.id!, parse(paymentRequestSchema, req.body)));
    }),
  );

  return router;
}
