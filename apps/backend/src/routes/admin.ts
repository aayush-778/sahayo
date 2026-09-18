import { Router } from 'express';
import {
  BookingStatus,
  kycDecisionRequestSchema,
  type AdminLiveSnapshot,
  type AdminOverview,
  type KycQueueEntry,
} from '@sahayo/shared';
import { decideKyc } from '../domain/booking-flow';
import { resetForDemo } from '../domain/demo';
import { env } from '../config/env';
import { HttpError, notFound, parse, route } from '../lib/http';
import * as bookings from '../repositories/bookings';
import * as ledger from '../repositories/ledger';
import * as system from '../repositories/system';
import * as users from '../repositories/users';
import * as workers from '../repositories/workers';
import { connectedWorkerCount } from '../sockets/realtime';
import type { RouteContext } from './index';

const LIVE = new Set<string>([BookingStatus.REQUESTED, BookingStatus.BROADCAST, BookingStatus.ACCEPTED, BookingStatus.EN_ROUTE, BookingStatus.ARRIVED, BookingStatus.IN_PROGRESS]);
const FINISHED = new Set<string>([BookingStatus.COMPLETED, BookingStatus.SETTLED]);

/** GET /admin/overview — the dashboard's headline figures, from the live state. */
export function adminRouter({ dispatcher }: RouteContext): Router {
  const router = Router();

  /**
   * POST /admin/demo/reset — the board back to its starting position between runs of the
   * demo: state re-seeded, dispatches in flight dropped, the demo's members standing in
   * their fixed places. Run it with the apps closed; a phone holding bookings the server
   * has just forgotten is worse than a stale total.
   */
  router.post(
    '/demo/reset',
    route((_req, res) => {
      if (env.NODE_ENV === 'production') throw new HttpError(403, 'NOT_IN_PRODUCTION', 'The demo reset only exists outside production.');
      res.json(resetForDemo(dispatcher));
    }),
  );

  /**
   * GET /admin/live — everything that has changed since the server booted. The portal
   * already builds the seeded dataset itself; this is the difference it applies on top.
   */
  router.get(
    '/live',
    route((_req, res) => {
      const snapshot: AdminLiveSnapshot = {
        ...system.clock(),
        workers: workers.liveFields(),
        bookings: bookings.changedSinceBoot().map(bookings.toAdminBooking),
        ledgerEntries: ledger.appendedSinceBoot(),
        broadcasts: dispatcher.allRecords(),
        fundBalance: ledger.coopFundTotal(),
      };
      res.json(snapshot);
    }),
  );

  /** GET /admin/bookings/:id — one booking in the portal's row shape, with its history. */
  router.get(
    '/bookings/:id',
    route((req, res) => {
      const stored = bookings.findById(req.params.id!);
      if (!stored) throw notFound('booking', req.params.id!);
      res.json(bookings.toAdminBooking(stored));
    }),
  );

  /** GET /admin/broadcasts/:bookingId — how a dispatch went: every round, and who took it. */
  router.get(
    '/broadcasts/:bookingId',
    route((req, res) => {
      const record = dispatcher.record(req.params.bookingId!);
      if (!record) throw notFound('dispatch record for booking', req.params.bookingId!);
      res.json(record);
    }),
  );

  /** POST /admin/workers/:id/kyc — approve or reject a member's verification. */
  router.post(
    '/workers/:id/kyc',
    route((req, res) => {
      res.json(decideKyc(req.params.id!, parse(kycDecisionRequestSchema, req.body)));
    }),
  );

  /** GET /admin/kyc/queue — members waiting for verification, in queue order. */
  router.get(
    '/kyc/queue',
    route((_req, res) => {
      const queue: KycQueueEntry[] = workers.kycQueue().map((worker) => ({
        workerId: worker.id,
        name: worker.name,
        phone: users.userForWorker(worker.id)?.phone ?? worker.phone,
        category: worker.category,
      }));
      res.json(queue);
    }),
  );

  router.get(
    '/overview',
    route((_req, res) => {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const since = startOfDay.toISOString();

      const all = bookings.list();
      const everyone = workers.list();
      const today = all.filter((booking) => booking.createdAt >= since);
      const finishedToday = all.filter((booking) => FINISHED.has(booking.status) && (booking.completedAt ?? '') >= since);

      const overview: AdminOverview = {
        now: now.toISOString(),
        workers: {
          total: everyone.length,
          online: everyone.filter((worker) => worker.isOnline).length,
          onJob: everyone.filter((worker) => worker.isOnJob).length,
          connected: connectedWorkerCount(),
        },
        bookings: {
          today: today.length,
          live: all.filter((booking) => LIVE.has(booking.status)).length,
          broadcasting: all.filter((booking) => booking.status === BookingStatus.BROADCAST).length,
          completedToday: finishedToday.length,
        },
        money: {
          grossToday: finishedToday.reduce((sum, booking) => sum + booking.amount, 0),
          fundBalance: ledger.coopFundTotal(),
          fundToday: ledger.fundContributionsSince(since),
        },
      };
      res.json(overview);
    }),
  );

  return router;
}
