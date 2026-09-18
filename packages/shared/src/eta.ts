import type { GeoPoint } from './types/common';

/**
 * Minutes until a worker could be at the door, from a straight-line distance.
 *
 * An assumed city speed plus a fixed overhead for setting off. Guesses, named as such —
 * a routing call replaces the whole function. Moved here from the customer app so the
 * tracker quotes the same ETA from a live position as the booking screen did from a mock.
 */
export const CITY_SPEED_KMPH = 15;
export const DISPATCH_OVERHEAD_MIN = 4;

export function etaMinutesFor(metres: number): number {
  const travel = (metres / 1000 / CITY_SPEED_KMPH) * 60;
  return Math.max(1, Math.round(travel + DISPATCH_OVERHEAD_MIN));
}

/** Great-circle distance in metres. */
export function metresBetween(a: GeoPoint, b: GeoPoint): number {
  const toRad = (degrees: number): number => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}
