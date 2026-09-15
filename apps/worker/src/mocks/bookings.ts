import { BookingStatus, type Booking } from '@sahayo/shared';

import { splitFare } from './fare';
import { DEMO_WORKER_ID } from './partner';
import { places } from './places';
import { daysAgo, daysFromNow, minutesAgo } from './time';

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
 */
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
  workerId: DEMO_WORKER_ID,
  serviceCategoryId: subCategoryId,
  status,
  address,
  createdAt,
  updatedAt: createdAt,
  ...extra,
});

export const mockBookings = [
  // pending
  wb(1, 'usr_cust_09', 'sub_basic_electrical', BookingStatus.IN_PROGRESS, places.rajendraNagar, minutesAgo(95), { fare: splitFare(29900) }),
  wb(2, 'usr_cust_10', 'sub_power_backup_solar', BookingStatus.EN_ROUTE, places.kadamkuan, minutesAgo(40), { fare: splitFare(54900) }),
  wb(3, 'usr_cust_11', 'sub_wiring_installation', BookingStatus.ACCEPTED, places.boringRoad, minutesAgo(180), { fare: splitFare(89900), scheduledFor: daysFromNow(0, 17) }),
  wb(4, 'usr_cust_12', 'sub_motors_pumps', BookingStatus.ACCEPTED, places.patliputra, daysAgo(1, 19), { fare: splitFare(74900), scheduledFor: daysFromNow(1, 11) }),

  // completed, not yet paid out
  wb(5, 'usr_cust_01', 'sub_basic_electrical', BookingStatus.COMPLETED, places.kankarbagh, daysAgo(0, 9), { fare: splitFare(34900) }),
  wb(6, 'usr_cust_03', 'sub_power_backup_solar', BookingStatus.COMPLETED, places.patliputra, daysAgo(1, 14), { fare: splitFare(64900) }),
  wb(7, 'usr_cust_06', 'sub_basic_electrical', BookingStatus.COMPLETED, places.kadamkuan, daysAgo(2, 12), { fare: splitFare(24900) }),

  // settled
  wb(8, 'usr_cust_02', 'sub_wiring_installation', BookingStatus.SETTLED, places.boringRoad, daysAgo(6, 11), { fare: splitFare(149900) }),
  wb(9, 'usr_cust_04', 'sub_basic_electrical', BookingStatus.SETTLED, places.rajendraNagar, daysAgo(9, 16), { fare: splitFare(19900) }),
  wb(10, 'usr_cust_05', 'sub_motors_pumps', BookingStatus.SETTLED, places.gardanibagh, daysAgo(14, 10), { fare: splitFare(89900) }),
  wb(11, 'usr_cust_07', 'sub_power_backup_solar', BookingStatus.SETTLED, places.bailey, daysAgo(22, 15), { fare: splitFare(44900) }),
  wb(12, 'usr_cust_08', 'sub_basic_electrical', BookingStatus.SETTLED, places.saguna, daysAgo(31, 13), { fare: splitFare(34900) }),

  // cancelled
  wb(13, 'usr_cust_10', 'sub_basic_electrical', BookingStatus.CANCELLED_BY_CUSTOMER, places.kadamkuan, daysAgo(4, 18), { cancellationReason: 'customer_fixed_it' }),
  wb(14, 'usr_cust_12', 'sub_commercial_electrical', BookingStatus.CANCELLED_BY_CUSTOMER, places.bailey, daysAgo(12, 9), { cancellationReason: 'rescheduled_elsewhere' }),
  wb(15, 'usr_cust_09', 'sub_wiring_installation', BookingStatus.CANCELLED_BY_WORKER, places.saguna, daysAgo(19, 8), { cancellationReason: 'outside_radius' }),
] satisfies Booking[];
