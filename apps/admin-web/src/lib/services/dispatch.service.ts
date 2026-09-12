import {
  BookingStatus,
  type AdminBooking,
  type AdminWorker,
  type EquityScoreInputs,
  type Zone,
} from '@sahayo/shared';
import { DAY_MS, SEED_NOW, computeEquityScore } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';

/** Statuses that put a booking in the live dispatch queue. */
const LIVE_STATUSES: ReadonlySet<AdminBooking['status']> = new Set([
  BookingStatus.REQUESTED,
  BookingStatus.BROADCAST,
  BookingStatus.ACCEPTED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
]);

export interface LiveMap {
  zones: Zone[];
  /** Every verified worker, whether online or not — the map dims the offline ones. */
  workers: AdminWorker[];
  /** Bookings currently in flight, newest first. */
  liveBookings: AdminBooking[];
}

export async function getLiveMap(): Promise<LiveMap> {
  const { zones, workers, bookings } = adminState();

  const liveBookings = bookings
    .filter((booking) => LIVE_STATUSES.has(booking.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return respond({
    zones,
    workers: workers.filter((worker) => worker.kycStatus === 'VERIFIED'),
    liveBookings,
  });
}

/** One row of the ranked list the Broadcast Inspector shows. */
export interface RankedCandidate {
  worker: AdminWorker;
  /** Straight-line distance from the job, in kilometres. */
  distanceKm: number;
  /** The three inputs, so the weighting can be shown rather than asserted. */
  inputs: EquityScoreInputs;
  score: number;
  /** 1-based position in the ranking. */
  rank: number;
  accepted: boolean;
}

export interface Broadcast {
  booking: AdminBooking;
  /** The geofence the request went out to, in kilometres. */
  radiusKm: number;
  candidates: RankedCandidate[];
  /** The zone's average weekly job count, which the plain-language line quotes. */
  zoneAverageJobs: number;
}

/** Great-circle distance in kilometres. */
function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * earthRadiusKm * Math.asin(Math.sqrt(h)) * 100) / 100;
}

/** The highest weekly job count, which normalises the inverse-allocation input. */
function maxJobsThisWeek(workers: AdminWorker[]): number {
  return workers.reduce((max, worker) => Math.max(max, worker.jobsThisWeek), 1);
}

/** Outer bound of a broadcast, in kilometres. Proximity is normalised against it. */
const BROADCAST_RADIUS_KM = 5;

/**
 * Where a worker is standing.
 *
 * `AdminWorker` carries no live position — in production that arrives over the
 * socket from the worker app's background location. Here it is derived
 * deterministically from the worker's zone centroid, offset by two stable values
 * from their own record, so a worker sits in the same place on every reload and
 * the distances the Broadcast Inspector prints do not change between looks.
 */
function workerPosition(
  worker: AdminWorker,
  zones: Zone[],
): { lat: number; lng: number } | undefined {
  const zone = zones.find((candidate) => candidate.id === worker.zoneId);
  if (!zone) return undefined;
  /* ±0.02 degrees is roughly ±2km, which fits inside a broadcast radius. */
  return {
    lat: zone.centroid.lat + (worker.equityInputs.proximity - 0.5) * 0.04,
    lng: zone.centroid.lng + (worker.equityInputs.rating - 0.5) * 0.04,
  };
}

/**
 * Reconstructs why the dispatcher offered a booking to whom.
 *
 * The ranking is computed here, live, from the same `computeEquityScore` the seed
 * used — NOT read from a stored list. That is the whole point of the Broadcast
 * Inspector: it shows the actual arithmetic, so the claim that a worker was ranked
 * first for taking fewer jobs is verifiable on screen rather than asserted.
 *
 * A production implementation would read this from the dispatch log rather than
 * recompute it, because by then the inputs will have moved on. The shape is the
 * same either way.
 */
export async function getBroadcast(bookingId: string): Promise<Broadcast | undefined> {
  const { bookings, workers, zones } = adminState();
  const booking = bookings.find((candidate) => candidate.id === bookingId);
  if (!booking) return respond(undefined);

  const inZone = workers.filter(
    (worker) => worker.zoneId === booking.zoneId && worker.kycStatus === 'VERIFIED',
  );
  const maxJobs = maxJobsThisWeek(workers);

  /* How many workers the request actually reached, from the booking's own timeline. */
  const pingedEvent = booking.timeline.find((event) => event.workersPinged !== undefined);
  const pingedCount = pingedEvent?.workersPinged ?? Math.min(7, inZone.length);

  const candidates: RankedCandidate[] = inZone
    .map((worker) => {
      const position = workerPosition(worker, zones);
      const km = position ? distanceKm(booking.location, position) : BROADCAST_RADIUS_KM;

      const inputs: EquityScoreInputs = {
        /* Nearer is better, normalised against the broadcast radius. */
        proximity: Math.max(0, Math.min(1, 1 - km / BROADCAST_RADIUS_KM)),
        rating: Math.round(((worker.rating - 3.6) / (5 - 3.6)) * 1000) / 1000,
        /*
         * The input that makes this dispatcher different: taking FEW jobs this
         * week scores HIGH, which is how a quiet worker outranks a busy one who
         * happens to be closer.
         */
        inverseAllocation: Math.round((1 - worker.jobsThisWeek / maxJobs) * 1000) / 1000,
      };

      return { worker, distanceKm: km, inputs, score: computeEquityScore(inputs) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, pingedCount)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      accepted: entry.worker.id === booking.workerId,
    }));

  const zoneAverageJobs = inZone.length
    ? Math.round(inZone.reduce((sum, worker) => sum + worker.jobsThisWeek, 0) / inZone.length)
    : 0;

  return respond({
    booking,
    radiusKm: BROADCAST_RADIUS_KM,
    candidates,
    zoneAverageJobs,
  });
}

