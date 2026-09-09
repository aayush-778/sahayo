import { Router } from 'express';
import { notImplemented } from './not-implemented';

export const bookingsRouter: Router = Router();

// Pathless: matches every method and path under the mount point.
bookingsRouter.use(notImplemented('bookings'));
