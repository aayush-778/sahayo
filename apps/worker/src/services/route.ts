import type { BookingAddress } from '@sahayo/shared';

import { DEMO_WORKER_BASE } from '../mocks';

type Point = BookingAddress['point'];

/**
 * Distance and travel time from the worker to a job.
 *
 * Straight-line maths with two honest corrections, until Phase 5 routes over
 * real roads from the worker's live position.
 */

/**
 * Straight-line metres between two points. Equirectangular, the same formula
 * the customer app uses: over a city this size it agrees with haversine to
 * well under a metre, and it is legible.
 */
export function metresBetween(a: Point, b: Point): number {
  const metresPerDegLat = 111_000;
  const metresPerDegLng = 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot((a.lat - b.lat) * metresPerDegLat, (a.lng - b.lng) * metresPerDegLng);
}

/** Streets are not straight lines; city roads run about 30% longer. */
const ROAD_FACTOR = 1.3;

/** A two-wheeler in city traffic, about 18 km/h. */
const METRES_PER_MINUTE = 300;

export interface TravelEstimate {
  distanceM: number;
  etaMinutes: number;
}

export function travelFromBase(to: Point): TravelEstimate {
  const road = metresBetween(DEMO_WORKER_BASE, to) * ROAD_FACTOR;
  return { distanceM: Math.round(road), etaMinutes: Math.max(2, Math.round(road / METRES_PER_MINUTE)) };
}

/** Where the worker is starting from — their base until Phase 5 has GPS. */
export function workerBase(): Point {
  return DEMO_WORKER_BASE;
}
