/*
 * Sahayo Admin — offline support.
 *
 * The prototype runs entirely in the browser on seeded data, so once its code is on the
 * device there is nothing the network is needed for. This worker makes that true across
 * a reload: a demo that loses its venue wi-fi, or a laptop switched to airplane mode,
 * still opens every page instead of the browser's offline screen.
 *
 *   /_next/static/*   cache first. File names carry a content hash, so a cached copy is
 *                     never stale.
 *   page navigations  network first, falling back to the cached page after a short
 *                     wait, so a slow connection does not hold the page hostage.
 *   everything else   left to the browser. Map tiles and avatars already fall back in
 *                     the page itself.
 *
 * On install every route in /offline-manifest (every sidebar page and every worker
 * profile) is fetched, along with every script, stylesheet and font its HTML references,
 * so a page never visited before still opens offline. The cache is named after the
 * build, and older caches are deleted when a new build takes over.
 */

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `sahayo-admin-${VERSION}`;
const NAVIGATION_TIMEOUT_MS = 3500;

/* Used only if the build-time manifest cannot be read. */
const FALLBACK_ROUTES = ['/dashboard'];

async function routesToPrecache() {
  try {
    const response = await fetch('/offline-manifest', { cache: 'no-store' });
    if (response.ok) return (await response.json()).routes;
  } catch {
    /* Fall through to the minimum. */
  }
  return FALLBACK_ROUTES;
}

/** Every /_next/static asset an HTML document refers to. */
function assetsIn(html) {
  const found = new Set();
  const pattern = /\/_next\/static\/[^"'\s)\\]+/g;
  let match;
  while ((match = pattern.exec(html)) !== null) found.add(match[0]);
  return [...found];
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const assets = new Set();
      const routes = await routesToPrecache();
      for (const route of routes) {
        try {
          const response = await fetch(route, { credentials: 'same-origin' });
          if (!response.ok) continue;
          const html = await response.clone().text();
          await cache.put(route, response);
          assetsIn(html).forEach((asset) => assets.add(asset));
        } catch {
          /* One route failing to precache must not stop the others. */
        }
      }
      await Promise.all(
        [...assets].map((asset) =>
          cache.match(asset).then((hit) => hit || fetch(asset).then((res) => (res.ok ? cache.put(asset, res) : undefined)).catch(() => undefined)),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith('sahayo-admin-') && name !== CACHE).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const url = new URL(request.url);
  /* Pages are cached by path: a query string never changes the HTML shell. */
  const key = url.pathname === '/' ? '/dashboard' : url.pathname;

  const network = fetch(request).then((response) => {
    if (response.ok && response.type === 'basic' && !response.redirected) cache.put(key, response.clone());
    return response;
  });

  const cached = await cache.match(key);
  if (!cached) {
    try {
      return await network;
    } catch {
      return (await cache.match('/dashboard')) || Response.error();
    }
  }

  /* If the cached page wins the race, a network failure afterwards is expected, not an error. */
  network.catch(() => undefined);
  const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NAVIGATION_TIMEOUT_MS));
  try {
    return await Promise.race([network, timeout]);
  } catch {
    return cached;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  }
});
