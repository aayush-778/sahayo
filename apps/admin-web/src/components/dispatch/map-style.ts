import type { StyleSpecification } from 'maplibre-gl';
import { mapColor } from './map-colors';

/** The id of the street tile source, which the tile-health check listens for. */
export const BASEMAP_SOURCE_ID = 'basemap';

/**
 * The basemap.
 *
 * OpenStreetMap's standard raster tiles: a real street map with no API key and no
 * account. CARTO's Positron tiles were tried and render an "API key required"
 * watermark without a CARTO account, so they are not usable for a key-free demo.
 * The tiles are pushed toward greyscale below so the heat spots and worker dots read
 * first. Switching to a paid or self-hosted tile service later is a change to this one
 * object.
 */
export const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  /*
   * No glyphs or sprite are declared because no layer here draws a label or an
   * icon. Declaring a font endpoint we do not use would add a network dependency
   * that could fail, for no benefit.
   */
  sources: {
    [BASEMAP_SOURCE_ID]: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      /* The paper ground shows through wherever tiles have not painted yet. */
      id: 'background',
      type: 'background',
      paint: { 'background-color': mapColor('ground') },
    },
    {
      id: BASEMAP_SOURCE_ID,
      type: 'raster',
      source: BASEMAP_SOURCE_ID,
      paint: {
        /*
         * Streets pushed almost to greyscale and lightened, so the data on top reads
         * first. A full-colour basemap competes with the heat spots for attention.
         */
        'raster-saturation': -0.86,
        'raster-contrast': -0.16,
        'raster-brightness-min': 0.42,
        'raster-opacity': 0.7,
      },
    },
  ],
};

/** Patna, framed so all twelve zones sit in view. */
export const INITIAL_VIEW = {
  longitude: 85.12,
  latitude: 25.6,
  zoom: 11.2,
} as const;

/**
 * How long to wait for the first street tile before showing the SVG fallback.
 *
 * Three seconds. The demo must never show a grey rectangle, and a map that has
 * not painted in three seconds will not paint in time to be useful either.
 */
export const TILE_TIMEOUT_MS = 3000;
