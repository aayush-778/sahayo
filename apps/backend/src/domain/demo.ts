import { KycStatus, type GeoPoint, type Id } from '@sahayo/shared';
import { castPlaces } from '@sahayo/shared/seed/cast';
import * as ledger from '../repositories/ledger';
import * as system from '../repositories/system';
import * as workers from '../repositories/workers';
import type { Dispatcher } from '../dispatch/dispatcher';

/**
 * Putting the demo back to its starting position.
 *
 * The demo is given more than once — in rehearsal, to the judges, and again if they ask
 * to see it a second time. Every run has to start from the same board: the same fund
 * total, the same workers standing in the same places, nothing left over from the last
 * booking. So this re-seeds the store and then stations the demo's workers by hand,
 * rather than leaving it to wherever their phones last reported.
 *
 * Deterministic on purpose: same worker ids, same coordinates, same order, every time.
 */

/** The address the demo books from: the customer's flat in Rajendra Nagar. */
export const DEMO_ADDRESS = castPlaces.rajendraNagar;

/** The member whose phone is in the demo's hands. */
export const DEMO_PARTNER_ID = 'wrk_suresh';

/** How many members are standing by when the demo starts. */
export const DEMO_WORKERS_ONLINE = 8;

/**
 * Where those eight stand, as metres east and north of the demo address. Fixed offsets
 * rather than random scatter: the dispatch map looks the same in every run, and the
 * ranking that follows from the distances is the same one rehearsed.
 */
const STATIONS: ReadonlyArray<readonly [east: number, north: number]> = [
  [420, 180],
  [-600, 350],
  [900, -250],
  [-1100, -700],
  [1600, 800],
  [-1900, 500],
  [2400, -1200],
  [-2600, -1500],
];

const METRES_PER_DEGREE_LAT = 111_320;
const metresToPoint = (origin: GeoPoint, east: number, north: number): GeoPoint => ({
  lat: Math.round((origin.lat + north / METRES_PER_DEGREE_LAT) * 1e6) / 1e6,
  lng: Math.round((origin.lng + east / (METRES_PER_DEGREE_LAT * Math.cos((origin.lat * Math.PI) / 180))) * 1e6) / 1e6,
});

export interface DemoResetResult {
  fundBalance: number;
  workersOnline: Array<{ id: Id; name: string; location: GeoPoint; distanceM: number }>;
  seeded: ReturnType<typeof system.seedSummary>;
  at: string;
}

/**
 * Re-seeds the store, clears every dispatch in flight, and puts the demo's electricians
 * online around the demo address.
 *
 * Connected apps are not told: a reset is run before the apps are opened, or they are
 * pulled down and reopened after it. Doing it mid-run would leave every phone holding
 * bookings the server has just forgotten.
 */
export function resetForDemo(dispatcher: Dispatcher, categoryId = 'cat_electricians'): DemoResetResult {
  dispatcher.reset();
  system.reseed();

  /* Everyone starts offline, so only the eight stationed below are available. */
  for (const worker of workers.list()) if (worker.isOnline) workers.setOnline(worker.id, false);

  /* The demo partner stands closest, because the demo books beside him; the rest by id. */
  const eligible = workers
    .list()
    .filter((worker) => worker.kycStatus === KycStatus.VERIFIED && worker.serviceCategoryIds.includes(categoryId))
    .sort((a, b) => (a.id === DEMO_PARTNER_ID ? -1 : b.id === DEMO_PARTNER_ID ? 1 : a.id < b.id ? -1 : 1))
    .slice(0, DEMO_WORKERS_ONLINE);

  const online = eligible.map((worker, index) => {
    const [east, north] = STATIONS[index % STATIONS.length]!;
    const location = metresToPoint(DEMO_ADDRESS.point, east, north);
    workers.setOnJob(worker.id, false);
    workers.setOnline(worker.id, true, location);
    return {
      id: worker.id,
      name: worker.name,
      location,
      distanceM: Math.round(Math.hypot(east, north)),
    };
  });

  return {
    fundBalance: ledger.coopFundTotal(),
    workersOnline: online,
    seeded: system.seedSummary(),
    at: new Date().toISOString(),
  };
}
