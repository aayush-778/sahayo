import type { GeoPoint } from '@sahayo/shared';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in metres. */
export function haversineM(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
