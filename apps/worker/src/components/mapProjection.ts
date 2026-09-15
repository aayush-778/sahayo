import type { GeoPoint } from '@sahayo/shared';

/**
 * Web Mercator projection for the bundled Patna basemap.
 *
 * THE SAME MAP APPROACH AS THE CUSTOMER APP, deliberately — not a second one.
 * `assets/images/map-patna.png` is a byte-identical copy of the customer app's
 * image, and these constants are copied from its
 * `src/components/booking/mapProjection.ts`: a 1200×1200 crop of the standard
 * OpenStreetMap raster at zoom 14, centred on Rajendra Nagar. See that file for
 * why the demo uses a bundled image and no map library. When Phase 5 swaps in a
 * live map, both apps swap together.
 *
 * ATTRIBUTION IS REQUIRED. The tiles are © OpenStreetMap contributors, and
 * JobMap renders that credit over the image. Do not remove it.
 */

const ZOOM = 14;
const TILE_SIZE = 256;

/** World-pixel coordinates of the image's top-left corner at ZOOM. */
const ORIGIN_X = 3088683;
const ORIGIN_Y = 1787824;

/** The image's intrinsic size, in pixels. */
const MAP_IMAGE_SIZE = 1200;

const WORLD_SIZE = TILE_SIZE * 2 ** ZOOM;

/** Where a point falls in the image, as a 0..1 fraction of its width and height. */
export function projectToMap(point: GeoPoint): { x: number; y: number } {
  const worldX = ((point.lng + 180) / 360) * WORLD_SIZE;
  const sin = Math.sin((point.lat * Math.PI) / 180);
  const worldY = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * WORLD_SIZE;
  return { x: (worldX - ORIGIN_X) / MAP_IMAGE_SIZE, y: (worldY - ORIGIN_Y) / MAP_IMAGE_SIZE };
}
