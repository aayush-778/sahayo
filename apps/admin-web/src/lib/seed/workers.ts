import {
  EQUITY_WEIGHT_INVERSE_ALLOCATION,
  EQUITY_WEIGHT_PROXIMITY,
  EQUITY_WEIGHT_RATING,
  KycStatus,
  WORKER_CATEGORIES,
  type AdminWorker,
  type EquityScoreInputs,
} from '@sahayo/shared';
import { avatarUrl, createNameFactory, phoneNumber } from './names';
import { SEEDS, createRng, isoAgo } from './rng';
import { ZONE_IDS } from './zones';

export const WORKER_COUNT = 140;

/** The highest weekly job count in the cohort, which the equity maths scales to. */
const MAX_JOBS_PER_WEEK = 19;

/**
 * How this week's job counts are distributed.
 *
 * The shape is the point of the whole platform. Roughly 15% of workers sit at
 * 0–2 jobs — not because the seed is sloppy, but because that income
 * concentration is the problem the equity dispatcher exists to fix. A uniform
 * distribution here would make the Workers directory's "Under-allocated" column
 * and the Broadcast Inspector's ranking look like solutions to nothing.
 *
 * Buckets are [min, max] weekly jobs with a relative weight.
 */
const JOB_BUCKETS: ReadonlyArray<{ min: number; max: number; weight: number }> = [
  { min: 0, max: 2, weight: 12 }, // under-allocated — the ~15%
  { min: 3, max: 6, weight: 22 },
  { min: 7, max: 10, weight: 28 },
  { min: 11, max: 14, weight: 23 },
  { min: 15, max: MAX_JOBS_PER_WEEK, weight: 12 },
];

/**
 * How verification states are distributed across the cohort.
 *
 * Most workers are verified, because an unverified majority would mean the
 * platform was not operating. The pending slice is what feeds the Phase 6 queue.
 */
const KYC_WEIGHTS: ReadonlyArray<{ status: AdminWorker['kycStatus']; weight: number }> = [
  { status: KycStatus.VERIFIED, weight: 64 },
  { status: KycStatus.PENDING, weight: 28 },
  { status: KycStatus.REJECTED, weight: 5 },
  { status: KycStatus.UNSUBMITTED, weight: 3 },
];

/**
 * Combines the three equity inputs into the score the dispatcher ranks on.
 *
 * Exported because the Broadcast Inspector in Phase 4 must show the same
 * arithmetic it claims to be using. One definition, used by both the seed and
 * the ranking, is the only way that claim stays true.
 */
export function computeEquityScore(inputs: EquityScoreInputs): number {
  const score =
    inputs.proximity * EQUITY_WEIGHT_PROXIMITY +
    inputs.rating * EQUITY_WEIGHT_RATING +
    inputs.inverseAllocation * EQUITY_WEIGHT_INVERSE_ALLOCATION;
  return Math.round(score * 1000) / 1000;
}

/**
 * The 140 cooperative members.
 *
 * Deterministic: same ids, same names, same figures on every run. Money is in
 * paise throughout, never a float — see the `Paise` type.
 */
export function buildWorkers(): AdminWorker[] {
  const rng = createRng(SEEDS.workers);
  const nextName = createNameFactory(rng);
  const workers: AdminWorker[] = [];

  for (let index = 0; index < WORKER_COUNT; index += 1) {
    const bucket = rng.weighted(
      JOB_BUCKETS,
      JOB_BUCKETS.map((b) => b.weight),
    );
    const jobsThisWeek = rng.int(bucket.min, bucket.max);

    const kycStatus = rng.weighted(
      KYC_WEIGHTS.map((k) => k.status),
      KYC_WEIGHTS.map((k) => k.weight),
    );

    /*
     * Only a verified worker can be online: an unverified worker cannot be
     * offered a job, so showing them as available would misrepresent supply on
     * the dispatch map.
     */
    const isVerified = kycStatus === KycStatus.VERIFIED;
    const isOnline = isVerified && rng.chance(0.45);
    const isOnJob = isOnline && rng.chance(0.38);

    const rating = rng.round(3.6, 5, 1);
    const ratingCount = rng.int(8, 420);

    /*
     * Tenure drives the lifetime figures. A worker who joined three weeks ago
     * cannot plausibly have 900 lifetime jobs, and the profile page shows both
     * numbers side by side where that inconsistency would be obvious.
     */
    const tenureDays = rng.int(21, 760);
    const weeksOnPlatform = Math.max(1, Math.round(tenureDays / 7));
    const lifetimeJobs = Math.max(
      jobsThisWeek,
      Math.round(weeksOnPlatform * rng.float(0.5, 1.25) * rng.float(0.8, 1.3) * 6),
    );

    /* Average job value, ₹250–₹3,200 gross, expressed in paise. */
    const avgJobPaise = rng.int(250, 3200) * 100;
    const lifetimeEarnings = Math.round(lifetimeJobs * avgJobPaise * 0.9);
    const fundContributed = Math.round(lifetimeJobs * avgJobPaise * 0.05);
    const walletBalance = Math.round(rng.float(0, 0.18) * lifetimeEarnings);

    /*
     * The equity inputs, each normalised to 0–1.
     *
     * `inverseAllocation` is the one that matters: it is high when this week's
     * job count is LOW, which is how a quiet worker gets ranked above a busy one
     * who happens to be nearer the customer.
     */
    const equityInputs: EquityScoreInputs = {
      proximity: rng.round(0.15, 1, 3),
      rating: Math.round(((rating - 3.6) / (5 - 3.6)) * 1000) / 1000,
      inverseAllocation: Math.round((1 - jobsThisWeek / MAX_JOBS_PER_WEEK) * 1000) / 1000,
    };

    /*
     * Twelve weeks of history ending with this week's actual count, so the
     * profile sparkline and the directory agree on the most recent value.
     */
    const weeklyJobHistory: number[] = [];
    for (let week = 0; week < 11; week += 1) {
      const drift = rng.int(-3, 3);
      weeklyJobHistory.push(Math.max(0, Math.min(MAX_JOBS_PER_WEEK, jobsThisWeek + drift)));
    }
    weeklyJobHistory.push(jobsThisWeek);

    workers.push({
      id: rng.uuid(),
      name: nextName(),
      avatarUrl: avatarUrl(index),
      category: rng.pick(WORKER_CATEGORIES),
      zoneId: rng.pick(ZONE_IDS),
      phone: phoneNumber(rng),
      rating,
      ratingCount,
      kycStatus,
      isOnline,
      isOnJob,
      jobsThisWeek,
      lifetimeJobs,
      walletBalance,
      fundContributed,
      lifetimeEarnings,
      joinedAt: isoAgo(tenureDays),
      equityScore: computeEquityScore(equityInputs),
      equityInputs,
      weeklyJobHistory,
      completionRate: rng.round(0.86, 1, 3),
    });
  }

  return workers;
}
