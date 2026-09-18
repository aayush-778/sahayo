import { Router } from 'express';
import { route } from '../lib/http';
import * as catalogue from '../repositories/catalogue';

/** GET /services — the catalogue: worker types, their sub-categories, and every priced item. */
export function servicesRouter(): Router {
  const router = Router();
  router.get(
    '/',
    route((_req, res) => {
      res.json(catalogue.listServices());
    }),
  );
  return router;
}
