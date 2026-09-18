import { useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '@sahayo/shared';

/** The worker app reports a position every five seconds. */
const DEFAULT_GLIDE_MS = 5_000;
/** Redraws per second while gliding. Enough to look continuous on a map pin. */
const FRAME_MS = 1000 / 30;

/**
 * A map position that glides to each new report instead of jumping.
 *
 * Positions arrive every few seconds. Each new one becomes the target, and the displayed
 * point moves from wherever it is now to the target over the time the last report took to
 * come — so the pin keeps moving at roughly the worker's pace, never stops dead between
 * reports, and a late report does not teleport it.
 */
export function useSmoothPoint(target: GeoPoint | undefined): GeoPoint | undefined {
  const [shown, setShown] = useState<GeoPoint | undefined>(target);
  const shownRef = useRef<GeoPoint | undefined>(target);
  const lastTargetAt = useRef<number>(0);

  const lat = target?.lat;
  const lng = target?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const to = { lat, lng };
    const from = shownRef.current;
    const now = Date.now();
    const gap = lastTargetAt.current ? now - lastTargetAt.current : DEFAULT_GLIDE_MS;
    lastTargetAt.current = now;

    if (!from) {
      shownRef.current = to;
      setShown(to);
      return;
    }
    const duration = Math.max(300, Math.min(gap, 2 * DEFAULT_GLIDE_MS));
    const started = now;
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / duration);
      const next = { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t };
      shownRef.current = next;
      setShown(next);
      if (t >= 1) clearInterval(timer);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [lat, lng]);

  return shown;
}
