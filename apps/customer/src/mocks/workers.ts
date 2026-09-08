import {
  KycStatus,
  UserRole,
  WorkerAvailability,
  type User,
  type WorkerProfile,
} from '@sahayo/shared';

/**
 * Eight nearby workers, positioned around Patna.
 *
 * A worker is two records in @sahayo/shared: the `User` carries the name and
 * phone, the `WorkerProfile` carries rating, availability and last known
 * position. Neither carries a distance, because distance is relative to
 * whoever is asking — Phase 5 computes it server-side from the customer's
 * pin. Until then it is a third field here, alongside the two real records.
 *
 * Coordinates are real Patna localities so the map in booking/now.tsx has
 * plausible geometry rather than points in the Bay of Bengal.
 */
export interface MockWorker {
  user: User;
  profile: WorkerProfile;
  /** Straight-line metres from the customer's pin. Never rendered raw — use
   *  `formatDistance` from @sahayo/ui-native. */
  distanceM: number;
}

const CREATED = '2025-11-04T06:30:00.000Z';
const UPDATED = '2026-09-08T04:15:00.000Z';
const SEEN_AT = '2026-09-08T09:12:00.000Z';

export const mockWorkers = [
  {
    // Kankarbagh
    user: {
      id: 'usr_wrk_ramesh',
      phone: '+919431012845',
      name: 'Ramesh Kumar',
      role: UserRole.WORKER,
      locale: 'hi-IN',
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    profile: {
      id: 'wrk_ramesh',
      userId: 'usr_wrk_ramesh',
      cooperativeId: 'coop_patna_central',
      serviceCategoryIds: ['cat_plumbers'],
      kycStatus: KycStatus.VERIFIED,
      availability: WorkerAvailability.ONLINE,
      lastLocation: { lat: 25.5905, lng: 85.159 },
      lastLocationAt: SEEN_AT,
      serviceRadiusM: 6000,
      ratingAvg: 4.8,
      ratingCount: 214,
      completedJobs: 231,
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    distanceM: 1200,
  },
  {
    // Rajendra Nagar
    user: {
      id: 'usr_wrk_sunita',
      phone: '+919835127640',
      name: 'Sunita Devi',
      role: UserRole.WORKER,
      locale: 'hi-IN',
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    profile: {
      id: 'wrk_sunita',
      userId: 'usr_wrk_sunita',
      cooperativeId: 'coop_patna_central',
      serviceCategoryIds: ['cat_cleaners'],
      kycStatus: KycStatus.VERIFIED,
      availability: WorkerAvailability.ONLINE,
      lastLocation: { lat: 25.6013, lng: 85.1553 },
      lastLocationAt: SEEN_AT,
      serviceRadiusM: 5000,
      ratingAvg: 4.9,
      ratingCount: 341,
      completedJobs: 358,
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    distanceM: 850,
  },
  {
    // Ashok Rajpath
    user: {
      id: 'usr_wrk_irfan',
      phone: '+919386554122',
      name: 'Md. Irfan Ansari',
      role: UserRole.WORKER,
      locale: 'hi-IN',
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    profile: {
      id: 'wrk_irfan',
      userId: 'usr_wrk_irfan',
      cooperativeId: 'coop_patna_central',
      serviceCategoryIds: ['cat_electricians'],
      kycStatus: KycStatus.VERIFIED,
      availability: WorkerAvailability.ON_JOB,
      lastLocation: { lat: 25.618, lng: 85.178 },
      lastLocationAt: SEEN_AT,
      serviceRadiusM: 5000,
      ratingAvg: 4.7,
      ratingCount: 168,
      completedJobs: 179,
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    distanceM: 3400,
  },
  {
    // Boring Road
    user: {
      id: 'usr_wrk_rakesh',
      phone: '+919771208364',
      name: 'Rakesh Paswan',
      role: UserRole.WORKER,
      locale: 'hi-IN',
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    profile: {
      id: 'wrk_rakesh',
      userId: 'usr_wrk_rakesh',
      cooperativeId: 'coop_patna_central',
      serviceCategoryIds: ['cat_technicians'],
      kycStatus: KycStatus.VERIFIED,
      availability: WorkerAvailability.ONLINE,
      lastLocation: { lat: 25.618, lng: 85.118 },
      lastLocationAt: SEEN_AT,
      serviceRadiusM: 8000,
      ratingAvg: 4.6,
      ratingCount: 97,
      completedJobs: 104,
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    distanceM: 2600,
  },
  {
    // Patliputra Colony
    user: {
      id: 'usr_wrk_pooja',
      phone: '+919905443871',
      name: 'Pooja Kumari',
      role: UserRole.WORKER,
      locale: 'hi-IN',
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    profile: {
      id: 'wrk_pooja',
      userId: 'usr_wrk_pooja',
      cooperativeId: 'coop_patna_central',
      serviceCategoryIds: ['cat_cleaners', 'cat_painters'],
      kycStatus: KycStatus.VERIFIED,
      availability: WorkerAvailability.ONLINE,
      lastLocation: { lat: 25.626, lng: 85.101 },
      lastLocationAt: SEEN_AT,
      serviceRadiusM: 6000,
      ratingAvg: 4.9,
      ratingCount: 122,
      completedJobs: 130,
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    distanceM: 4700,
  },
  {
    // Bailey Road
    user: {
      id: 'usr_wrk_vinod',
      phone: '+919431778905',
      name: 'Vinod Sharma',
      role: UserRole.WORKER,
      locale: 'hi-IN',
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    profile: {
      id: 'wrk_vinod',
      userId: 'usr_wrk_vinod',
      cooperativeId: 'coop_danapur',
      serviceCategoryIds: ['cat_carpenters', 'cat_painters'],
      kycStatus: KycStatus.VERIFIED,
      availability: WorkerAvailability.ONLINE,
      lastLocation: { lat: 25.61, lng: 85.09 },
      lastLocationAt: SEEN_AT,
      serviceRadiusM: 7000,
      ratingAvg: 4.5,
      ratingCount: 88,
      completedJobs: 95,
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    distanceM: 5900,
  },
  {
    // Phulwari Sharif
    user: {
      id: 'usr_wrk_anil',
      phone: '+919263310457',
      name: 'Anil Yadav',
      role: UserRole.WORKER,
      locale: 'hi-IN',
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    profile: {
      id: 'wrk_anil',
      userId: 'usr_wrk_anil',
      cooperativeId: 'coop_danapur',
      serviceCategoryIds: ['cat_plumbers', 'cat_technicians'],
      kycStatus: KycStatus.PENDING,
      availability: WorkerAvailability.OFFLINE,
      lastLocation: { lat: 25.572, lng: 85.07 },
      lastLocationAt: '2026-09-07T17:40:00.000Z',
      serviceRadiusM: 5000,
      ratingAvg: 4.3,
      ratingCount: 41,
      completedJobs: 44,
      createdAt: '2026-06-19T05:10:00.000Z',
      updatedAt: UPDATED,
    },
    distanceM: 8300,
  },
  {
    // Danapur
    user: {
      id: 'usr_wrk_shabnam',
      phone: '+919570884213',
      name: 'Shabnam Khatoon',
      role: UserRole.WORKER,
      locale: 'hi-IN',
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    profile: {
      id: 'wrk_shabnam',
      userId: 'usr_wrk_shabnam',
      cooperativeId: 'coop_danapur',
      serviceCategoryIds: ['cat_cleaners'],
      kycStatus: KycStatus.VERIFIED,
      availability: WorkerAvailability.ONLINE,
      lastLocation: { lat: 25.635, lng: 85.048 },
      lastLocationAt: SEEN_AT,
      serviceRadiusM: 6000,
      ratingAvg: 4.8,
      ratingCount: 156,
      completedJobs: 161,
      createdAt: CREATED,
      updatedAt: UPDATED,
    },
    distanceM: 10400,
  },
] satisfies MockWorker[];

/** Lookup by `WorkerProfile.id`, which is what a `Booking.workerId` holds. */
export function findWorkerById(workerId: string): MockWorker | undefined {
  return mockWorkers.find((worker) => worker.profile.id === workerId);
}
