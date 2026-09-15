'use client';

import { Radio } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AdminBooking, Zone } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { BroadcastInspector } from '@/components/dispatch/BroadcastInspector';
import type { DispatchLayerVisibility, DispatchMapProps } from '@/components/dispatch/DispatchMap';
import { ZoneMapCanvas } from '@/components/dashboard/ZoneMapCanvas';
import { MEASURES, type MapMeasure } from '@/components/maps/demand-measure';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { LiveQueue } from '@/components/dispatch/LiveQueue';
import {
  acceptSimulatedRequest,
  getBroadcast,
  getLiveMap,
  getZoneDemand,
  reassignBooking,
  simulateRequest,
  type Broadcast,
  type LiveMap,
  type ZoneDemandPoint,
} from '@/lib/services';
import { cn } from '@/lib/utils';

/**
 * The map is loaded client-side only.
 *
 * MapLibre touches `window` and WebGL at import time, so it cannot be part of a
 * server render at all. Loading it dynamically also keeps its weight off every
 * other route's bundle — it is the heaviest dependency in the app by a wide margin.
 */
const DispatchMap = dynamic(
  () =>
    import('@/components/dispatch/DispatchMap')
      .then((module) => module.DispatchMap)
      /* Offline before the map's code was ever cached: show the SVG map, not an error. */
      .catch(() => function OfflineDispatchMap({ zones }: DispatchMapProps) {
        return (
          <div className="flex h-full flex-col justify-center bg-ground px-8">
            <ZoneMapCanvas zones={zones} showMeasureToggle={false} />
          </div>
        );
      }),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-ground p-8">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

const LAYER_LABELS: Record<keyof DispatchLayerVisibility, string> = {
  workers: 'Workers',
  requests: 'Open requests',
  demand: 'Demand',
};

/** How long the simulated request waits before the top-ranked worker takes it. */
const SIMULATED_ACCEPT_DELAY_MS = 4000;

function DispatchConsole() {
  const searchParams = useSearchParams();

  const [live, setLive] = useState<LiveMap>();
  const [measure, setMeasure] = useState<MapMeasure>('ORDERS');
  const [zoneDemand, setZoneDemand] = useState<ZoneDemandPoint[]>([]);
  const [layers, setLayers] = useState<DispatchLayerVisibility>({
    workers: true,
    requests: true,
    demand: true,
  });
  const [selectedId, setSelectedId] = useState<string>();
  const [broadcast, setBroadcast] = useState<Broadcast>();
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  const reload = useCallback(async () => {
    const [map, demand] = await Promise.all([getLiveMap(), getZoneDemand()]);
    setLive(map);
    setZoneDemand(demand);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /* The dashboard's "View in dispatch" links arrive with a zone in the query. */
  const focusZone = searchParams.get('zone') ?? undefined;

  useEffect(() => {
    if (!focusZone || !live || selectedId) return;
    const match = live.liveBookings.find((booking) => booking.zoneId === focusZone);
    if (match) setSelectedId(match.id);
  }, [focusZone, live, selectedId]);

  /* Opening a booking recomputes its ranking rather than reading a stored one. */
  useEffect(() => {
    if (!selectedId) {
      setBroadcast(undefined);
      return;
    }
    let cancelled = false;
    setInspectorLoading(true);
    void getBroadcast(selectedId)
      .then((result) => {
        if (!cancelled) setBroadcast(result);
      })
      .finally(() => {
        if (!cancelled) setInspectorLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const zoneName = useCallback(
    (zoneId: string) =>
      (live?.zones as Zone[] | undefined)?.find((zone) => zone.id === zoneId)?.name ??
      'Unknown zone',
    [live],
  );

  async function onSimulate(): Promise<void> {
    setBusy(true);
    setNotice(undefined);
    try {
      const booking = await simulateRequest(focusZone);
      await reload();
      setSelectedId(booking.id);
      setNotice(
        `New request in ${zoneName(booking.zoneId)}. Offered out and waiting for someone to take it.`,
      );

      /*
       * The accept lands a few seconds later so the loop is watchable: request
       * appears, ranking runs, someone takes it. Accepting instantly would make the
       * ranking look like a lookup.
       */
      setTimeout(() => {
        void (async () => {
          try {
            const accepted = await acceptSimulatedRequest(booking.id);
            await reload();
            setNotice(`${accepted.workerName} took the job in ${zoneName(accepted.zoneId)}.`);
          } catch (error) {
            setNotice((error as Error).message);
          }
        })();
      }, SIMULATED_ACCEPT_DELAY_MS);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onReassign(workerId: string): Promise<void> {
    if (!selectedId) return;
    setBusy(true);
    try {
      const updated: AdminBooking = await reassignBooking(selectedId, workerId);
      await reload();
      const refreshed = await getBroadcast(selectedId);
      setBroadcast(refreshed);
      setNotice(`${updated.workerName} now has this job. The override is on its timeline.`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    /*
     * Full-bleed inside <main>. The negative margins cancel main's padding so the
     * map reaches the edges — a dispatch console is a workspace, not a document,
     * and cards floating over a map would fight it for attention.
     */
    <div className="-mx-8 -my-6 flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-none flex-wrap items-center gap-3 border-b border-hairline px-8 py-3">
        <div role="group" aria-label="Map layers" className="flex items-center gap-2">
          {(Object.keys(LAYER_LABELS) as (keyof DispatchLayerVisibility)[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={layers[key]}
              onClick={() => setLayers((current) => ({ ...current, [key]: !current[key] }))}
              className={cn(
                'rounded-pill border px-3 py-1.5 text-pill font-medium transition-colors',
                layers[key]
                  ? 'border-marigold bg-marigold-tint text-ink'
                  : 'border-hairline bg-surface text-muted hover:text-ink',
              )}
            >
              {LAYER_LABELS[key]}
            </button>
          ))}
        </div>

        {layers.demand ? (
          <SegmentedToggle label="Heat spots show" options={MEASURES} value={measure} onChange={setMeasure} />
        ) : null}

        {notice ? (
          <p role="status" className="min-w-0 flex-1 truncate text-pill text-muted">
            {notice}
          </p>
        ) : (
          <span className="flex-1" />
        )}

        <Button
          variant="primary"
          icon={<Radio size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onSimulate}
          disabled={busy}
        >
          Simulate request
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-[500px] w-full min-w-0 flex-1">
          <DispatchMap
            workers={live?.workers ?? []}
            liveBookings={live?.liveBookings ?? []}
            zones={zoneDemand}
            layers={layers}
            measure={measure}
            selectedBookingId={selectedId}
            geofenceKm={broadcast?.radiusKm ?? 5}
            onSelectBooking={setSelectedId}
          />
        </div>

        {selectedId ? (
          <BroadcastInspector
            broadcast={broadcast}
            loading={inspectorLoading}
            zoneName={broadcast ? zoneName(broadcast.booking.zoneId) : ''}
            onClose={() => setSelectedId(undefined)}
            onReassign={onReassign}
            busy={busy}
          />
        ) : (
          <LiveQueue
            bookings={live?.liveBookings}
            zoneName={zoneName}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onSimulate={() => void onSimulate()}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The route.
 *
 * `useSearchParams` takes its component out of prerendering, so the console sits
 * behind a Suspense boundary — the same requirement the workers directory has.
 */
export default function DispatchPage() {
  return (
    <Suspense
      fallback={
        <div className="-mx-8 -my-6 h-[calc(100vh-4rem)] p-8">
          <Skeleton className="h-full w-full" />
        </div>
      }
    >
      <DispatchConsole />
    </Suspense>
  );
}
