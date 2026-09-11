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
 * Every split below is exact integer paise: worker 90%, platform 5%,
 * cooperative fund 5%, summing to `total` with nothing lost to rounding. The
 * assertion at the bottom of this file enforces that.
 */

/** The signed-in demo customer. Exported so a booking created at payment
 *  time carries the same identity as the seeded history. */
export const CUSTOMER_ID = 'usr_cust_demo';

/** The customer's default service address, matching `mocks/location.ts`. */
export const RAJENDRA_NAGAR = {
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

/**
 * An instant relative to now, so the demo never shows a stale calendar.
 *
 * The seeded history keeps its fixed dates — those are the past and the past
 * does not move. Only the scheduled booking is relative, because a booking
 * "upcoming" in August is not upcoming any more.
 */
function daysFromNow(days: number, hour: number): string {
  const at = new Date();
  at.setDate(at.getDate() + days);
  at.setHours(hour, 0, 0, 0);
  return at.toISOString();
}

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
      workerShare: 17910,
      platformShare: 995,
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
      workerShare: 31410,
      platformShare: 1745,
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
      workerShare: 116910,
      platformShare: 6495,
      coopFundShare: 6495,
    },
    createdAt: '2026-08-30T14:05:00.000Z',
    updatedAt: '2026-09-02T09:10:00.000Z',
  },
] satisfies Booking[];

/**
 * Accepted, but not today. These fill the Upcoming tab.
 *
 * `scheduledFor` is what separates upcoming from active: a booking can be
 * ACCEPTED and still be three days away, and showing it beside a worker who
 * is on their way right now would be wrong.
 */
export const scheduledBookings = [
  {
    id: 'bkg_soon_painting',
    customerId: CUSTOMER_ID,
    workerId: 'wrk_bipin',
    serviceCategoryId: 'svc_paint_room',
    status: BookingStatus.ACCEPTED,
    address: RAJENDRA_NAGAR,
    scheduledFor: daysFromNow(3, 11),
    createdAt: daysFromNow(-1, 18),
    updatedAt: daysFromNow(-1, 18),
  },
] satisfies Booking[];

/** Called off. One row, so the Past tab has a status chip worth reading. */
export const cancelledBookings = [
  {
    id: 'bkg_cancelled_carpentry',
    customerId: CUSTOMER_ID,
    serviceCategoryId: 'svc_door_align',
    status: BookingStatus.CANCELLED_BY_WORKER,
    address: RAJENDRA_NAGAR,
    cancellationReason: 'worker_unavailable',
    createdAt: '2026-08-19T07:20:00.000Z',
    updatedAt: '2026-08-19T08:05:00.000Z',
  },
] satisfies Booking[];

export const mockBookings = [
  ...liveBookings,
  ...scheduledBookings,
  ...pastBookings,
  ...cancelledBookings,
] satisfies Booking[];

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
