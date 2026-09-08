import {
  BookingStatus,
  COOP_FUND_SHARE,
  PLATFORM_SHARE,
  WORKER_SHARE,
  type Booking,
} from '@sahayo/shared';

/**
 * Five bookings for the signed-in customer: two in flight, three in the past.
 *
 * `fare` is deliberately absent on the live ones. `BookingFare` is documented
 * as being computed at settlement, and inventing a settled split for a job
 * that has not happened would teach the UI to trust a number the backend will
 * not send. A live booking shows an estimate derived from the service item's
 * `baseFare` instead.
 *
 * Every split below is exact integer paise: worker 85%, platform 10%,
 * cooperative fund 5%, summing to `total` with nothing lost to rounding. The
 * assertion at the bottom of this file enforces that.
 */

const CUSTOMER_ID = 'usr_cust_demo';

const RAJENDRA_NAGAR = {
  line1: 'Flat 3B, Shivam Apartment',
  line2: 'Road No. 4, Rajendra Nagar',
  city: 'Patna',
  state: 'Bihar',
  pincode: '800016',
  point: { lat: 25.6013, lng: 85.1553 },
};

const KANKARBAGH = {
  line1: 'House 27, Lane 2',
  line2: 'Kankarbagh Colony',
  city: 'Patna',
  state: 'Bihar',
  pincode: '800020',
  point: { lat: 25.5905, lng: 85.159 },
};

/** In flight right now — these are what `track/[bookingId]` renders. */
export const liveBookings = [
  {
    id: 'bkg_live_ac',
    customerId: CUSTOMER_ID,
    workerId: 'wrk_rakesh',
    serviceCategoryId: 'svc_ac_service',
    status: BookingStatus.EN_ROUTE,
    address: RAJENDRA_NAGAR,
    notes: 'Second floor, no lift. Please call on arrival.',
    createdAt: '2026-09-08T09:05:00.000Z',
    updatedAt: '2026-09-08T09:18:00.000Z',
  },
  {
    id: 'bkg_live_bathroom',
    customerId: CUSTOMER_ID,
    workerId: 'wrk_sunita',
    serviceCategoryId: 'svc_bathroom_deep',
    status: BookingStatus.IN_PROGRESS,
    address: KANKARBAGH,
    createdAt: '2026-09-08T07:40:00.000Z',
    updatedAt: '2026-09-08T08:55:00.000Z',
  },
] satisfies Booking[];

/** Finished work. Two settled, one completed and awaiting settlement. */
export const pastBookings = [
  {
    id: 'bkg_past_tap',
    customerId: CUSTOMER_ID,
    workerId: 'wrk_ramesh',
    serviceCategoryId: 'svc_tap_repair',
    status: BookingStatus.SETTLED,
    address: RAJENDRA_NAGAR,
    fare: {
      total: 19900,
      workerShare: 16915,
      platformShare: 1990,
      coopFundShare: 995,
    },
    createdAt: '2026-08-24T05:20:00.000Z',
    updatedAt: '2026-08-24T07:02:00.000Z',
  },
  {
    id: 'bkg_past_fan',
    customerId: CUSTOMER_ID,
    workerId: 'wrk_irfan',
    serviceCategoryId: 'svc_fan_repair',
    status: BookingStatus.SETTLED,
    address: KANKARBAGH,
    notes: 'Bedroom fan making noise at high speed.',
    fare: {
      total: 34900,
      workerShare: 29665,
      platformShare: 3490,
      coopFundShare: 1745,
    },
    createdAt: '2026-08-11T10:15:00.000Z',
    updatedAt: '2026-08-11T12:40:00.000Z',
  },
  {
    id: 'bkg_past_kitchen',
    customerId: CUSTOMER_ID,
    workerId: 'wrk_pooja',
    serviceCategoryId: 'svc_kitchen_deep',
    status: BookingStatus.COMPLETED,
    address: RAJENDRA_NAGAR,
    scheduledFor: '2026-09-02T04:30:00.000Z',
    fare: {
      total: 129900,
      workerShare: 110415,
      platformShare: 12990,
      coopFundShare: 6495,
    },
    createdAt: '2026-08-30T14:05:00.000Z',
    updatedAt: '2026-09-02T09:10:00.000Z',
  },
] satisfies Booking[];

export const mockBookings = [...liveBookings, ...pastBookings] satisfies Booking[];

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
