import { BookingStatus, type Booking } from '@sahayo/shared';

import type { JobRequest } from '../types';
import { findCustomer } from './customers';
import { splitFare } from './fare';
import { places } from './places';
import { daysFromNow, minutesAgo } from './time';

/**
 * Three booked-ahead requests, for when the app is running on its demo data.
 *
 * Unlike the instant offers in jobRequests.ts these are not dealt out one at a time:
 * booked-ahead work waits in the Scheduled requests list until it is answered, so all
 * three sit there from the start. The first is deliberately at 11:30 tomorrow, half an
 * hour into the job the demo partner already accepted for 11:00 — the clash the list
 * has to catch.
 *
 * Times are relative to now, because the demo is given on a day nobody can predict.
 */
const scheduled = (
  n: number,
  customerId: string,
  subCategoryId: string,
  total: number,
  address: Booking['address'],
  distanceM: number,
  estimatedMinutes: number,
  scheduledFor: string,
  notes?: string,
): JobRequest => {
  const customer = findCustomer(customerId);
  if (!customer) throw new Error(`scheduledRequests: no customer ${customerId}`);
  const createdAt = minutesAgo(20 + n * 15);
  const booking = {
    id: `wsch_0${n}`,
    customerId,
    serviceCategoryId: subCategoryId,
    status: BookingStatus.BROADCAST,
    address,
    notes,
    scheduledFor,
    fare: splitFare(total),
    createdAt,
    updatedAt: createdAt,
  } satisfies Booking;
  return {
    id: `sreq_0${n}`,
    booking,
    customer,
    distanceM,
    estimatedMinutes,
    /* A scheduled offer is open until the slot itself. */
    expiresAt: scheduledFor,
    scheduled: true,
  };
};

export const mockScheduledRequests = [
  scheduled(1, 'usr_cust_01', 'sub_basic_electrical', 47500, places.rajendraNagar, 520, 60, daysFromNow(1, 11, 30), 'Ceiling fan for the new room. Fan is already at home.'),
  scheduled(2, 'usr_cust_06', 'sub_power_backup_solar', 34900, places.kadamkuan, 1800, 90, daysFromNow(1, 18, 0), 'इन्वर्टर की वायरिंग जाँच करनी है।'),
  scheduled(3, 'usr_cust_03', 'sub_wiring_installation', 59900, places.patliputra, 4100, 120, daysFromNow(2, 10, 30), 'Three light points in the front room.'),
] satisfies JobRequest[];
