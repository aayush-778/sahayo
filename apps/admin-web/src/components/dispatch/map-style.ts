import type { StyleSpecification } from 'maplibre-gl';
import { mapColor } from './map-colors';

/**
 * The basemap.
 *
 * OpenStreetMap raster tiles through a plain raster source — no API key, no
 * account, nothing to rate-limit a demo on venue wifi. That was the whole reason
 * for choosing MapLibre over Mapbox here.
 *
 * Kept deliberately simple and Mapbox-GL-compatible: switching to Mapbox vector
 * tiles later is a change to this one object and nothing else. The data layers in
 * DispatchMap use only expressions both libraries support.
 */
export const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  /*
   * No glyphs or sprite are declared because no layer here draws a label or an
   * icon. Declaring a font endpoint we do not use would add a network dependency
   * that could fail, for no benefit.
   */
  sources: {
    osm: {
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
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        /*
         * Geography pushed almost to greyscale and lightened, so the data layers
         * read first. A full-colour basemap competes with the worker dots and the
         * heatmap for exactly the attention they need.
         */
        'raster-saturation': -0.86,
        'raster-contrast': -0.16,
        'raster-brightness-min': 0.42,
        'raster-opacity': 0.62,
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
 * How long to wait for tiles before giving up and showing the SVG fallback.
 *
 * Three seconds. The demo must never show a grey rectangle, and a map that has
 * not painted in three seconds will not paint in time to be useful either.
 */
export const TILE_TIMEOUT_MS = 3000;
