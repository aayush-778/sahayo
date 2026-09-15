'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MapSourceDataEvent } from 'maplibre-gl';
import { BASEMAP_SOURCE_ID, TILE_TIMEOUT_MS } from '@/components/dispatch/map-style';

/**
 * Whether the street tiles are actually arriving.
 *
 * The map's own `load` event is not enough: the style is defined inline, so it loads
 * with the network off and a map would report itself ready while painting nothing but
 * its background. This waits for the first basemap tile instead, and gives up after
 * TILE_TIMEOUT_MS so the caller can swap in the offline SVG map.
 */
export function useTileHealth() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setFailed(true), TILE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  const onSourceData = useCallback((event: MapSourceDataEvent) => {
    if (event.sourceId === BASEMAP_SOURCE_ID && event.tile !== undefined) setReady(true);
  }, []);

  return { ready, failed: failed && !ready, onSourceData };
}
