import * as Location from 'expo-location';
import type { GeoPoint } from '@sahayo/shared';

import { DEMO_WORKER_BASE } from '../mocks';
import { DEMO_ANCHOR, LOCATION_INTERVAL_MS } from './config';

/**
 * The worker's position while they are online: foreground only, at most one update
 * every LOCATION_INTERVAL_MS, and nothing at all while offline.
 *
 * With DEMO_ANCHOR on, a reading is reported as the demo base (Rajendra Nagar) plus the
 * phone's movement since its first fix, so the partner lands on Patna's map wherever the
 * demo is given. Without permission, the base itself is reported: the worker can still
 * go online and be offered work, which is the point of the demo.
 */

type Report = (location: GeoPoint) => void;

let subscription: Location.LocationSubscription | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let firstFix: GeoPoint | null = null;
let lastReported: GeoPoint = DEMO_WORKER_BASE;
let lastSentAt = 0;
let running = false;

const round5 = (value: number): number => Math.round(value * 1e5) / 1e5;

function toReported(reading: GeoPoint): GeoPoint {
  if (!DEMO_ANCHOR) return { lat: round5(reading.lat), lng: round5(reading.lng) };
  firstFix ??= reading;
  return {
    lat: round5(DEMO_WORKER_BASE.lat + (reading.lat - firstFix.lat)),
    lng: round5(DEMO_WORKER_BASE.lng + (reading.lng - firstFix.lng)),
  };
}

/** The last position reported, or the demo base before any fix. */
export function currentLocation(): GeoPoint {
  return lastReported;
}

/** Starts reporting. Safe to call when already running. Resolves once a first position is known. */
export async function startLocationUpdates(report: Report): Promise<GeoPoint> {
  if (running) return lastReported;
  running = true;
  lastSentAt = 0;

  const send = (location: GeoPoint, force = false): void => {
    lastReported = location;
    const now = Date.now();
    if (!force && now - lastSentAt < LOCATION_INTERVAL_MS) return;
    lastSentAt = now;
    report(location);
  };

  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!running) return lastReported;
    if (permission.status !== 'granted') throw new Error('location permission not granted');

    const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
    if (first) lastReported = toReported({ lat: first.coords.latitude, lng: first.coords.longitude });
    if (!running) return lastReported;

    subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: LOCATION_INTERVAL_MS, distanceInterval: 0 },
      (reading) => send(toReported({ lat: reading.coords.latitude, lng: reading.coords.longitude })),
    );
    if (!running) stopLocationUpdates();
  } catch {
    /* No permission, or no GPS indoors: keep the server's idea of us fresh from the last known point. */
    if (running) fallbackTimer = setInterval(() => send(lastReported, true), LOCATION_INTERVAL_MS);
  }
  return lastReported;
}

/** Stops reporting at once. Safe to call when not running. */
export function stopLocationUpdates(): void {
  running = false;
  subscription?.remove();
  subscription = null;
  if (fallbackTimer) clearInterval(fallbackTimer);
  fallbackTimer = null;
}
