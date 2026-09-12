'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import type { MapRef } from 'react-map-gl/maplibre';
import { Layer, Map, NavigationControl, Source } from 'react-map-gl/maplibre';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminBooking } from '@sahayo/shared';
import { ZoneHexCanvas } from '@/components/dashboard/ZoneHexCanvas';
import type { HeatmapGeoJSON, MappedWorker, ZoneDemandPoint } from '@/lib/services';
import { mapColor } from './map-colors';
import { BASEMAP_STYLE, INITIAL_VIEW, TILE_TIMEOUT_MS } from './map-style';

export interface DispatchLayerVisibility {
  workers: boolean;
  requests: boolean;
  demand: boolean;
}

export interface DispatchMapProps {
  workers: MappedWorker[];
  liveBookings: AdminBooking[];
  heatmap: HeatmapGeoJSON;
  zones: ZoneDemandPoint[];
  layers: DispatchLayerVisibility;
  selectedBookingId?: string;
  /** Geofence to draw around the selected booking, in kilometres. */
  geofenceKm?: number;
  onSelectBooking: (bookingId: string) => void;
}

/** A circle approximated as a GeoJSON polygon, for the geofence ring. */
function circlePolygon(
  centre: { lat: number; lng: number },
  radiusKm: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coordinates: [number, number][] = [];
  /* Degrees of longitude shrink with latitude; degrees of latitude do not. */
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.cos((centre.lat * Math.PI) / 180));

  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * 2 * Math.PI;
    coordinates.push([
      centre.lng + lngDelta * Math.cos(angle),
      centre.lat + latDelta * Math.sin(angle),
    ]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coordinates] },
  };
}

/**
 * The live dispatch map.
 *
 * MapLibre with key-free OpenStreetMap raster tiles, and a hard rule: if nothing
 * has painted within three seconds, the SVG honeycomb from the dashboard takes the
 * same slot with an "Offline map view" label. The demo must never show a grey
 * rectangle, and on venue wifi that is not a hypothetical.
 *
 * Every data layer uses expressions that Mapbox GL supports too, so switching to
 * Mapbox tiles later is a change to map-style.ts alone.
 */
