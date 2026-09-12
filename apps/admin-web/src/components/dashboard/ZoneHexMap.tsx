'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { count } from '@/lib/format';
import type { ZoneDemandPoint } from '@/lib/services';
import { SURFACE, demandColor } from './chart-theme';

/**
 * Where orders are coming from, as a honeycomb of the twelve Patna zones.
 *
 * Inline SVG with no tile provider and no API key, deliberately. A map library
 * here would need a network round trip to render at all, which on venue wifi is
 * the difference between a dashboard and a grey rectangle. The real pan-and-zoom
 * map belongs on the dispatch page, where panning is the point.
 *
 * The layout is a hand-placed axial hex grid that roughly mirrors the city: the
 * Ganga runs along the north, so Danapur and Khagaul sit west, Patna City and
 * Ashok Rajpath east, and Bihta out on its own to the south-west.
 */

/** Axial hex coordinates per zone, by slug. Hand-placed, not generated. */
const HEX_LAYOUT: Record<string, { q: number; r: number }> = {
  danapur: { q: 0, r: 0 },
  patliputra: { q: 1, r: 0 },
  'bailey-road': { q: 2, r: 0 },
  'gandhi-maidan': { q: 3, r: 0 },
  'ashok-rajpath': { q: 4, r: 0 },
  khagaul: { q: 0, r: 1 },
  'phulwari-sharif': { q: 1, r: 1 },
  'boring-road': { q: 2, r: 1 },
  'rajendra-nagar': { q: 3, r: 1 },
  'patna-city': { q: 4, r: 1 },
  bihta: { q: 0, r: 2 },
  kankarbagh: { q: 3, r: 2 },
};

type Measure = 'ORDERS' | 'WORKERS' | 'WAIT';

const MEASURES = [
  { value: 'ORDERS' as const, label: 'Orders' },
  { value: 'WORKERS' as const, label: 'Workers' },
  { value: 'WAIT' as const, label: 'Wait time' },
];

/* Flat-top hexagon geometry, in SVG user units. */
const HEX_W = 58;
const HEX_H = 50;
const GAP = 3;

function hexPoints(cx: number, cy: number): string {
  const w = (HEX_W - GAP) / 2;
  const h = (HEX_H - GAP) / 2;
  return [
    `${cx - w / 2},${cy - h}`,
    `${cx + w / 2},${cy - h}`,
    `${cx + w},${cy}`,
    `${cx + w / 2},${cy + h}`,
    `${cx - w / 2},${cy + h}`,
    `${cx - w},${cy}`,
  ].join(' ');
}

/** The 0–1 value a measure contributes, normalised across the zones shown. */
function measureValue(zone: ZoneDemandPoint, measure: Measure, max: number): number {
  if (max <= 0) return 0;
  if (measure === 'ORDERS') return zone.orderCount / max;
  /*
   * Workers inverts: a zone with FEW available workers should read hot, because
   * the question the map answers is "where is cover thin", not "where are people".
   */
  if (measure === 'WORKERS') return 1 - zone.availableWorkerCount / max;
  return zone.avgWaitMinutes / max;
}

function measureMax(zones: ZoneDemandPoint[], measure: Measure): number {
  return zones.reduce((max, zone) => {
    const raw =
      measure === 'ORDERS'
        ? zone.orderCount
        : measure === 'WORKERS'
          ? zone.availableWorkerCount
          : zone.avgWaitMinutes;
    return Math.max(max, raw);
  }, 0);
}

