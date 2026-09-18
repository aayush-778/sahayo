import { Router } from 'express';
import { notFound, route } from '../lib/http';
import * as workers from '../repositories/workers';

/** GET /workers/:id — one member, as the admin portal's directory shows them. */
export function workersRouter(): Router {
  const router = Router();

  router.get(
    '/:id',
    route((req, res) => {
      const worker = workers.findById(req.params.id!);
      if (!worker) throw notFound('worker', req.params.id!);
      res.json(worker);
    }),
  );

  return router;
}
