/**
 * The demo cast: the named people, places and hand-written bookings the mobile apps
 * are demonstrated with.
 *
 * Importable as `@sahayo/shared/seed/cast` without loading the seed's generator, so
 * the mobile apps read their mocks from here at no cost. The canonical seed in
 * `./index.ts` lays the same records over its generated dataset — see `./cast-overlay.ts`.
 */
export { createAnchoredClock, createDeviceClock, type CastClock } from './demo-cast/clock';
export { castPlaces } from './demo-cast/places';
export { splitFare } from './demo-cast/fare';
export { castCustomers, demoCustomer, workerAppCustomers } from './demo-cast/customers';
export { castWorkers, customerAppWorkers, demoPartner, type CastWorker } from './demo-cast/workers';
export {
  buildCustomerCastBookings,
  buildWorkerCastBookings,
  type CustomerCastBookings,
} from './demo-cast/bookings';
