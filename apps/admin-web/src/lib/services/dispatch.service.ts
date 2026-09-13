import {
  BookingEventKind,
  BookingStatus,
  type AdminBooking,
  type AdminWorker,
  type EquityScoreInputs,
  type Zone,
} from '@sahayo/shared';
import { DAY_MS, SEED_NOW, computeEquityScore, type EquityWeights, type SplitShares } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';
import { currentDispatchSettings, currentEquityWeights, currentSplitShares } from './settings.service';
import { compareIso } from '@/lib/dates';

/** Statuses that put a booking in the live dispatch queue. */
const LIVE_STATUSES: ReadonlySet<AdminBooking['status']> = new Set([
  BookingStatus.REQUESTED,
  BookingStatus.BROADCAST,
  BookingStatus.ACCEPTED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
]);

/** A worker plus where they are, which is what the map needs. */
export interface MappedWorker {
  worker: AdminWorker;
  position: { lat: number; lng: number };
}

export interface LiveMap {
  zones: Zone[];
  /** Every verified worker, whether online or not — the map dims the offline ones. */
  workers: MappedWorker[];
  /** Bookings currently in flight, newest first. */
  liveBookings: AdminBooking[];
}

export async function getLiveMap(): Promise<LiveMap> {
  const { zones, workers, bookings } = adminState();

  const liveBookings = bookings
    .filter((booking) => LIVE_STATUSES.has(booking.status))
    .sort((a, b) => compareIso(b.createdAt, a.createdAt));

  const mapped = workers.flatMap<MappedWorker>((worker) => {
    if (worker.kycStatus !== 'VERIFIED') return [];
    const position = workerPosition(worker, zones);
    return position ? [{ worker, position }] : [];
  });

  return respond({ zones, workers: mapped, liveBookings });
}

/**
 * How long a request has been waiting, in seconds.
 *
 * Measured from the booking's creation against the seed's fixed "now", so the
 * queue's counters agree with the timestamps on the records rather than drifting
 * against the wall clock. The queue ticks its own display clock on top of this.
 */
export function secondsSinceRequest(booking: AdminBooking): number {
  return Math.max(
    0,
    Math.round((SEED_NOW.getTime() - new Date(booking.createdAt).getTime()) / 1000),
  );
}

/** One row of the ranked list the Broadcast Inspector shows. */
export interface RankedCandidate {
  worker: AdminWorker;
  /** Straight-line distance from the job, in kilometres. */
  distanceKm: number;
  /** The three inputs, so the weighting can be shown rather than asserted. */
  inputs: EquityScoreInputs;
  score: number;
  /** 1-based position in the ranking. */
  rank: number;
  accepted: boolean;
}

export interface Broadcast {
  booking: AdminBooking;
  /** The geofence the request went out to, in kilometres. */
  radiusKm: number;
  candidates: RankedCandidate[];
  /** The zone's average weekly job count, which the plain-language line quotes. */
  zoneAverageJobs: number;
  /** The weights the ranking was computed with — the ones currently set in Settings. */
  weights: EquityWeights;
  /** How long each offer stays open, in seconds. */
  pingTimeoutSeconds: number;
  /** The split this booking pays out at. */
  shares: SplitShares;
}

/** Great-circle distance in kilometres. */
function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * earthRadiusKm * Math.asin(Math.sqrt(h)) * 100) / 100;
}

/** The highest weekly job count, which normalises the inverse-allocation input. */
function maxJobsThisWeek(workers: AdminWorker[]): number {
  return workers.reduce((max, worker) => Math.max(max, worker.jobsThisWeek), 1);
}


/**
 * Where a worker is standing.
 *
 * `AdminWorker` carries no live position — in production that arrives over the
 * socket from the worker app's background location. Here it is derived
 * deterministically from the worker's zone centroid, offset by two stable values
 * from their own record, so a worker sits in the same place on every reload and
 * the distances the Broadcast Inspector prints do not change between looks.
 */
