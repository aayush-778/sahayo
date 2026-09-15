import { BookingStatus, type Booking } from '@sahayo/shared';

import type { JobRequest } from '../types';
import { findCustomer } from './customers';
import { splitFare } from './fare';
import { places } from './places';
import { daysFromNow, minutesAgo, minutesFromNow } from './time';

/**
 * Eight job offers the demo dispatcher deals from.
 *
 * Every one is in an Electricians sub-category the demo partner is approved
 * for, because the broadcast only reaches workers approved for the job's work
 * — a feed that offered a plumbing job to an electrician would be a bug the
 * worker can see.
 *
 * Most are on demand; two are booked ahead, so the job screen shows both kinds
 * of timing. Scheduled times are relative to now, never a fixed clock time that
 * could already have passed on the day of the demo.
 *
 * These are TEMPLATES, not the live feed. services/jobs.ts deals them out one
 * at a time while the partner is online, each with a real thirty-second window
 * (GIG_OFFER_TIMEOUT_MS). An unanswered offer is withdrawn and the next one
 * arrives. The ids, times and `expiresAt` here are replaced on delivery.
 */
const offer = (
  n: number,
  customerId: string,
  subCategoryId: string,
  total: number,
  address: Booking['address'],
  distanceM: number,
  estimatedMinutes: number,
  extra: { notes?: string; scheduledFor?: string } = {},
): JobRequest => {
  const customer = findCustomer(customerId);
  if (!customer) throw new Error(`jobRequests: no customer ${customerId}`);
  const createdAt = minutesAgo(n * 4);
  const booking = {
    id: `wjob_0${n}`,
    customerId,
    serviceCategoryId: subCategoryId,
    status: BookingStatus.BROADCAST,
    address,
    notes: extra.notes,
    scheduledFor: extra.scheduledFor,
    fare: splitFare(total),
    createdAt,
    updatedAt: createdAt,
  } satisfies Booking;
  return {
    id: `jreq_0${n}`,
    booking,
    customer,
    distanceM,
    estimatedMinutes,
    expiresAt: minutesFromNow(20 + n * 6),
  };
};

export const mockJobRequests = [
  offer(1, 'usr_cust_01', 'sub_basic_electrical', 34900, places.kankarbagh, 1300, 60, {
    notes: 'Ceiling fan hums and stops. Regulator is new.',
  }),
  offer(2, 'usr_cust_02', 'sub_power_backup_solar', 64900, places.boringRoad, 4100, 90, {
    notes: 'इन्वर्टर की बैटरी चार्ज नहीं हो रही।',
    scheduledFor: minutesFromNow(150),
  }),
  offer(3, 'usr_cust_03', 'sub_wiring_installation', 129900, places.patliputra, 5600, 180, {
    notes: 'Two new points in the kitchen, with earthing.',
    scheduledFor: daysFromNow(1, 10, 30),
  }),
  offer(4, 'usr_cust_04', 'sub_basic_electrical', 19900, places.rajendraNagar, 450, 45),
  offer(5, 'usr_cust_05', 'sub_motors_pumps', 89900, places.gardanibagh, 3200, 120, {
    notes: 'सबमर्सिबल मोटर बार-बार ट्रिप हो रहा है।',
  }),
  offer(6, 'usr_cust_06', 'sub_basic_electrical', 24900, places.kadamkuan, 900, 45, {
    notes: 'MCB trips when the geyser is on.',
  }),
  offer(7, 'usr_cust_07', 'sub_commercial_electrical', 249900, places.bailey, 5200, 240, {
    notes: 'Shop panel load check before Diwali.',
  }),
  offer(8, 'usr_cust_08', 'sub_power_backup_solar', 44900, places.saguna, 11800, 90, {
    notes: 'सोलर पैनल की सफ़ाई और कनेक्शन जाँच।',
  }),
] satisfies JobRequest[];
