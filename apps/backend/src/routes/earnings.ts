import { Router } from 'express';
import { LedgerEntryType, type User, type WorkerEarnings } from '@sahayo/shared';
import { notFound, route } from '../lib/http';
import * as bookings from '../repositories/bookings';
import * as ledger from '../repositories/ledger';
import * as users from '../repositories/users';
import * as workers from '../repositories/workers';

/** GET /earnings/:workerId — a worker's payouts, the transfers that paid them out, and their fund contribution. */
export function earningsRouter(): Router {
  const router = Router();

  router.get(
    '/:workerId',
    route((req, res) => {
      const workerId = req.params.workerId!;
      if (!workers.findById(workerId)) throw notFound('worker', workerId);

      const rows = ledger.entriesForWorker(workerId).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      const payouts = rows.filter((row) => row.type === LedgerEntryType.WORKER_PAYOUT);
      const releases = rows.filter((row) => row.type === LedgerEntryType.PAYOUT_RELEASE);

      const bookingFacts: WorkerEarnings['bookingFacts'] = {};
      const customers = new Map<string, User>();
      for (const payout of payouts) {
        const booking = payout.bookingId ? bookings.findById(payout.bookingId) : undefined;
        if (!booking) continue;
        bookingFacts[booking.id] = { serviceCategoryId: booking.serviceCategoryId, customerId: booking.customerId };
        const customer = users.findById(booking.customerId);
        if (customer) customers.set(customer.id, customer);
      }

      const result: WorkerEarnings = {
        workerId,
        balance: ledger.balanceForWorker(workerId),
        fundContributed: ledger.fundContributedBy(workerId),
        payouts,
        releases,
        bookingFacts,
        customers: [...customers.values()],
      };
      res.json(result);
    }),
  );

  return router;
}
