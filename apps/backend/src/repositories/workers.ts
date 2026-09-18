import { KycStatus, type AdminWorker, type GeoPoint, type Id, type PublicWorkerSummary } from '@sahayo/shared';
import { haversineM } from '../lib/geo';
import { state } from '../store';

/** A worker who could be offered a job, and how far they are from it. */
export interface Candidate {
  worker: AdminWorker;
  distanceM: number;
}

export function findById(workerId: Id): AdminWorker | undefined {
  return state().workers.get(workerId);
}

export function list(): AdminWorker[] {
  return [...state().workers.values()];
}

/** Online, verified, not already out on a job, and taking work of this worker type. */
export function findOnlineWithSkill(categoryId: Id): AdminWorker[] {
  return list().filter((worker) => isAvailableFor(worker, categoryId));
}

function isAvailableFor(worker: AdminWorker, categoryId: Id): boolean {
  return (
    worker.isOnline &&
    !worker.isOnJob &&
    worker.kycStatus === KycStatus.VERIFIED &&
    worker.serviceCategoryIds.includes(categoryId)
  );
}

/**
 * The workers a request at (lat, lng) can be offered to: available for `skill`, and
 * within `radiusM` of the job, nearest first.
 *
 * THIS FUNCTION BODY IS THE ONLY THING THAT CHANGES WHEN THE DATA MOVES TO POSTGIS.
 * Its signature and its result stay exactly as they are, so the dispatcher, the
 * ranking and the tests do not change. The body becomes one indexed query:
 *
 *   SELECT w.*, ST_Distance(w.location, ST_MakePoint($lng, $lat)::geography) AS distance_m
 *   FROM   workers w
 *   WHERE  w.is_online AND NOT w.is_on_job AND w.kyc_status = 'VERIFIED'
 *     AND  $skill = ANY (w.service_category_ids)
 *     AND  ST_DWithin(w.location, ST_MakePoint($lng, $lat)::geography, $radius_m)
 *   ORDER  BY distance_m;
 *
 * Today it is a Haversine distance over the in-memory map: 140 workers is nothing to
 * scan, and the answer is the same.
 */
export function findCandidates(lat: number, lng: number, radiusM: number, skill: Id): Candidate[] {
  const origin = { lat, lng };
  const candidates: Candidate[] = [];
  for (const worker of state().workers.values()) {
    if (!isAvailableFor(worker, skill)) continue;
    const distanceM = haversineM(origin, worker.location);
    if (distanceM <= radiusM) candidates.push({ worker, distanceM });
  }
  return candidates.sort((a, b) => a.distanceM - b.distanceM);
}

/**
 * The workers a SCHEDULED request at (lat, lng) can be offered to: verified, taking
 * this worker type, within `radiusM`, nearest first — whether or not they are online or
 * busy right now. A job for tomorrow afternoon is not decided by who has the app open
 * this minute; a worker who is offline sees it when they next connect.
 *
 * As findCandidates, only this body changes for PostGIS: the same query without the
 * `is_online` and `is_on_job` conditions.
 */
export function findScheduleCandidates(lat: number, lng: number, radiusM: number, skill: Id): Candidate[] {
  const origin = { lat, lng };
  const candidates: Candidate[] = [];
  for (const worker of state().workers.values()) {
    if (worker.kycStatus !== KycStatus.VERIFIED || !worker.serviceCategoryIds.includes(skill)) continue;
    const distanceM = haversineM(origin, worker.location);
    if (distanceM <= radiusM) candidates.push({ worker, distanceM });
  }
  return candidates.sort((a, b) => a.distanceM - b.distanceM);
}

/** The busiest member's job count this week, which the inverse-allocation input is scaled against. */
export function maxJobsThisWeek(): number {
  let max = 1;
  for (const worker of state().workers.values()) max = Math.max(max, worker.jobsThisWeek);
  return max;
}

function update(workerId: Id, fields: Partial<AdminWorker>): AdminWorker {
  const worker = state().workers.get(workerId);
  if (!worker) throw new Error(`No worker ${workerId}`);
  const next = { ...worker, ...fields };
  state().workers.set(workerId, next);
  return next;
}

/**
 * Taking work or not. Going offline does not touch `isOnJob`: a worker whose wifi drops
 * halfway through a job is still on that job when the app reconnects.
 */
export function setOnline(workerId: Id, online: boolean, location?: GeoPoint): AdminWorker {
  return update(workerId, { isOnline: online, ...(location ? { location } : {}) });
}

export function setLocation(workerId: Id, location: GeoPoint): AdminWorker {
  return update(workerId, { location });
}

/** The cooperative's verification decision. A worker who is not verified cannot be online. */
export function setKycStatus(workerId: Id, kycStatus: KycStatus): AdminWorker {
  return update(workerId, { kycStatus, ...(kycStatus === KycStatus.VERIFIED ? {} : { isOnline: false }) });
}

/** Members waiting for verification, in queue order. */
export function kycQueue(): AdminWorker[] {
  return state()
    .kycQueueWorkerIds.map((id) => state().workers.get(id))
    .filter((worker): worker is AdminWorker => Boolean(worker && worker.kycStatus === KycStatus.PENDING));
}

/** What a customer is shown about the worker coming to their door. */
export function publicSummary(workerId: Id): PublicWorkerSummary | undefined {
  const worker = findById(workerId);
  if (!worker) return undefined;
  return {
    id: worker.id,
    name: worker.name,
    avatarUrl: worker.avatarUrl,
    rating: worker.rating,
    ratingCount: worker.ratingCount,
    lifetimeJobs: worker.lifetimeJobs,
    location: worker.location,
  };
}

/** Workers whose live fields have moved away from the seed: what the admin portal must catch up on. */
export function liveFields(): Array<Pick<AdminWorker, 'id' | 'isOnline' | 'isOnJob' | 'location' | 'jobsThisWeek' | 'kycStatus'>> {
  return list().map(({ id, isOnline, isOnJob, location, jobsThisWeek, kycStatus }) => ({ id, isOnline, isOnJob, location, jobsThisWeek, kycStatus }));
}

export function setOnJob(workerId: Id, onJob: boolean): AdminWorker {
  return update(workerId, { isOnJob: onJob });
}

/** A job accepted counts toward this week's allocation at once, so the next offer already sees it. */
export function recordJobTaken(workerId: Id): AdminWorker {
  const worker = findById(workerId);
  if (!worker) throw new Error(`No worker ${workerId}`);
  const history = [...worker.weeklyJobHistory];
  history[history.length - 1] = worker.jobsThisWeek + 1;
  return update(workerId, { jobsThisWeek: worker.jobsThisWeek + 1, weeklyJobHistory: history });
}
