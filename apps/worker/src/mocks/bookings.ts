import type { Booking } from '@sahayo/shared';
import { buildWorkerCastBookings, createDeviceClock } from '@sahayo/shared/seed/cast';

/**
 * Fifteen of this worker's bookings, across every tab.
 *
 *   pending    4  ACCEPTED ×2, EN_ROUTE, IN_PROGRESS
 *   completed  8  COMPLETED ×3 (earned, not yet paid out), SETTLED ×5
 *   cancelled  3  shown under All only
 *
 * `fare` is set on every booking the worker agreed to, not only on settled
 * ones: a worker accepts a job at a price, and the booking list is where they
 * check what that price was.
 *
 * Written once, in the demo cast in @sahayo/shared, against a clock: here the
 * device's, and in the backend's seed the dataset's fixed instant.
 */
export const mockBookings: Booking[] = buildWorkerCastBookings(createDeviceClock(Date.now));