function workerPosition(
  worker: AdminWorker,
  zones: Zone[],
): { lat: number; lng: number } | undefined {
  const zone = zones.find((candidate) => candidate.id === worker.zoneId);
  if (!zone) return undefined;
  /* ±0.02 degrees is roughly ±2km, which fits inside a broadcast radius. */
  return {
    lat: zone.centroid.lat + (worker.equityInputs.proximity - 0.5) * 0.04,
    lng: zone.centroid.lng + (worker.equityInputs.rating - 0.5) * 0.04,
  };
}

/**
 * Reconstructs why the dispatcher offered a booking to whom.
 *
 * The ranking is computed here, live, from the same `computeEquityScore` the seed
 * used — NOT read from a stored list. That is the whole point of the Broadcast
 * Inspector: it shows the actual arithmetic, so the claim that a worker was ranked
 * first for taking fewer jobs is verifiable on screen rather than asserted.
 *
 * A production implementation would read this from the dispatch log rather than
 * recompute it, because by then the inputs will have moved on. The shape is the
 * same either way.
 */
export async function getBroadcast(bookingId: string): Promise<Broadcast | undefined> {
  const { bookings, workers, zones } = adminState();
  const booking = bookings.find((candidate) => candidate.id === bookingId);
  if (!booking) return respond(undefined);

  /* Outer bound of a broadcast, from Settings. Proximity is normalised against it. */
  const { broadcastRadiusKm, pingTimeoutSeconds } = currentDispatchSettings();
  const weights = currentEquityWeights();

  const inZone = workers.filter(
    (worker) => worker.zoneId === booking.zoneId && worker.kycStatus === 'VERIFIED',
  );
  const maxJobs = maxJobsThisWeek(workers);

  /* How many workers the request actually reached, from the booking's own timeline. */
  const pingedEvent = booking.timeline.find((event) => event.workersPinged !== undefined);
  const pingedCount = pingedEvent?.workersPinged ?? Math.min(7, inZone.length);

  const candidates: RankedCandidate[] = inZone
    .map((worker) => {
      const position = workerPosition(worker, zones);
      const km = position ? distanceKm(booking.location, position) : broadcastRadiusKm;

      const inputs: EquityScoreInputs = {
        /* Nearer is better, normalised against the broadcast radius. */
        proximity: Math.max(0, Math.min(1, 1 - km / broadcastRadiusKm)),
        rating: Math.round(((worker.rating - 3.6) / (5 - 3.6)) * 1000) / 1000,
        /*
         * The input that makes this dispatcher different: taking FEW jobs this
         * week scores HIGH, which is how a quiet worker outranks a busy one who
         * happens to be closer.
         */
        inverseAllocation: Math.round((1 - worker.jobsThisWeek / maxJobs) * 1000) / 1000,
      };

      return { worker, distanceKm: km, inputs, score: computeEquityScore(inputs, weights) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, pingedCount)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      accepted: entry.worker.id === booking.workerId,
    }));

  const zoneAverageJobs = inZone.length
    ? Math.round(inZone.reduce((sum, worker) => sum + worker.jobsThisWeek, 0) / inZone.length)
    : 0;

  return respond({
    booking,
    radiusKm: broadcastRadiusKm,
    candidates,
    zoneAverageJobs,
    weights,
    pingTimeoutSeconds,
    shares: currentSplitShares(),
  });
}

export interface ZoneDemandPoint {
  zoneId: string;
  zoneName: string;
  centroid: { lat: number; lng: number };
  orderCount: number;
  workerCount: number;
  availableWorkerCount: number;
  avgWaitMinutes: number;
  /** 0–1 pressure: orders per available worker, normalised across the zones. */
  demandIndex: number;
  /** True where orders outnumber available workers. */
  underserved: boolean;
}

