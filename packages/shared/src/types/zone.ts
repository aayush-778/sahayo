import type { GeoPoint, Id } from './common';

/**
 * An operating zone — a named neighbourhood the dispatcher reasons about.
 *
 * Zones are the unit of supply and demand in this platform. A booking belongs to
 * one, a worker is based in one, and the equity dispatcher compares a worker's
 * job count against their zone's average rather than against the whole city.
 */
export interface Zone {
  id: Id;
  /** Stable machine key, e.g. `boring-road`. */
  slug: string;
  name: string;
  /** The point a zone's bookings are jittered around, and the map flies to. */
  centroid: GeoPoint;
  /** Axis-aligned bounds, enough to draw the zone and to test containment. */
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
}

/**
 * A zone's live operating picture, recomputed rather than stored.
 *
 * Kept separate from `Zone` because a zone's identity and geography are static
 * while these figures change with every booking. In production this is a query
 * result, not a row.
 */
export interface ZoneDemand {
  zoneId: Id;
  orderCount: number;
  workerCount: number;
  avgWaitMinutes: number;
  /**
   * Demand pressure, 0 to 1, used to colour the heatmap. It is a normalised
   * ratio of orders to available workers, so a quiet zone with few workers can
   * still read as high demand — which is the point.
   */
  demandIndex: number;
}