export interface ZoneDemandPoint {
  zoneId: string;
  zoneName: string;
  centroid: { lat: number; lng: number };
  orderCount: number;
  workerCount: number;
  availableWorkerCount: number;
  avgWaitMinutes: number;
  /** 0–1 pressure, used to colour both the hex map and the heatmap layer. */
  demandIndex: number;
  /** True where orders outnumber available workers. */
  underserved: boolean;
}

/**
 * Demand per zone, derived from the bookings and workers in the store.
 *
 * `demandIndex` is a ratio of orders to available workers, normalised across the
 * twelve zones. A quiet zone with almost no workers can therefore read as high
 * demand, which is the behaviour that matters: the figure is about unmet need,
 * not raw volume.
 */
export async function getZoneDemand(): Promise<ZoneDemandPoint[]> {
  const { zones, bookings, workers } = adminState();

  /*
   * Pressure is measured on the last seven days, not on the full 90-day history.
   * Against 90 days of orders every zone looks overwhelmed, because the order
   * count is cumulative while the worker count is a snapshot — which is how an
   * earlier version of this flagged all twelve zones as underserved and made the
   * dashboard's "Underserved zones" list meaningless.
   */
  const weekStart = new Date(SEED_NOW.getTime() - 7 * DAY_MS).toISOString();

  const raw = zones.map((zone) => {
    const zoneBookings = bookings.filter((booking) => booking.zoneId === zone.id);
    const recentOrders = zoneBookings.filter((booking) => booking.createdAt >= weekStart).length;
    const zoneWorkers = workers.filter((worker) => worker.zoneId === zone.id);
    const available = zoneWorkers.filter((worker) => worker.isOnline && !worker.isOnJob);

    /* Orders per available worker. One is the floor, so an empty zone is not infinite. */
    const pressure = recentOrders / Math.max(1, available.length);

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      centroid: zone.centroid,
      orderCount: zoneBookings.length,
      workerCount: zoneWorkers.length,
      availableWorkerCount: available.length,
      /* Wait grows with pressure. Eight minutes is the floor in a well-supplied zone. */
      avgWaitMinutes: Math.round(8 + pressure * 1.4),
      pressure,
    };
  });

  const maxPressure = raw.reduce((max, zone) => Math.max(max, zone.pressure), 1);
  /*
   * Underserved means worse than the city average, so the flag stays meaningful
   * however busy the platform gets as a whole. A fixed threshold would either
   * flag everything on a busy week or nothing on a quiet one.
   */
  const meanPressure = raw.reduce((sum, zone) => sum + zone.pressure, 0) / (raw.length || 1);

  const points: ZoneDemandPoint[] = raw.map(({ pressure, ...zone }) => ({
    ...zone,
    demandIndex: Math.round((pressure / maxPressure) * 1000) / 1000,
    underserved: pressure > meanPressure,
  }));

  /* Worst first, so a caller can take the top three without sorting again. */
  return respond(points.sort((a, b) => b.demandIndex - a.demandIndex));
}

/** A GeoJSON point feature carrying a demand weight. */
export interface HeatmapFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { weight: number; zoneId: string };
}

export interface HeatmapGeoJSON {
  type: 'FeatureCollection';
  features: HeatmapFeature[];
}

/**
 * Pre-aggregated demand points for the MapLibre heatmap layer.
 *
 * IN PRODUCTION this aggregation moves to PostGIS — `ST_ClusterDBSCAN` over the
 * bookings table, grouped by cluster and weighted by count — and this function
 * becomes a `fetch` of that endpoint. It is done client-side here only because
 * there is no backend yet; the shape it returns is the shape the endpoint will
 * return, so the map layer does not change when the swap happens.
 */
export async function getHeatmapGeoJSON(): Promise<HeatmapGeoJSON> {
  const { bookings, zones } = adminState();
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));

  const counts = new Map<string, number>();
  for (const booking of bookings) {
    counts.set(booking.zoneId, (counts.get(booking.zoneId) ?? 0) + 1);
  }

  const maxCount = [...counts.values()].reduce((max, count) => Math.max(max, count), 1);

  const features: HeatmapFeature[] = [];
  for (const [zoneId, count] of counts) {
    const zone = zoneById.get(zoneId);
    if (!zone) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [zone.centroid.lng, zone.centroid.lat] },
      properties: { weight: Math.round((count / maxCount) * 1000) / 1000, zoneId },
    });
  }

  return respond({ type: 'FeatureCollection', features });
}
