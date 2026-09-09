import { Router } from 'express';
import { notImplemented } from './not-implemented';

export const authRouter: Router = Router();

// Pathless: matches every method and path under the mount point.
authRouter.use(notImplemented('auth'));
