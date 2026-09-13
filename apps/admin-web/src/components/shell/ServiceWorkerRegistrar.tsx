'use client';

import { useEffect } from 'react';

/**
 * Registers the offline service worker in production builds.
 *
 * Never in development: a worker serving cached pages would fight hot reloading and
 * show yesterday's code. The build version travels as a query parameter, so each build
 * gets its own cache and the previous one is cleared when it takes over.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const version = process.env.NEXT_PUBLIC_BUILD_VERSION ?? 'dev';
    navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(version)}`).catch((error: unknown) => {
      /* Offline support is an enhancement; the portal works without it. */
      console.warn('Offline support is unavailable in this browser session.', error);
    });
  }, []);

  return null;
}
