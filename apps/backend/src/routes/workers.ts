import { Router } from 'express';
import { notImplemented } from './not-implemented';

export const workersRouter: Router = Router();

// Pathless: matches every method and path under the mount point.
workersRouter.use(notImplemented('workers'));
