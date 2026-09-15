/**
 * Copies MapLibre's worker scripts into public/maplibre, where the browser can load them.
 *
 * MapLibre 6 locates its worker relative to its own module file. Once Next bundles the
 * library that location is no longer a web URL, MapLibre falls back to an empty worker
 * URL, and the browser starts the page itself as the worker. GeoJSON sources (worker
 * dots, request pins) then never load and the map never fires its load event. Serving
 * the two files from public/ and calling setWorkerUrl fixes that.
 *
 * Run before dev and build, so the copies always match the installed version. The
 * output is gitignored.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const dist = join(dirname(require.resolve('maplibre-gl/package.json')), 'dist');
const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'maplibre');

mkdirSync(target, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(dist, file), join(target, file));
}
console.log('Copied the MapLibre worker to public/maplibre.');