/**
 * Demand per zone, derived from the bookings and workers in the store.
 *
 * `demandIndex` is a ratio of orders to available workers, normalised across the
 * twelve zones. A quiet zone with almost no workers can therefore read as high
 * demand, which is the behaviour that matters: the figure is about unmet need,
 * not raw volume.
 */
export async function getZoneDemand(): Promise<ZoneDemandPoint[]> {
  const { zones, bookings, workers } = adminState();

  /*
   * Pressure is measured on the last seven days, not on the full 90-day history.
   * Against 90 days of orders every zone looks overwhelmed, because the order
   * count is cumulative while the worker count is a snapshot — which is how an
   * earlier version of this flagged all twelve zones as underserved and made the
   * dashboard's "Underserved zones" list meaningless.
   */
  const weekStart = new Date(SEED_NOW.getTime() - 7 * DAY_MS).toISOString();

  const raw = zones.map((zone) => {
    const zoneBookings = bookings.filter((booking) => booking.zoneId === zone.id);
    const recentOrders = zoneBookings.filter((booking) => booking.createdAt >= weekStart).length;
    const zoneWorkers = workers.filter((worker) => worker.zoneId === zone.id);
    const available = zoneWorkers.filter((worker) => worker.isOnline && !worker.isOnJob);

    /* Orders per available worker. One is the floor, so an empty zone is not infinite. */
    const pressure = recentOrders / Math.max(1, available.length);

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      centroid: zone.centroid,
      orderCount: zoneBookings.length,
      workerCount: zoneWorkers.length,
      availableWorkerCount: available.length,
      /* Wait grows with pressure. Eight minutes is the floor in a well-supplied zone. */
      avgWaitMinutes: Math.round(8 + pressure * 1.4),
      pressure,
    };
  });

  const maxPressure = raw.reduce((max, zone) => Math.max(max, zone.pressure), 1);
  /*
   * Underserved means worse than the city average, so the flag stays meaningful
   * however busy the platform gets as a whole. A fixed threshold would either
   * flag everything on a busy week or nothing on a quiet one.
   */
  const meanPressure = raw.reduce((sum, zone) => sum + zone.pressure, 0) / (raw.length || 1);

  const points: ZoneDemandPoint[] = raw.map(({ pressure, ...zone }) => ({
    ...zone,
    demandIndex: Math.round((pressure / maxPressure) * 1000) / 1000,
    underserved: pressure > meanPressure,
  }));

  /* Worst first, so a caller can take the top three without sorting again. */
  return respond(points.sort((a, b) => b.demandIndex - a.demandIndex));
}


/**
 * Seeds a new request and starts the dispatch loop.
 *
 * The whole point is that the loop is demonstrable on stage without a backend: the
 * request appears on the map and in the queue, the ranking runs, workers are
 * pinged, and `acceptSimulatedRequest` closes it a few seconds later.
 *
 * It writes through the store like any other mutation, so the dashboard's
 * "jobs booked today" moves too. The booking is a real AdminBooking — nothing
 * about it is special-cased downstream, which is what makes the demonstration
 * honest rather than a puppet show.
 */
