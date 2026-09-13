import type { Zone } from '@sahayo/shared';
import { adminState, useAdminStore } from '@/lib/store';
import { respond } from './latency';

/** The twelve operating zones, in their canonical order. */
export async function listZones(): Promise<Zone[]> {
  const { zones } = adminState();
  return respond(zones);
}

/**
 * Rebuilds every collection from the seed, discarding the session's changes.
 *
 * Backs the "Reset demo data" action. Because the seed is deterministic, the
 * figures afterwards are identical to a fresh load — which is the point: a
 * fumbled run on stage recovers in one click rather than a restart.
 */
export async function resetDemoData(): Promise<void> {
  useAdminStore.getState().reset();
  return respond(undefined);
}
