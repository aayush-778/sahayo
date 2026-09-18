import { COOP_FUND_SHARE, PLATFORM_SHARE, WORKER_SHARE, type Booking } from '@sahayo/shared';
import {
  buildCustomerCastBookings,
  castPlaces,
  createDeviceClock,
  demoCustomer,
} from '@sahayo/shared/seed/cast';

/**
 * The demo customer's bookings: two in flight, one scheduled, three finished and
 * one called off.
 *
 * The records are the demo cast's, in @sahayo/shared, built against this device's
 * clock — the backend's seed places the same records, under the same ids, at the
 * dataset's fixed instant. `fare` is deliberately absent on the live ones: it is
 * computed at settlement, and inventing a settled split for a job that has not
 * happened would teach the UI to trust a number the backend will not send.
 *
 * Every split is exact integer paise: worker 90%, platform 5%, cooperative fund
 * 5%, summing to `total` with nothing lost to rounding. The assertion at the
 * bottom of this file enforces that.
 */

/** The signed-in demo customer. Exported so a booking created at payment
 *  time carries the same identity as the seeded history. */
export const CUSTOMER_ID = demoCustomer.id;

/** The customer's default service address, matching `mocks/location.ts`. */
export const RAJENDRA_NAGAR = castPlaces.demoCustomerHome;

const cast = buildCustomerCastBookings(createDeviceClock(Date.now));

/** In flight right now — these are what `track/[bookingId]` renders. */
export const liveBookings: Booking[] = cast.live;

/** Accepted, but not today. These fill the Upcoming tab. */
export const scheduledBookings: Booking[] = cast.scheduled;

/** Finished work. Two settled, one completed and awaiting settlement. */
export const pastBookings: Booking[] = cast.past;

/** Called off. One row, so the Past tab has a status chip worth reading. */
export const cancelledBookings: Booking[] = cast.cancelled;

export const mockBookings: Booking[] = [
  ...liveBookings,
  ...scheduledBookings,
  ...pastBookings,
  ...cancelledBookings,
];

/**
 * Minutes until the worker arrives, or until the job is done.
 *
 * Not a field on `Booking` in @sahayo/shared, and deliberately so: an ETA is
 * derived from the worker's live position, not stored against the booking.
 * Phase 5 computes it server-side and pushes it over the socket; until then
 * it is a lookup beside the mocks, the same arrangement as `distanceM` on
 * workers.
 */
export const etaMinutesByBookingId: Record<string, number> = {
  bkg_live_ac: 12,
  bkg_live_bathroom: 35,
};

/**
 * How each seeded booking was paid for.
 *
 * An index rather than a field on `Booking`, for the same reason every other
 * relationship in this mock layer is an index: `Booking` comes from
 * @sahayo/shared and `satisfies Booking[]` rejects any property the contract
 * does not define. Adding one here to make a demo easier would be exactly the
 * drift the `satisfies` guard exists to catch.
 *
 * `bkg_live_bathroom` is the cash row. It is IN_PROGRESS, so it is one status
 * step away from COMPLETED — which is when the track screen offers to settle
 * it. That is the shortest path to demonstrating the pay-on-completion flow
 * without booking something first.
 */
export interface BookingPayment {
  method: 'upi' | 'card' | 'wallet' | 'cash';
  /** False while the money has not moved — cash before the job is finished. */
  paid: boolean;
  transactionId?: string;
}

export const paymentByBookingId: Record<string, BookingPayment> = {
  bkg_live_ac: { method: 'upi', paid: true, transactionId: 'SHYK41P2QX7' },
  bkg_live_bathroom: { method: 'cash', paid: false },
  bkg_soon_painting: { method: 'upi', paid: true, transactionId: 'SHYK3ZM8V2B' },
  bkg_past_tap: { method: 'upi', paid: true, transactionId: 'SHYJ92LT4KD' },
  bkg_past_fan: { method: 'wallet', paid: true, transactionId: 'SHYJ71RB6NP' },
  bkg_past_kitchen: { method: 'cash', paid: false },
};


/**
 * Guards the hand-written splits above.
 *
 * The revenue split is the cooperative-fund story this platform is built on,
 * so a mock that quietly loses a paisa to rounding would be a bad thing to
 * demo from. Throwing at module load makes a wrong number impossible to miss.
 */
// Widened deliberately. `satisfies Booking[]` keeps the literal types, under
// which a live booking has no `fare` property at all rather than an optional
// one — which is the point of the assertion, but makes the union awkward to
// walk. Assigning to Booking[] is checked, not cast.
const checkedBookings: Booking[] = mockBookings;

for (const booking of checkedBookings) {
  const { fare } = booking;
  if (!fare) continue;

  const sum = fare.workerShare + fare.platformShare + fare.coopFundShare;
  if (sum !== fare.total) {
    throw new Error(`${booking.id}: fare shares sum to ${sum}, expected ${fare.total}`);
  }

  const expected = {
    workerShare: Math.round(fare.total * WORKER_SHARE),
    platformShare: Math.round(fare.total * PLATFORM_SHARE),
    coopFundShare: Math.round(fare.total * COOP_FUND_SHARE),
  };
  for (const [key, value] of Object.entries(expected)) {
    const actual = fare[key as keyof typeof expected];
    // One paisa of slack: the three rounded shares cannot always land on the
    // total exactly, and the remainder is absorbed by the worker share.
    if (Math.abs(actual - value) > 1) {
      throw new Error(`${booking.id}: ${key} is ${actual}, expected about ${value}`);
    }
  }
}
