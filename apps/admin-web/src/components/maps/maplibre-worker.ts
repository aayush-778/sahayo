import { setWorkerUrl } from 'maplibre-gl';

/**
 * Points MapLibre at its worker script, served from public/maplibre.
 *
 * Imported for its side effect by every component that creates a map, before the map
 * is created. Without it, MapLibre 6 inside a Next bundle cannot find its worker and
 * GeoJSON layers silently never load: see scripts/copy-maplibre-worker.mjs, which
 * copies the files there before every dev and build run.
 */
if (typeof window !== 'undefined') {
  setWorkerUrl(new URL('/maplibre/maplibre-gl-worker.mjs', window.location.origin).href);
}
