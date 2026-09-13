'use client';

import { Marker } from 'react-map-gl/maplibre';
import { useMemo } from 'react';
import type { ZoneDemandPoint } from '@/lib/services';
import { cn } from '@/lib/utils';
import { badgeLabel, heatTiers, measureNoun, type HeatTier, type MapMeasure } from './demand-measure';

/** Glow diameter in pixels, by tier. Hotter zones spread further. */
const GLOW_SIZE: Record<HeatTier, number> = { high: 132, medium: 100, low: 76 };

export interface DemandHeatSpotsProps {
  zones: ZoneDemandPoint[];
  measure: MapMeasure;
  /** When given, each badge is a button. Otherwise the spots ignore the pointer. */
  onSelectZone?: (zone: ZoneDemandPoint) => void;
  onHoverZone?: (zone: ZoneDemandPoint | undefined) => void;
}

/**
 * Glowing heat spots with a numbered badge, one per zone, placed on a MapLibre map.
 *
 * The glow is a CSS radial gradient in the palette (coral, marigold, lavender), so it
 * costs nothing to draw, and the number on top is real text: readable at any zoom and
 * reachable by screen readers, which a WebGL heat layer is not.
 *
 * Drawn in two passes. Every glow goes down first, quietest to hottest so the hottest
 * blend on top, and then every badge above all of them. In one pass a hot zone's glow
 * painted over its neighbours' badges in the crowded city core and tinted them.
 */
export function DemandHeatSpots({ zones, measure, onSelectZone, onHoverZone }: DemandHeatSpotsProps) {
  const tiers = useMemo(() => heatTiers(zones, measure), [zones, measure]);
  const ordered = useMemo(
    () => [...zones].sort((a, b) => (tiers.get(a.zoneId)?.heat ?? 0) - (tiers.get(b.zoneId)?.heat ?? 0)),
    [zones, tiers],
  );

  return (
    <>
      {ordered.map((zone) => {
        const tier = tiers.get(zone.zoneId)?.tier ?? 'low';
        const size = GLOW_SIZE[tier];
        return (
          <Marker
            key={`glow-${zone.zoneId}`}
            longitude={zone.centroid.lng}
            latitude={zone.centroid.lat}
            anchor="center"
            className="pointer-events-none"
          >
            <div aria-hidden className={cn('heat-spot', `heat-spot-${tier}`)} style={{ width: size, height: size }} />
          </Marker>
        );
      })}

      {ordered.map((zone) => {
        const label = `${zone.zoneName}: ${badgeLabel(zone, measure)} ${measureNoun(measure)}`;
        const badge = <span className="heat-badge tabular">{badgeLabel(zone, measure)}</span>;
        const hover = onHoverZone
          ? { onMouseEnter: () => onHoverZone(zone), onMouseLeave: () => onHoverZone(undefined) }
          : {};

        return (
          <Marker
            key={`badge-${zone.zoneId}`}
            longitude={zone.centroid.lng}
            latitude={zone.centroid.lat}
            anchor="center"
            /* Zones sit close in the city core; the one under the pointer or focus comes to the front. */
            className={cn('focus-within:z-10 hover:z-10', !onSelectZone && 'pointer-events-none')}
          >
            {onSelectZone ? (
              <button
                type="button"
                aria-label={`${label}. Open in live dispatch`}
                title={label}
                onClick={() => onSelectZone(zone)}
                onFocus={onHoverZone ? () => onHoverZone(zone) : undefined}
                onBlur={onHoverZone ? () => onHoverZone(undefined) : undefined}
                className="rounded-pill"
                {...hover}
              >
                {badge}
              </button>
            ) : (
              <span title={label}>{badge}</span>
            )}
          </Marker>
        );
      })}
    </>
  );
}

/** The three tiers, in words, for a map legend. */
export function HeatLegend({ measure, className }: { measure: MapMeasure; className?: string }) {
  const wording: Record<MapMeasure, [string, string, string]> = {
    ORDERS: ['Most orders', 'Some', 'Fewest'],
    WORKERS: ['Fewest free workers', 'Some', 'Well covered'],
    WAIT: ['Longest wait', 'Moderate', 'Shortest'],
  };
  const [high, medium, low] = wording[measure];
  return (
    <ul className={cn('flex flex-col gap-1', className)}>
      {[
        { tier: 'high', label: high },
        { tier: 'medium', label: medium },
        { tier: 'low', label: low },
      ].map((entry) => (
        <li key={entry.tier} className="flex items-center gap-2 text-pill text-muted">
          <span aria-hidden className={cn('heat-legend-dot', `heat-spot-${entry.tier}`)} />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}
