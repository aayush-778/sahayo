import { Router } from 'express';
import { authRouter } from './auth';
import { bookingsRouter } from './bookings';
import { workersRouter } from './workers';
import { ledgerRouter } from './ledger';

export const apiRouter: Router = Router();

/** The only route that actually does anything in Phase 1. */
apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/bookings', bookingsRouter);
apiRouter.use('/workers', workersRouter);
apiRouter.use('/ledger', ledgerRouter);
