import type { GeoPoint, Id, IsoDateTime, Paise } from './common';

export const KycStatus = {
  UNSUBMITTED: 'UNSUBMITTED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;
export type KycStatus = (typeof KycStatus)[keyof typeof KycStatus];

export const WorkerAvailability = {
  OFFLINE: 'OFFLINE',
  ONLINE: 'ONLINE',
  ON_JOB: 'ON_JOB',
} as const;
export type WorkerAvailability = (typeof WorkerAvailability)[keyof typeof WorkerAvailability];

export interface WorkerProfile {
  id: Id;
  userId: Id;
  /** Cooperative society this worker is a member of. */
  cooperativeId?: Id;
  /** ServiceCategory ids this worker is approved to take gigs for. */
  serviceCategoryIds: Id[];
  kycStatus: KycStatus;
  availability: WorkerAvailability;
  lastLocation?: GeoPoint;
  lastLocationAt?: IsoDateTime;
  /** Service radius in metres; falls back to DEFAULT_RADIUS_M when unset. */
  serviceRadiusM?: number;
  ratingAvg: number;
  ratingCount: number;
  completedJobs: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * The trade a worker is engaged for.
 *
 * Deliberately a small closed set rather than a free-text field: the dispatcher
 * matches on it, the analytics group by it, and eight categories is already past
 * the point where a pie chart stops being readable.
 */
export const WorkerCategory = {
  PLUMBER: 'PLUMBER',
  ELECTRICIAN: 'ELECTRICIAN',
  CAREGIVER: 'CAREGIVER',
  DRIVER: 'DRIVER',
  CLEANER: 'CLEANER',
  CARPENTER: 'CARPENTER',
  PAINTER: 'PAINTER',
  COOK: 'COOK',
} as const;
export type WorkerCategory = (typeof WorkerCategory)[keyof typeof WorkerCategory];

export const WORKER_CATEGORIES = Object.values(WorkerCategory);

/**
 * The inputs to a worker's equity score, kept separate from the score so the
 * dispatcher's reasoning can be shown rather than asserted.
 *
 * Each is normalised to 0–1. `inverseAllocation` is the one that makes this
 * platform different from a nearest-worker dispatcher: a worker who has taken
 * few jobs this week scores HIGH on it, which is how income is stopped from
 * concentrating in the hands of whoever happens to be closest.
 */
export interface EquityScoreInputs {
  proximity: number;
  rating: number;
  inverseAllocation: number;
}

/**
 * A worker as the administration sees them: identity, trade, and the
 * operational and equity figures the portal reasons about.
 *
 * Denormalised on purpose. `WorkerProfile` above is the relational shape the
 * backend will own; this is the row a directory lists and a dispatcher ranks,
 * and keeping it flat is what lets the prototype's service layer answer without
 * joins. The backend swaps in behind the same shape.
 */
export interface AdminWorker {
  id: Id;
  name: string;
  avatarUrl: string;
  category: WorkerCategory;
  zoneId: Id;
  phone: string;
  /** 3.6 to 5.0. Below 3.6 a worker would not still be on the platform. */
  rating: number;
  ratingCount: number;
  kycStatus: KycStatus;
  isOnline: boolean;
  /** Currently on a job. Implies `isOnline`. */
  isOnJob: boolean;
  /**
   * The equity signal, and the most important number in the directory. A low
   * value is a problem to be fixed by the dispatcher, not a judgement on the
   * worker.
   */
  jobsThisWeek: number;
  lifetimeJobs: number;
  walletBalance: Paise;
  /** What this worker has put into the cooperative fund over their lifetime. */
  fundContributed: Paise;
  lifetimeEarnings: Paise;
  joinedAt: IsoDateTime;
  /** Weighted combination of `equityInputs`, 0–1. Recomputed, never edited. */
  equityScore: number;
  equityInputs: EquityScoreInputs;
  /** Twelve weekly job counts, oldest first, for the profile sparkline. */
  weeklyJobHistory: number[];
  completionRate: number;
}
