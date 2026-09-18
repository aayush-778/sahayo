import type { User, WorkerProfile } from '@sahayo/shared';
import { customerAppWorkers } from '@sahayo/shared/seed/cast';

/**
 * The forty-eight workers the booking map shows, each with its distance from the
 * demo customer.
 *
 * The records come from the demo cast in @sahayo/shared, which the worker app and
 * the backend's canonical seed read too, so a worker on this map is the same record,
 * under the same id, as the worker in the admin portal's directory.
 *
 * `distanceM` IS DERIVED FROM `lastLocation`, not stated independently. It
 * used to be both, and they disagreed: four of the original eight carried a
 * distance that did not match their own coordinates, and one — Sunita Devi —
 * sat exactly on the customer's pin in `location.ts` while claiming to be
 * 850 m away. On a screen that draws pins by coordinate and filters by
 * distance, that is a worker who is inside the radius and outside the circle
 * at the same time. `assertWorkerDistances` in `./index.ts` now fails the
 * build if the two ever drift apart again. The backend computes it from the
 * customer's pin once this app asks it.
 */
export interface MockWorker {
  user: User;
  profile: WorkerProfile;
  /** Straight-line metres from the customer's pin. Never rendered raw — use
   *  `formatDistance` from @sahayo/ui-native. */
  distanceM: number;
}

/**
 * Each worker's distance from the demo customer's pin, in metres.
 *
 * The workers themselves live in `@sahayo/shared/seed/cast`, the one copy the worker
 * app and the backend's seed read as well. Distance is not on that record because it
 * is relative to whoever is asking; it stays here, beside the customer it is measured
 * from, and `assertWorkerDistances` still checks it against the coordinates.
 */
const DISTANCE_M_BY_WORKER_ID: Record<string, number> = {
  wrk_ramesh: 1255,
  wrk_sunita: 850,
  wrk_irfan: 2938,
  wrk_rakesh: 4178,
  wrk_pooja: 6102,
  wrk_vinod: 6626,
  wrk_anil: 9160,
  wrk_shabnam: 11403,
  wrk_bipin: 561,
  wrk_anjali: 917,
  wrk_sarfaraz: 1173,
  wrk_rekha: 1375,
  wrk_santosh: 1562,
  wrk_nutan: 1725,
  wrk_dhananjay: 1869,
  wrk_farzana: 2010,
  wrk_chandan: 2137,
  wrk_sarita: 2250,
  wrk_nasim: 2368,
  wrk_priyanka: 2478,
  wrk_rajeev: 2579,
  wrk_gudiya: 2686,
  wrk_sanjay: 2784,
  wrk_nirmala: 2871,
  wrk_arvind: 2966,
  wrk_sabina: 3050,
  wrk_manoj: 3136,
  wrk_kiran: 3219,
  wrk_birendra: 3304,
  wrk_sushma: 3379,
  wrk_tauheed: 3457,
  wrk_rinku: 3529,
  wrk_prem: 3611,
  wrk_babita: 3681,
  wrk_naresh: 3752,
  wrk_asha: 3821,
  wrk_shyam: 3887,
  wrk_munni: 3959,
  wrk_ranjeet: 4022,
  wrk_poonam: 4084,
  wrk_iqbal: 4153,
  wrk_lalita: 4222,
  wrk_upendra: 4282,
  wrk_suman: 4337,
  wrk_ravi: 4400,
  wrk_neetu: 4459,
  wrk_ashok: 4516,
  wrk_reshma: 4582,
};

export const mockWorkers: MockWorker[] = customerAppWorkers.map(({ user, profile }) => {
  const distanceM = DISTANCE_M_BY_WORKER_ID[profile.id];
  if (distanceM === undefined) throw new Error(`worker ${profile.id} has no distance from the demo customer`);
  return { user, profile, distanceM };
});

/** Lookup by `WorkerProfile.id`, which is what a `Booking.workerId` holds. */
export function findWorkerById(workerId: string): MockWorker | undefined {
  return mockWorkers.find((worker) => worker.profile.id === workerId);
}