export async function simulateRequest(zoneId?: string): Promise<AdminBooking> {
  const state = adminState();
  const { zones, workers, bookings } = state;

  /*
   * Target the zone under most pressure when none is named. That is where a new
   * request is most likely in reality, and it is also where the equity ranking has
   * the most to show — a zone with one free worker and a queue.
   */
  const demand = await getZoneDemand();
  const targetZoneId = zoneId ?? demand[0]?.zoneId ?? zones[0]?.id;
  const zone = zones.find((candidate) => candidate.id === targetZoneId);
  if (!zone) throw new Error('There are no zones configured, so a request cannot be placed.');

  const eligible = workers.filter(
    (worker) => worker.zoneId === targetZoneId && worker.kycStatus === 'VERIFIED',
  );
  if (eligible.length === 0) {
    throw new Error(
      `No verified workers cover ${zone.name}, so a request there could not be offered to anyone.`,
    );
  }

  /*
   * Drawn from an existing customer rather than invented, so the simulated request
   * belongs to someone who exists elsewhere in the data.
   */
  const sourceBooking = bookings[Math.floor(bookings.length / 2)];
  const at = new Date(SEED_NOW.getTime()).toISOString();
  const id = `sim_${bookings.length + 1}_${targetZoneId}`;
  const pinged = Math.min(eligible.length, 7);

  const booking: AdminBooking = {
    id,
    reference: `BKG-${String(bookings.length + 1).padStart(5, '0')}`,
    customerId: sourceBooking?.customerId ?? 'sim-customer',
    customerName: sourceBooking?.customerName ?? 'A customer',
    category: eligible[0].category.charAt(0) + eligible[0].category.slice(1).toLowerCase(),
    zoneId: targetZoneId,
    location: {
      lat: Math.round((zone.centroid.lat + 0.004) * 1e5) / 1e5,
      lng: Math.round((zone.centroid.lng - 0.003) * 1e5) / 1e5,
    },
    status: BookingStatus.BROADCAST,
    /* A mid-range job, so the split preview shows round-ish numbers. */
    amount: 1450 * 100,
    createdAt: at,
    timeline: [
      {
        id: `${id}_requested`,
        kind: BookingEventKind.REQUESTED,
        at,
        detail: 'Customer requested this job.',
      },
      {
        id: `${id}_broadcast`,
        kind: BookingEventKind.BROADCAST,
        at,
        detail: 'Request sent out to available workers nearby.',
      },
      {
        id: `${id}_pinged`,
        kind: BookingEventKind.PINGED,
        at,
        detail: `Offered to ${pinged} workers, ranked by equity score.`,
        workersPinged: pinged,
      },
    ],
  };

  state.addBooking(booking);
  return respond(booking);
}

/**
 * Closes a simulated request by accepting it as the top-ranked worker.
 *
 * Called a few seconds after `simulateRequest` so the accept is visible as an
 * event rather than instantaneous. It accepts as whoever the ranking actually put
 * first — not as a pre-chosen worker — because the claim being demonstrated is
 * that the ranking decides.
 */
export async function acceptSimulatedRequest(bookingId: string): Promise<AdminBooking> {
  const state = adminState();
  const booking = state.bookings.find((candidate) => candidate.id === bookingId);
  if (!booking) throw new Error(`No booking with id ${bookingId}`);

  const broadcast = await getBroadcast(bookingId);
  const winner = broadcast?.candidates[0];
  if (!winner) {
    throw new Error('Nobody was available to accept this request.');
  }

  const at = new Date(SEED_NOW.getTime() + 4000).toISOString();
  state.updateBooking(bookingId, {
    status: BookingStatus.ACCEPTED,
    workerId: winner.worker.id,
    workerName: winner.worker.name,
    acceptedAt: at,
    timeline: [
      ...booking.timeline,
      {
        id: `${bookingId}_accepted`,
        kind: BookingEventKind.ACCEPTED,
        at,
        detail: `${winner.worker.name} accepted, ranked 1 of ${broadcast.candidates.length} on equity score.`,
        equityRank: 1,
      },
    ],
  });

  const updated = adminState().bookings.find((candidate) => candidate.id === bookingId);
  return respond(updated as AdminBooking);
}

/**
 * Hands a booking to a different worker, as an administrator override.
 *
 * Recorded on the timeline rather than applied silently. An override that leaves
 * no trace is indistinguishable from the algorithm's own choice, and the point of
 * the Broadcast Inspector is that every assignment can be accounted for.
 */
