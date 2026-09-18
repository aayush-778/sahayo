import { Router } from 'express';
import type { Dispatcher } from '../dispatch/dispatcher';
import { adminRouter } from './admin';
import { authRouter } from './auth';
import { bookingsRouter } from './bookings';
import { coopRouter } from './coop';
import { earningsRouter } from './earnings';
import { pricingRouter } from './pricing';
import { servicesRouter } from './services';
import { workersRouter } from './workers';

export interface RouteContext {
  dispatcher: Dispatcher;
}

export function createApiRouter(context: RouteContext): Router {
  const api = Router();

  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  api.use('/auth', authRouter());
  api.use('/services', servicesRouter());
  api.use('/bookings', bookingsRouter(context));
  api.use('/pricing', pricingRouter());
  api.use('/workers', workersRouter());
  api.use('/earnings', earningsRouter());
  api.use('/coop', coopRouter());
  api.use('/admin', adminRouter(context));

  return api;
}
