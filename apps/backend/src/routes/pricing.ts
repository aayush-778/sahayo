import { Router } from 'express';
import { quoteRequestSchema } from '@sahayo/shared';
import { quote } from '../domain/booking-flow';
import { parse, route } from '../lib/http';

/** POST /pricing/quote — what a job would cost here, now or ahead of time, with its reasons. */
export function pricingRouter(): Router {
  const router = Router();
  router.post(
    '/quote',
    route(async (req, res) => {
      res.json(await quote(parse(quoteRequestSchema, req.body)));
    }),
  );
  return router;
}
