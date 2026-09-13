'use client';

import { useMemo, useState } from 'react';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { count } from '@/lib/format';
import type { ZoneDemandPoint } from '@/lib/services';
import { MEASURES, measureMax, measureValue, type MapMeasure } from '@/components/maps/demand-measure';
import { SURFACE, WATER, WATER_EDGE, demandColor } from './chart-theme';
import {
  GANGA_BAND,
  PATNA_OUTLINE,
  SONE_BAND,
  VIEWBOX,
  createProjection,
  polygonArea,
  toPath,
  voronoiCells,
} from './patna-geography';

/**
 * Patna as a choropleth: real zone areas, filled by demand.
 *
 * This replaced a honeycomb of hexagons, which read as a generated diagram rather
 * than a place. The areas here are a Voronoi partition of the city's outline around
 * the twelve real zone centres, so every boundary sits halfway between two zones —
 * roughly how service areas actually divide — and the shapes are irregular because
 * the city is.
 *
 * No tile provider and no API key: it is arithmetic over a hand-authored outline.
 * That is why it is the offline fallback for both street maps — the dashboard's
 * DemandMap and Live Dispatch — shown only when no street tile arrives.
 */

/**
 * Below this area, in square viewBox units, a cell is too small for its name.
 *
 * Rajendra Nagar is the one zone that falls under it — a narrow wedge between
 * Boring Road and Kankarbagh. Squeezing a label in would overlap its neighbours',
 * so it is identified on hover and focus instead, like every other cell.
 */
const LABEL_AREA_THRESHOLD = 2400;

export interface ZoneMapCanvasProps {
  zones: ZoneDemandPoint[];
  /** Renders the Orders / Workers / Wait toggle above the map. */
  showMeasureToggle?: boolean;
  onSelectZone?: (zone: ZoneDemandPoint) => void;
}

export function ZoneMapCanvas({
  zones,
  showMeasureToggle = true,
  onSelectZone,
}: ZoneMapCanvasProps) {
  const [measure, setMeasure] = useState<MapMeasure>('ORDERS');
  const [hovered, setHovered] = useState<ZoneDemandPoint | undefined>();

  /*
   * The geometry depends only on the zone centres, so it is computed once and not
   * recomputed when the measure changes — only the fills do.
   */
  const geometry = useMemo(() => {
    const project = createProjection([PATNA_OUTLINE, GANGA_BAND, SONE_BAND]);
    const cells = voronoiCells(
      zones.map((zone) => ({ id: zone.zoneId, position: zone.centroid })),
      PATNA_OUTLINE,
      project,
    );

    return {
      ganga: toPath(GANGA_BAND.map(project)),
      sone: toPath(SONE_BAND.map(project)),
      coast: toPath(PATNA_OUTLINE.map(project)),
      cells: cells.map((cell) => ({
        ...cell,
        path: toPath(cell.polygon),
        area: polygonArea(cell.polygon),
      })),
    };
  }, [zones]);

  const max = measureMax(zones, measure);
  const byId = new Map(zones.map((zone) => [zone.zoneId, zone]));

  return (
    <div className="flex flex-col">
      {showMeasureToggle ? (
        <div className="mb-3 flex justify-end">
          <SegmentedToggle
            label="Colour the map by"
            options={MEASURES}
            value={measure}
            onChange={setMeasure}
          />
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Patna, divided into ${zones.length} zones and coloured by ${measure.toLowerCase()}. ${zones
          .slice(0, 3)
          .map((z) => `${z.zoneName} has ${z.orderCount} orders and ${z.availableWorkerCount} workers free`)
          .join('. ')}`}
      >
        {/* The Ganga along the north and the Sone joining from the west. */}
        <path d={geometry.ganga} fill={WATER} />
        <path d={geometry.sone} fill={WATER} />

        {geometry.cells.map((cell) => {
          const zone = byId.get(cell.id);
          if (!zone) return null;
          const value = measureValue(zone, measure, max);
          const isHovered = hovered?.zoneId === cell.id;

          return (
            <path
              key={cell.id}
              d={cell.path}
              fill={demandColor(value)}
              /* A surface-coloured stroke reads as a gap between areas. */
              stroke={SURFACE}
              strokeWidth={isHovered ? 2.5 : 1.5}
              tabIndex={0}
              onMouseEnter={() => setHovered(zone)}
              onMouseLeave={() => setHovered(undefined)}
              onFocus={() => setHovered(zone)}
              onBlur={() => setHovered(undefined)}
              onClick={onSelectZone ? () => onSelectZone(zone) : undefined}
              className="cursor-pointer outline-none focus-visible:stroke-ink"
            >
              <title>
                {zone.zoneName}: {zone.orderCount} orders, {zone.availableWorkerCount} workers
                free, {zone.avgWaitMinutes} minute wait
              </title>
            </path>
          );
        })}

        {/* The city's edge, drawn over the areas so the coastline stays crisp. */}
        <path d={geometry.coast} fill="none" stroke={WATER_EDGE} strokeWidth={1} />

        {/*
         * Labels last, so nothing paints over them. Pointer events are off: the
         * area underneath stays the hover and click target.
         */}
        {geometry.cells.map((cell) => {
          const zone = byId.get(cell.id);
          if (!zone || cell.area <= LABEL_AREA_THRESHOLD) return null;
          return (
            <text
              key={`${cell.id}-label`}
              x={cell.centroid.x}
              y={cell.centroid.y}
              textAnchor="middle"
              aria-hidden
              className="pointer-events-none select-none fill-ink font-sans text-[10px]"
            >
              {zone.zoneName}
            </text>
          );
        })}
      </svg>

      {/* The hover readout, outside the SVG so it uses the product's card treatment. */}
      <div className="mt-3 min-h-[3.25rem]">
        {hovered ? (
          <div className="inline-flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-tile border border-hairline bg-surface px-3 py-2 shadow-card">
            <span className="text-table font-medium text-ink">{hovered.zoneName}</span>
            <span className="text-pill text-muted">
              <span className="tabular text-ink">{count(hovered.orderCount)}</span> orders
            </span>
            <span className="text-pill text-muted">
              <span className="tabular text-ink">{count(hovered.availableWorkerCount)}</span> of{' '}
              <span className="tabular">{count(hovered.workerCount)}</span> workers free
            </span>
            <span className="text-pill text-muted">
              <span className="tabular text-ink">{hovered.avgWaitMinutes}</span> min wait
            </span>
          </div>
        ) : (
          <p className="text-pill text-muted">
            Hover or tab to a zone to see its orders, workers and wait time.
          </p>
        )}
      </div>

      {/* The scale, written as well as shown. */}
      <div className="mt-1 flex items-center gap-3">
        <span className="text-pill text-muted">Quiet</span>
        <div
          aria-hidden
          className="h-1.5 flex-1 rounded-pill"
          style={{
            backgroundImage: `linear-gradient(90deg, ${demandColor(0)}, ${demandColor(
              0.5,
            )}, ${demandColor(1)})`,
          }}
        />
        <span className="text-pill text-muted">High demand</span>
      </div>
    </div>
  );
}
