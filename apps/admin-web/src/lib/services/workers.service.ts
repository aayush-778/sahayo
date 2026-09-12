import { KycStatus, type AdminWorker, type WorkerCategory } from '@sahayo/shared';
import { adminState } from '@/lib/store';
import { respond } from './latency';

export interface WorkerFilter {
  /** Matches name or phone, case-insensitively. */
  search?: string;
  category?: WorkerCategory;
  zoneId?: string;
  kycStatus?: KycStatus;
  /** `true` for online only, `false` for offline only, unset for both. */
  isOnline?: boolean;
  /** Restricts to workers at or below the under-allocation threshold. */
  underAllocatedOnly?: boolean;
}

/**
 * At or below this many jobs in a week, a worker is under-allocated.
 *
 * Exported because the directory's coral bar, the "Under-allocated" pill and this
 * filter must all agree on the threshold. Three places hard-coding `2` would
 * drift the first time anyone tuned it.
 */
export const UNDER_ALLOCATED_THRESHOLD = 2;

export function isUnderAllocated(worker: AdminWorker): boolean {
  return worker.jobsThisWeek <= UNDER_ALLOCATED_THRESHOLD;
}

export async function listWorkers(filter: WorkerFilter = {}): Promise<AdminWorker[]> {
  const { workers } = adminState();
  const needle = filter.search?.trim().toLowerCase();

  const matched = workers.filter((worker) => {
    if (filter.category && worker.category !== filter.category) return false;
    if (filter.zoneId && worker.zoneId !== filter.zoneId) return false;
    if (filter.kycStatus && worker.kycStatus !== filter.kycStatus) return false;
    if (filter.isOnline !== undefined && worker.isOnline !== filter.isOnline) return false;
    if (filter.underAllocatedOnly && !isUnderAllocated(worker)) return false;
    if (needle) {
      const haystack = `${worker.name} ${worker.phone}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  return respond(matched);
}

export async function getWorker(workerId: string): Promise<AdminWorker | undefined> {
  const { workers } = adminState();
  return respond(workers.find((worker) => worker.id === workerId));
}

/**
 * Takes a worker online or offline.
 *
 * Only a verified worker may go online: an unverified worker cannot be offered a
 * job, so showing them as available would misrepresent supply on the dispatch
 * map. Asking to bring an unverified worker online is refused rather than
 * silently ignored, because a toggle that appears to work and does nothing is
 * worse than one that explains itself.
 */
export async function setOnline(workerId: string, isOnline: boolean): Promise<AdminWorker> {
  const state = adminState();
  const worker = state.workers.find((candidate) => candidate.id === workerId);
  if (!worker) throw new Error(`No worker with id ${workerId}`);

  if (isOnline && worker.kycStatus !== KycStatus.VERIFIED) {
    throw new Error(
      `${worker.name} cannot go online until their documents are verified. ` +
        'Approve their submission in Verification first.',
    );
  }

  state.setWorkerOnline(workerId, isOnline);
  const updated = adminState().workers.find((candidate) => candidate.id === workerId);
  return respond(updated as AdminWorker);
}

/** Moves a worker to another zone. Used by the directory's bulk action bar. */
export async function assignZone(workerIds: string[], zoneId: string): Promise<number> {
  const state = adminState();
  const known = new Set(state.zones.map((zone) => zone.id));
  if (!known.has(zoneId)) throw new Error(`No zone with id ${zoneId}`);

  for (const workerId of workerIds) {
    state.setWorkerZone(workerId, zoneId);
  }
  return respond(workerIds.length);
}

/**
 * The cohort's highest weekly job count.
 *
 * The directory's inline mini-bars are drawn relative to this, so a bar's length
 * means "compared with the busiest worker" rather than against an arbitrary
 * ceiling.
 */
export async function getMaxJobsThisWeek(): Promise<number> {
  const { workers } = adminState();
  return respond(workers.reduce((max, worker) => Math.max(max, worker.jobsThisWeek), 0));
}
