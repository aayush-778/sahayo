import { BookingStatus, type Booking } from '../../index';
import type { CastClock } from './clock';
import { demoCustomer } from './customers';
import { splitFare } from './fare';
import { castPlaces } from './places';
import { demoPartner } from './workers';

/**
 * The demo cast's hand-written bookings: the customer app's seven and the worker
 * app's fifteen.
 *
 * Built against a clock rather than written as fixed instants. The mobile apps pass
 * the device clock, so a job "40 minutes ago" is 40 minutes ago on the day of the
 * demo; the canonical seed passes SEED_NOW, so the dataset is identical on every
 * machine, and lays these over generated bookings under the same ids.
 */

export interface CustomerCastBookings {
  live: Booking[];
  scheduled: Booking[];
  past: Booking[];
  cancelled: Booking[];
}

/**
 * The customer app's bookings for the demo customer: two in flight, one scheduled,
 * three finished and one called off.
 *
 * `fare` is deliberately absent on the live ones. `BookingFare` is documented as
 * being computed at settlement, and inventing a settled split for a job that has
 * not happened would teach the UI to trust a number the backend will not send.
 */
export function buildCustomerCastBookings(clock: CastClock): CustomerCastBookings {
  /** In flight right now — these are what `track/[bookingId]` renders. */
  const liveBookings = [
    {
      id: 'bkg_live_ac',
      customerId: demoCustomer.id,
      workerId: 'wrk_rakesh',
      serviceCategoryId: 'svc_ac_service',
      status: BookingStatus.EN_ROUTE,
      address: castPlaces.demoCustomerHome,
      notes: 'Second floor, no lift. Please call on arrival.',
      createdAt: clock.minutesAgo(26),
      updatedAt: clock.minutesAgo(13),
    },
    {
      id: 'bkg_live_bathroom',
      customerId: demoCustomer.id,
      workerId: 'wrk_sunita',
      serviceCategoryId: 'svc_bathroom_deep',
      status: BookingStatus.IN_PROGRESS,
      address: castPlaces.kankarbagh,
      createdAt: clock.minutesAgo(115),
      updatedAt: clock.minutesAgo(40),
    },
  ] satisfies Booking[];

  /**
   * Accepted, but not today. These fill the Upcoming tab.
   *
   * `scheduledFor` is what separates upcoming from active: a booking can be
   * ACCEPTED and still be three days away, and showing it beside a worker who
   * is on their way right now would be wrong.
   */
  const scheduledBookings = [
    {
      id: 'bkg_soon_painting',
      customerId: demoCustomer.id,
      workerId: 'wrk_bipin',
      serviceCategoryId: 'svc_paint_room',
      status: BookingStatus.ACCEPTED,
      address: castPlaces.demoCustomerHome,
      scheduledFor: clock.daysFromNow(3, 11),
      createdAt: clock.daysFromNow(-1, 18),
      updatedAt: clock.daysFromNow(-1, 18),
    },
  ] satisfies Booking[];

  /** Finished work. Two settled, one completed and awaiting settlement. */
  const pastBookings = [
    {
      id: 'bkg_past_tap',
      customerId: demoCustomer.id,
      workerId: 'wrk_ramesh',
      serviceCategoryId: 'svc_tap_repair',
      status: BookingStatus.SETTLED,
      address: castPlaces.demoCustomerHome,
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
      customerId: demoCustomer.id,
      workerId: 'wrk_irfan',
      serviceCategoryId: 'svc_fan_repair',
      status: BookingStatus.SETTLED,
      address: castPlaces.kankarbagh,
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
      customerId: demoCustomer.id,
      workerId: 'wrk_pooja',
      serviceCategoryId: 'svc_kitchen_deep',
      status: BookingStatus.COMPLETED,
      address: castPlaces.demoCustomerHome,
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

  /** Called off. One row, so the Past tab has a status chip worth reading. */
  const cancelledBookings = [
    {
      id: 'bkg_cancelled_carpentry',
      customerId: demoCustomer.id,
      serviceCategoryId: 'svc_door_align',
      status: BookingStatus.CANCELLED_BY_WORKER,
      address: castPlaces.demoCustomerHome,
      cancellationReason: 'worker_unavailable',
      createdAt: '2026-08-19T07:20:00.000Z',
      updatedAt: '2026-08-19T08:05:00.000Z',
    },
  ] satisfies Booking[];

  return { live: liveBookings, scheduled: scheduledBookings, past: pastBookings, cancelled: cancelledBookings };
}

/**
 * The worker app's bookings: fifteen of the demo partner's, across every tab.
 *
 *   pending    4  ACCEPTED ×2, EN_ROUTE, IN_PROGRESS
 *   completed  8  COMPLETED ×3 (earned, not yet paid out), SETTLED ×5
 *   cancelled  3  shown under All only
 *
 * `fare` is set on every booking the worker agreed to, not only on settled
 * ones: a worker accepts a job at a price, and the booking list is where they
 * check what that price was.
 */
export function buildWorkerCastBookings(clock: CastClock): Booking[] {
  const wb = (
    n: number,
    customerId: string,
    subCategoryId: string,
    status: Booking['status'],
    address: Booking['address'],
    createdAt: string,
    extra: Partial<Booking> = {},
  ): Booking => ({
    id: `wbk_${String(n).padStart(2, '0')}`,
    customerId,
    workerId: demoPartner.profile.id,
    serviceCategoryId: subCategoryId,
    status,
    address,
    createdAt,
    updatedAt: createdAt,
    ...extra,
  });

  return [
    // pending
    wb(1, 'usr_cust_09', 'sub_basic_electrical', BookingStatus.IN_PROGRESS, castPlaces.rajendraNagar, clock.minutesAgo(95), { fare: splitFare(29900) }),
    wb(2, 'usr_cust_10', 'sub_power_backup_solar', BookingStatus.EN_ROUTE, castPlaces.kadamkuan, clock.minutesAgo(40), { fare: splitFare(54900) }),
    wb(3, 'usr_cust_11', 'sub_wiring_installation', BookingStatus.ACCEPTED, castPlaces.boringRoad, clock.minutesAgo(180), { fare: splitFare(89900), scheduledFor: clock.daysFromNow(0, 17) }),
    wb(4, 'usr_cust_12', 'sub_motors_pumps', BookingStatus.ACCEPTED, castPlaces.patliputra, clock.daysAgo(1, 19), { fare: splitFare(74900), scheduledFor: clock.daysFromNow(1, 11) }),

    // completed, not yet paid out
    wb(5, 'usr_cust_01', 'sub_basic_electrical', BookingStatus.COMPLETED, castPlaces.kankarbagh, clock.daysAgo(0, 9), { fare: splitFare(34900) }),
    wb(6, 'usr_cust_03', 'sub_power_backup_solar', BookingStatus.COMPLETED, castPlaces.patliputra, clock.daysAgo(1, 14), { fare: splitFare(64900) }),
    wb(7, 'usr_cust_06', 'sub_basic_electrical', BookingStatus.COMPLETED, castPlaces.kadamkuan, clock.daysAgo(2, 12), { fare: splitFare(24900) }),

    // settled
    wb(8, 'usr_cust_02', 'sub_wiring_installation', BookingStatus.SETTLED, castPlaces.boringRoad, clock.daysAgo(6, 11), { fare: splitFare(149900) }),
    wb(9, 'usr_cust_04', 'sub_basic_electrical', BookingStatus.SETTLED, castPlaces.rajendraNagar, clock.daysAgo(9, 16), { fare: splitFare(19900) }),
    wb(10, 'usr_cust_05', 'sub_motors_pumps', BookingStatus.SETTLED, castPlaces.gardanibagh, clock.daysAgo(14, 10), { fare: splitFare(89900) }),
    wb(11, 'usr_cust_07', 'sub_power_backup_solar', BookingStatus.SETTLED, castPlaces.bailey, clock.daysAgo(22, 15), { fare: splitFare(44900) }),
    wb(12, 'usr_cust_08', 'sub_basic_electrical', BookingStatus.SETTLED, castPlaces.saguna, clock.daysAgo(31, 13), { fare: splitFare(34900) }),

    // cancelled
    wb(13, 'usr_cust_10', 'sub_basic_electrical', BookingStatus.CANCELLED_BY_CUSTOMER, castPlaces.kadamkuan, clock.daysAgo(4, 18), { cancellationReason: 'customer_fixed_it' }),
    wb(14, 'usr_cust_12', 'sub_commercial_electrical', BookingStatus.CANCELLED_BY_CUSTOMER, castPlaces.bailey, clock.daysAgo(12, 9), { cancellationReason: 'rescheduled_elsewhere' }),
    wb(15, 'usr_cust_09', 'sub_wiring_installation', BookingStatus.CANCELLED_BY_WORKER, castPlaces.saguna, clock.daysAgo(19, 8), { cancellationReason: 'outside_radius' }),
  ];
}
