import type { GeoPoint } from '@sahayo/shared';

/**
 * Web Mercator projection for the bundled Patna basemap.
 *
 * `assets/images/map-patna.png` is a 1200×1200 crop of the standard
 * OpenStreetMap raster style at zoom 14, stitched from 30 tiles and centred on
 * the customer's pin in `mocks/location.ts`. The numbers below are the exact
 * world-pixel coordinates of its top-left corner at that zoom, emitted by the
 * generator that produced the image — so pins are placed by the same maths
 * that rendered the streets underneath them, not by eyeballing an offset.
 *
 * WHY A STATIC IMAGE AND NOT A MAP LIBRARY. Mapbox and MapLibre both need a
 * custom dev build, which docs/engineering-decisions.md rules out mid-phase — a config plugin
 * rewriting the native manifest for a library we will not really use until
 * Phase 5 is exactly the risk it warns about. react-native-maps needs a
 * Google key with a billing account attached. And every live map is a network
 * dependency on the one screen being demonstrated: on bad venue Wi-Fi they
 * all render grey. A bundled image cannot fail.
 *
 * The swap is contained. Every caller passes `GeoPoint`s, never pixels, so
 * replacing `WorkerMap` with a real map view in Phase 5 touches one file.
 *
 * ATTRIBUTION IS REQUIRED. The tiles are © OpenStreetMap contributors, and
 * `WorkerMap` renders that credit over the image. Do not remove it.
 */

const ZOOM = 14;
const TILE_SIZE = 256;

/** World-pixel coordinates of the image's top-left corner at ZOOM. */
const ORIGIN_X = 3088683;
const ORIGIN_Y = 1787824;

/** The image's intrinsic size, in pixels. */
export const MAP_IMAGE_WIDTH = 1200;
export const MAP_IMAGE_HEIGHT = 1200;

/** The point the image is centred on — the customer's service location. */
export const MAP_CENTRE: GeoPoint = { lat: 25.6013, lng: 85.1553 };

const WORLD_SIZE = TILE_SIZE * 2 ** ZOOM;

/**
 * Ground resolution at the map's centre latitude, in metres per image pixel.
 *
 * Mercator scale varies with latitude, but the image spans about 9 km of it,
 * over which the error is well under a pixel. One constant is honest here.
 */
export const MAP_METRES_PER_PIXEL =
  (156543.03392 * Math.cos((MAP_CENTRE.lat * Math.PI) / 180)) / 2 ** ZOOM;

/** Where a point falls in the image, as a 0..1 fraction of width and height. */
export interface MapFraction {
  x: number;
  y: number;
}

export function projectToMap(point: GeoPoint): MapFraction {
  const worldX = ((point.lng + 180) / 360) * WORLD_SIZE;

  const sin = Math.sin((point.lat * Math.PI) / 180);
  const worldY = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * WORLD_SIZE;

  return {
    x: (worldX - ORIGIN_X) / MAP_IMAGE_WIDTH,
    y: (worldY - ORIGIN_Y) / MAP_IMAGE_HEIGHT,
  };
}

/** A ground distance as a fraction of the image's width. */
export function metresToFraction(metres: number): number {
  return metres / MAP_METRES_PER_PIXEL / MAP_IMAGE_WIDTH;
}