export async function reassignBooking(
  bookingId: string,
  workerId: string,
): Promise<AdminBooking> {
  const state = adminState();
  const booking = state.bookings.find((candidate) => candidate.id === bookingId);
  if (!booking) throw new Error(`No booking with id ${bookingId}`);

  const worker = state.workers.find((candidate) => candidate.id === workerId);
  if (!worker) throw new Error(`No worker with id ${workerId}`);
  if (worker.kycStatus !== 'VERIFIED') {
    throw new Error(
      `${worker.name} is not verified, so this job cannot be handed to them. ` +
        'Approve their documents in Verification first.',
    );
  }

  const at = new Date(SEED_NOW.getTime()).toISOString();
  state.updateBooking(bookingId, {
    status: BookingStatus.ACCEPTED,
    workerId: worker.id,
    workerName: worker.name,
    acceptedAt: at,
    timeline: [
      ...booking.timeline,
      {
        id: `${bookingId}_reassigned_${workerId}`,
        kind: BookingEventKind.ACCEPTED,
        at,
        detail: `Reassigned to ${worker.name} by an administrator, overriding the ranking.`,
      },
    ],
  });

  const updated = adminState().bookings.find((candidate) => candidate.id === bookingId);
  return respond(updated as AdminBooking);
}


/**
 * The one-sentence reason a job went to whom it went.
 *
 * Computed rather than templated, because the obvious template — "ranked first
 * because of their job count, not because they were closest" — is sometimes simply
 * false, and asserting it in front of an evaluator would undo the credibility the
 * whole Inspector exists to build. Two ways it can be false: the nearest worker
 * sometimes also has the lowest job count, and the worker who ACCEPTED is not
 * always the one ranked first, because the workers above them can decline.
 *
 * So there are three sentences, and which one applies is worked out from the
 * ranking itself:
 *
 *   1. A nearer worker ranked lower. That is proof the ranking is not distance, and
 *      it is named with both distances.
 *   2. The worker is the nearest. Said plainly — distance and job count agreed.
 *   3. The worker took it from further down the ranking. The ones above them were
 *      offered it first and did not take it, which is also worth saying.
 */
export function rankingExplanation(broadcast: Broadcast, zoneName: string): string {
  const winner = broadcast.candidates.find((c) => c.accepted) ?? broadcast.candidates[0];
  if (!winner) return 'Nobody was available to take this job.';

  const firstName = winner.worker.name.split(' ')[0];
  const jobs = winner.worker.jobsThisWeek;
  const jobWord = jobs === 1 ? 'job' : 'jobs';
  const average = broadcast.zoneAverageJobs;
  /* "the Patna City average", never "a Patna City average" — the zone is named. */
  const against = `${jobs} ${jobWord} this week against the ${zoneName} average of ${average}`;
  /*
   * The causal "because they have had less work" is only true when they actually
   * have. A worker above their zone's average can still rank mid-table, and saying
   * their high job count is the reason would be nonsense.
   */
  const hadLessWork = jobs < average;

  /* Someone closer who nonetheless ranked below the winner. */
  const closerButLower = broadcast.candidates.find(
    (c) => c.distanceKm < winner.distanceKm && c.rank > winner.rank,
  );
  if (closerButLower) {
    const otherName = closerButLower.worker.name.split(' ')[0];
    const proof =
      `${otherName} was closer, at ${closerButLower.distanceKm}km against ` +
      `${winner.distanceKm}km, and still ranked ${closerButLower.rank}.`;
    return hadLessWork
      ? `${firstName} was ranked ${winner.rank} because they have taken ${against}. ${proof}`
      : `${firstName} was ranked ${winner.rank} on ${against}. ${proof} The ranking weighs how ` +
          'much work each worker has already had, not only how close they are.';
  }

  const nearestDistance = broadcast.candidates.reduce(
    (min, c) => Math.min(min, c.distanceKm),
    Number.POSITIVE_INFINITY,
  );
  if (winner.distanceKm === nearestDistance) {
    return (
      `${firstName} was ranked ${winner.rank} on ${against}. They were also the closest, so ` +
      'distance and job count pointed the same way here.'
    );
  }

  return (
    `${firstName} took this job from rank ${winner.rank}, on ${against}. The workers ranked ` +
    'above them were offered it first and did not take it.'
  );
}