export function DispatchMap({
  workers,
  liveBookings,
  heatmap,
  zones,
  layers,
  selectedBookingId,
  geofenceKm = 5,
  onSelectBooking,
}: DispatchMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [tilesReady, setTilesReady] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);

  /* The three-second deadline. Cleared as soon as the map reports it has painted. */
  useEffect(() => {
    if (tilesReady) return;
    const timer = setTimeout(() => {
      if (!tilesReady) setTilesFailed(true);
    }, TILE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [tilesReady]);

  /* Fly to the selected booking rather than jumping, so the move is followable. */
  useEffect(() => {
    if (!selectedBookingId || !tilesReady) return;
    const booking = liveBookings.find((candidate) => candidate.id === selectedBookingId);
    if (!booking) return;
    mapRef.current?.flyTo({
      center: [booking.location.lng, booking.location.lat],
      zoom: 13.4,
      duration: 900,
    });
  }, [selectedBookingId, liveBookings, tilesReady]);

  const workerPoints = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: workers.map(({ worker, position }) => ({
        type: 'Feature',
        properties: {
          /*
           * A single state string rather than two booleans, because the paint
           * expression matches on it and a match reads more clearly than nested
           * conditionals.
           */
          state: worker.isOnJob ? 'on-job' : worker.isOnline ? 'idle' : 'offline',
          name: worker.name,
        },
        geometry: { type: 'Point', coordinates: [position.lng, position.lat] },
      })),
    }),
    [workers],
  );

  const requestPoints = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: liveBookings.map((booking) => ({
        type: 'Feature',
        properties: { id: booking.id, reference: booking.reference },
        geometry: {
          type: 'Point',
          coordinates: [booking.location.lng, booking.location.lat],
        },
      })),
    }),
    [liveBookings],
  );

  const selected = liveBookings.find((candidate) => candidate.id === selectedBookingId);
  const geofence = useMemo(
    () => (selected ? circlePolygon(selected.location, geofenceKm) : undefined),
    [selected, geofenceKm],
  );

  /*
   * The fallback. Same slot, same honeycomb the dashboard shows, so a viewer is
   * looking at a map they already recognise rather than an error state.
   */
  if (tilesFailed && !tilesReady) {
    return (
      <div className="relative flex h-full flex-col justify-center bg-ground px-8">
        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-pill border border-hairline bg-surface px-3 py-1.5 text-pill text-muted">
          <span aria-hidden className="h-2 w-2 rounded-full bg-coral" />
          Offline map view. Zone demand is still live.
        </p>
        <ZoneHexCanvas zones={zones} showMeasureToggle={false} />
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <Map
        ref={mapRef}
        mapStyle={BASEMAP_STYLE}
        initialViewState={INITIAL_VIEW}
        /* Rotation serves nothing on a dispatch map and disorients a viewer. */
        dragRotate={false}
        touchZoomRotate={false}
        attributionControl={{ compact: true }}
        interactiveLayerIds={layers.requests ? ['requests'] : []}
        onLoad={() => setTilesReady(true)}
        onClick={(event) => {
          const feature = event.features?.[0];
          const id = feature?.properties?.id;
          if (typeof id === 'string') onSelectBooking(id);
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/*
         * Demand sits underneath everything: it is context for the dots, not a
         * competitor to them.
         */}
        {layers.demand ? (
          <Source id="demand" type="geojson" data={heatmap}>
            <Layer
              id="demand-heat"
              type="heatmap"
              paint={{
                /* Weight comes from the pre-aggregated count per zone. */
                'heatmap-weight': ['get', 'weight'],
                /* Intensity grows with zoom so the shape survives zooming in. */
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 3],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 28, 14, 70],
                'heatmap-opacity': 0.55,
                /* transparent -> lavender -> marigold -> coral, from the tokens. */
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0,
                  mapColor('lavender', 0),
                  0.25,
                  mapColor('lavender', 0.55),
                  0.6,
                  mapColor('marigold', 0.7),
                  1,
                  mapColor('coral', 0.85),
                ],
              }}
            />
          </Source>
        ) : null}

        {/* The geofence the selected request went out to. */}
        {geofence ? (
          <Source id="geofence" type="geojson" data={geofence}>
            <Layer
              id="geofence-fill"
              type="fill"
              paint={{ 'fill-color': mapColor('marigold'), 'fill-opacity': 0.1 }}
            />
            <Layer
              id="geofence-line"
              type="line"
              paint={{
                'line-color': mapColor('marigold'),
                'line-width': 1.5,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        ) : null}

        {/*
         * Workers. Clustered above 40 points in view so a busy zone stays readable;
         * below that the individual dots carry their own state colour.
         */}
        {layers.workers ? (
          <Source
            id="workers"
            type="geojson"
            data={workerPoints}
            cluster
            clusterMaxZoom={13}
            clusterRadius={38}
          >
            <Layer
              id="worker-clusters"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': mapColor('marigold-tint'),
                'circle-stroke-color': mapColor('marigold'),
                'circle-stroke-width': 1.5,
                'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 14, 40, 26],
              }}
            />
            <Layer
              id="worker-cluster-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 11 }}
              paint={{ 'text-color': mapColor('ink') }}
            />
            <Layer
              id="workers"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-radius': 6,
                'circle-stroke-width': 2,
                'circle-stroke-color': mapColor('surface'),
                'circle-color': [
                  'match',
                  ['get', 'state'],
                  'idle',
                  mapColor('fund-green'),
                  'on-job',
                  mapColor('marigold'),
                  mapColor('muted'),
                ],
              }}
            />
          </Source>
        ) : null}

        {/* Open requests, coral, with the selected one ringed. */}
        {layers.requests ? (
          <Source id="requests" type="geojson" data={requestPoints}>
            <Layer
              id="request-halo"
              type="circle"
              paint={{
                'circle-radius': 16,
                'circle-color': mapColor('coral'),
                'circle-opacity': 0.18,
              }}
            />
            <Layer
              id="requests"
              type="circle"
              paint={{
                'circle-radius': 7,
                'circle-color': mapColor('coral'),
                'circle-stroke-width': [
                  'case',
                  ['==', ['get', 'id'], selectedBookingId ?? ''],
                  3,
                  2,
                ],
                'circle-stroke-color': [
                  'case',
                  ['==', ['get', 'id'], selectedBookingId ?? ''],
                  mapColor('ink'),
                  mapColor('surface'),
                ],
              }}
            />
          </Source>
        ) : null}
      </Map>

      {/* A legend. The dot colours mean nothing without it. */}
      <ul className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1 rounded-tile border border-hairline bg-surface/95 px-3 py-2 shadow-card">
        {[
          { token: 'fund-green' as const, label: 'Free to take work' },
          { token: 'marigold' as const, label: 'On a job' },
          { token: 'muted' as const, label: 'Offline' },
          { token: 'coral' as const, label: 'Open request' },
        ].map((entry) => (
          <li key={entry.label} className="flex items-center gap-2 text-pill text-muted">
            <span
              aria-hidden
              className="h-2 w-2 flex-none rounded-full"
              style={{ backgroundColor: mapColor(entry.token) }}
            />
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