export function ZoneHexMap({ zones }: { zones?: ZoneDemandPoint[] }) {
  const [measure, setMeasure] = useState<Measure>('ORDERS');
  const [hovered, setHovered] = useState<ZoneDemandPoint | undefined>();

  const cells = useMemo(() => {
    if (!zones) return [];
    const max = measureMax(zones, measure);
    return zones.flatMap((zone) => {
      const slug = zone.zoneId.replace('zone-', '');
      const pos = HEX_LAYOUT[slug];
      if (!pos) return [];
      /* Odd rows shift half a cell right, which is what makes it a honeycomb. */
      const cx = 40 + pos.q * HEX_W * 0.78 + (pos.r % 2 === 1 ? HEX_W * 0.39 : 0);
      const cy = 34 + pos.r * HEX_H * 0.84;
      return [{ zone, cx, cy, value: measureValue(zone, measure, max) }];
    });
  }, [zones, measure]);

  const underserved = (zones ?? []).filter((zone) => zone.underserved).slice(0, 3);

  return (
    <Card className="col-span-12 flex flex-col p-6 lg:col-span-7">
      <SectionHeader
        title="Where orders are coming from"
        subtitle="The twelve zones Sahayo covers in Patna"
        action={
          <SegmentedToggle
            label="Colour the map by"
            options={MEASURES}
            value={measure}
            onChange={setMeasure}
          />
        }
      />

      {zones ? (
        <div className="relative mt-5">
          <svg
            viewBox="0 0 320 160"
            className="h-auto w-full"
            role="img"
            aria-label={`Demand across ${zones.length} Patna zones, coloured by ${measure.toLowerCase()}. ${zones
              .slice(0, 3)
              .map((z) => `${z.zoneName} is busiest with ${z.orderCount} orders`)
              .join('. ')}`}
          >
            {cells.map(({ zone, cx, cy, value }) => (
              <g key={zone.zoneId}>
                <polygon
                  points={hexPoints(cx, cy)}
                  fill={demandColor(value)}
                  stroke={SURFACE}
                  strokeWidth={GAP}
                  tabIndex={0}
                  onMouseEnter={() => setHovered(zone)}
                  onMouseLeave={() => setHovered(undefined)}
                  onFocus={() => setHovered(zone)}
                  onBlur={() => setHovered(undefined)}
                  className="cursor-pointer outline-none focus-visible:stroke-ink"
                >
                  {/*
                   * A native SVG title, so the zone is reachable and announced
                   * without relying on the hover card below.
                   */}
                  <title>
                    {zone.zoneName}: {zone.orderCount} orders, {zone.availableWorkerCount} workers
                    free, {zone.avgWaitMinutes} minute wait
                  </title>
                </polygon>
              </g>
            ))}
          </svg>

          {/*
           * The hover card. Rendered outside the SVG so it can use the product's
           * own card treatment rather than SVG text.
           */}
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
      ) : (
        <Skeleton className="mt-5 h-40 w-full" />
      )}

      {/* Zones where cover is thin, and a way to act on it. */}
      <div className="mt-5 border-t border-hairline pt-4">
        <p className="text-table font-medium text-ink">Zones where cover is thin</p>
        {zones && underserved.length === 0 ? (
          <EmptyState
            className="mt-1"
            title="Every zone has enough workers this week"
            description="Orders and available workers are in balance across all twelve zones. Check back after a demand spike."
          />
        ) : (
          <ul className="mt-2 flex flex-col">
            {(zones ? underserved : [undefined, undefined, undefined]).map((zone, index) => (
              <li
                key={zone?.zoneId ?? index}
                className="flex items-center justify-between gap-4 border-t border-hairline py-2.5 first:border-t-0"
              >
                {zone ? (
                  <>
                    <span className="text-table text-ink">{zone.zoneName}</span>
                    <span className="flex items-baseline gap-3">
                      <span className="text-pill text-muted">
                        <span className="tabular text-ink">{count(zone.orderCount)}</span> orders
                        against{' '}
                        <span className="tabular text-ink">
                          {count(zone.availableWorkerCount)}
                        </span>{' '}
                        workers free
                      </span>
                      <Link
                        href="/dispatch"
                        className="rounded-sm text-pill font-medium text-ink underline decoration-hairline underline-offset-2 hover:decoration-ink"
                      >
                        View in dispatch
                      </Link>
                    </span>
                  </>
                ) : (
                  <Skeleton />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
