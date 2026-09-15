import type { ZoneDemandPoint } from '@/lib/services';

/**
 * What the demand maps can show per zone, and how a zone ranks on it.
 *
 * Shared by the street map's heat spots and the SVG fallback, so switching between
 * them never changes which zones read hot.
 */

export type MapMeasure = 'ORDERS' | 'WORKERS' | 'WAIT';

export const MEASURES = [
  { value: 'ORDERS' as const, label: 'Orders' },
  { value: 'WORKERS' as const, label: 'Workers' },
  { value: 'WAIT' as const, label: 'Wait time' },
];

function raw(zone: ZoneDemandPoint, measure: MapMeasure): number {
  if (measure === 'ORDERS') return zone.orderCount;
  if (measure === 'WORKERS') return zone.availableWorkerCount;
  return zone.avgWaitMinutes;
}

export function measureMax(zones: ZoneDemandPoint[], measure: MapMeasure): number {
  return zones.reduce((max, zone) => Math.max(max, raw(zone, measure)), 0);
}

/** The 0–1 value a measure contributes, normalised against the highest zone. */
export function measureValue(zone: ZoneDemandPoint, measure: MapMeasure, max: number): number {
  if (max <= 0) return 0;
  /*
   * Workers inverts: a zone with FEW available workers should read hot, because the
   * question the map answers is "where is cover thin", not "where are people".
   */
  if (measure === 'WORKERS') return 1 - raw(zone, measure) / max;
  return raw(zone, measure) / max;
}

export type HeatTier = 'high' | 'medium' | 'low';

/**
 * Each zone's heat tier, by rank across the zones shown: the hottest third high, the
 * middle third medium, the quietest third low.
 *
 * By rank rather than by value. One busy zone can have nearly twice the orders of the
 * next, and scaled by value that single outlier took "high" alone while everything
 * else sank to low, which hides the differences a dispatcher needs to see.
 */
export function heatTiers(zones: ZoneDemandPoint[], measure: MapMeasure): Map<string, { tier: HeatTier; heat: number }> {
  /* Hottest first. For workers, fewer free is hotter. */
  const ranked = [...zones].sort((a, b) =>
    measure === 'WORKERS' ? raw(a, measure) - raw(b, measure) : raw(b, measure) - raw(a, measure),
  );
  const result = new Map<string, { tier: HeatTier; heat: number }>();
  const last = Math.max(1, ranked.length - 1);
  ranked.forEach((zone, index) => {
    const heat = 1 - index / last;
    const third = index / ranked.length;
    result.set(zone.zoneId, { tier: third < 1 / 3 ? 'high' : third < 2 / 3 ? 'medium' : 'low', heat });
  });
  return result;
}

/** The number a zone's badge shows. */
export function badgeLabel(zone: ZoneDemandPoint, measure: MapMeasure): string {
  if (measure === 'WAIT') return `${zone.avgWaitMinutes}m`;
  return raw(zone, measure).toLocaleString('en-IN');
}

/** The measure, in words, for legends and readouts. */
export function measureNoun(measure: MapMeasure): string {
  if (measure === 'ORDERS') return 'orders';
  if (measure === 'WORKERS') return 'workers free';
  return 'minute wait';
}
