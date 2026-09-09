import { Router } from 'express';
import { notImplemented } from './not-implemented';

export const ledgerRouter: Router = Router();

// Pathless: matches every method and path under the mount point.
ledgerRouter.use(notImplemented('ledger'));
