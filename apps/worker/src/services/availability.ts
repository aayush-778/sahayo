import { announceOffline, announceOnline, isServerBacked } from '../realtime';
import { useWorkerStore } from '../store/worker';
import { clampRadius } from './registration';

export type AvailabilityResult = { ok: true } | { ok: false; reason: 'not_approved' };

/**
 * Going online. Refused before approval — an unapproved worker must not be
 * broadcast jobs, and the dashboard says why rather than offering a switch that
 * does nothing.
 *
 * Connected, it tells the dispatcher (worker:online / worker:offline) and starts or
 * stops the location updates that come with being online. On the demo data it only
 * changes the switch, and the offline demo dispatcher reads that.
 */
export async function setAvailability(available: boolean): Promise<AvailabilityResult> {
  const { isApproved, patch } = useWorkerStore.getState();
  if (available && !isApproved) return { ok: false, reason: 'not_approved' };
  patch({ isAvailable: available });
  if (isServerBacked()) {
    if (available) await announceOnline();
    else announceOffline();
  }
  return { ok: true };
}

/**
 * The radius limits are the ones step 2 offers (2–25 km), defined once in
 * registration.ts, so a radius changed later from Profile obeys the same range.
 */
export async function setServiceRadius(km: number): Promise<void> {
  useWorkerStore.getState().patch({ serviceRadiusKm: clampRadius(km) });
}
