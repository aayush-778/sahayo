'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Map, NavigationControl } from 'react-map-gl/maplibre';
import { ZoneMapCanvas } from '@/components/dashboard/ZoneMapCanvas';
import { BASEMAP_STYLE } from '@/components/dispatch/map-style';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { count } from '@/lib/format';
import type { ZoneDemandPoint } from '@/lib/services';
import { cn } from '@/lib/utils';
import { DemandHeatSpots, HeatLegend } from './DemandHeatSpots';
import { MEASURES, badgeLabel, measureNoun, type MapMeasure } from './demand-measure';
import './maplibre-worker';
import { useTileHealth } from './use-tile-health';

/** A box around every zone centre, so Bihta in the west and Patna City in the east both fit. */
export function zoneBounds(zones: ZoneDemandPoint[]): [[number, number], [number, number]] {
  const lngs = zones.map((zone) => zone.centroid.lng);
  const lats = zones.map((zone) => zone.centroid.lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export interface DemandMapProps {
  zones: ZoneDemandPoint[];
  className?: string;
}

/**
 * The regional demand heatmap: a real street map of Patna with a glowing heat spot and
 * a numbered badge on every zone.
 *
 * The toggle switches what the spots measure. Clicking a badge opens that zone in
 * Live Dispatch. Scroll-to-zoom is off because this map sits in a scrolling page, where
 * a wheel over it should scroll the page; the zoom buttons and dragging still work.
 *
 * If no street tile arrives within three seconds (venue wifi, airplane mode) the SVG
 * map of the same zones covers the box, labelled as the offline view. The street map
 * stays mounted underneath, so if tiles arrive late the cover lifts by itself.
 */
export function DemandMap({ zones, className }: DemandMapProps) {
  const router = useRouter();
  const [measure, setMeasure] = useState<MapMeasure>('ORDERS');
  const [hovered, setHovered] = useState<ZoneDemandPoint>();
  const tiles = useTileHealth();
  const bounds = useMemo(() => zoneBounds(zones), [zones]);

  const summary = `Street map of Patna with ${zones.length} zones marked by ${measureNoun(measure)}. ${[...zones]
    .sort((a, b) => b.orderCount - a.orderCount)
    .map((zone) => `${zone.zoneName} ${badgeLabel(zone, measure)}`)
    .join(', ')}.`;

  return (
    <div className={cn('relative overflow-hidden rounded-tile border border-hairline bg-ground', className)}>
      <div role="region" aria-label={summary} className="h-full w-full">
        <Map
          mapStyle={BASEMAP_STYLE}
          initialViewState={{ bounds, fitBoundsOptions: { padding: 64 } }}
          dragRotate={false}
          touchZoomRotate={false}
          scrollZoom={false}
          attributionControl={{ compact: true }}
          onSourceData={tiles.onSourceData}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <DemandHeatSpots
            zones={zones}
            measure={measure}
            onHoverZone={setHovered}
            onSelectZone={(zone) => router.push(`/dispatch?zone=${zone.zoneId}`)}
          />
        </Map>
      </div>

      <div className="absolute left-3 top-3 z-10">
        <SegmentedToggle label="Show on the map" options={MEASURES} value={measure} onChange={setMeasure} />
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-tile border border-hairline bg-surface/95 px-3 py-2 shadow-card">
        <HeatLegend measure={measure} />
      </div>

      <div className="pointer-events-none absolute bottom-8 right-3 z-10 max-w-[60%]">
        {hovered ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-tile border border-hairline bg-surface px-3 py-2 shadow-card">
            <span className="text-table font-medium text-ink">{hovered.zoneName}</span>
            <span className="text-pill text-muted">
              <span className="tabular text-ink">{count(hovered.orderCount)}</span> orders
            </span>
            <span className="text-pill text-muted">
              <span className="tabular text-ink">{count(hovered.availableWorkerCount)}</span> of{' '}
              <span className="tabular">{count(hovered.workerCount)}</span> free
            </span>
            <span className="text-pill text-muted">
              <span className="tabular text-ink">{hovered.avgWaitMinutes}</span> min wait
            </span>
          </div>
        ) : (
          <p className="rounded-pill bg-surface/90 px-3 py-1 text-pill text-muted">Select a badge to open that zone in dispatch</p>
        )}
      </div>

      {tiles.failed ? (
        <div className="absolute inset-0 z-20 flex flex-col justify-center overflow-y-auto bg-surface px-4">
          <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-pill border border-hairline bg-surface px-3 py-1.5 text-pill text-muted">
            <span aria-hidden className="h-2 w-2 rounded-full bg-coral" />
            Offline map view. Zone demand is still live.
          </p>
          <ZoneMapCanvas zones={zones} />
        </div>
      ) : null}
    </div>
  );
}
