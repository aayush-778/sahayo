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
 * The trade a worker is engaged for: one per worker type in the service catalogue.
 *
 * A small closed set rather than a free-text field, because the dispatcher matches on
 * it and the analytics group by it. It mirrors the catalogue's ten worker types one to
 * one — see `CATEGORY_ID_BY_WORKER_CATEGORY` — so the trade a customer books and the
 * trade the portal reports are the same thing. It used to be a separate list of eight,
 * with cooks the catalogue does not sell and no technicians, domestic helpers or
 * gardeners, which made a gardener booked in the customer app unreportable here.
 *
 * Declared in the catalogue's display order.
 */
export const WorkerCategory = {
  ELECTRICIAN: 'ELECTRICIAN',
  PLUMBER: 'PLUMBER',
  CARPENTER: 'CARPENTER',
  PAINTER: 'PAINTER',
  DOMESTIC_HELPER: 'DOMESTIC_HELPER',
  CAREGIVER: 'CAREGIVER',
  DRIVER: 'DRIVER',
  GARDENER: 'GARDENER',
  CLEANER: 'CLEANER',
  TECHNICIAN: 'TECHNICIAN',
} as const;
export type WorkerCategory = (typeof WorkerCategory)[keyof typeof WorkerCategory];

export const WORKER_CATEGORIES = Object.values(WorkerCategory);

/** Each trade's worker type in the catalogue (`serviceCategories` in catalogue.ts). */
export const CATEGORY_ID_BY_WORKER_CATEGORY: Record<WorkerCategory, Id> = {
  ELECTRICIAN: 'cat_electricians',
  PLUMBER: 'cat_plumbers',
  CARPENTER: 'cat_carpenters',
  PAINTER: 'cat_painters',
  DOMESTIC_HELPER: 'cat_domestic_helpers',
  CAREGIVER: 'cat_caregivers',
  DRIVER: 'cat_drivers',
  GARDENER: 'cat_gardeners',
  CLEANER: 'cat_cleaners',
  TECHNICIAN: 'cat_technicians',
};

/** The reverse of `CATEGORY_ID_BY_WORKER_CATEGORY`. */
export const WORKER_CATEGORY_BY_CATEGORY_ID: Readonly<Record<Id, WorkerCategory>> = Object.fromEntries(
  WORKER_CATEGORIES.map((category) => [CATEGORY_ID_BY_WORKER_CATEGORY[category], category]),
);

/** How a trade reads in a sentence or a table cell: "Domestic helper", not "DOMESTIC_HELPER". */
export const WORKER_CATEGORY_LABEL: Record<WorkerCategory, string> = {
  ELECTRICIAN: 'Electrician',
  PLUMBER: 'Plumber',
  CARPENTER: 'Carpenter',
  PAINTER: 'Painter',
  DOMESTIC_HELPER: 'Domestic helper',
  CAREGIVER: 'Caregiver',
  DRIVER: 'Driver',
  GARDENER: 'Gardener',
  CLEANER: 'Cleaner',
  TECHNICIAN: 'Technician',
};

export function workerCategoryLabel(category: WorkerCategory): string {
  return WORKER_CATEGORY_LABEL[category];
}

/** The trade a label names, for records that store the label (a booking's `category`). */
export function workerCategoryFromLabel(label: string): WorkerCategory | undefined {
  return WORKER_CATEGORIES.find((category) => WORKER_CATEGORY_LABEL[category] === label);
}

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
  /** The worker's primary trade: the first of `serviceCategoryIds`. */
  category: WorkerCategory;
  /**
   * Every catalogue worker type this worker takes, primary first. What the dispatcher
   * matches a request against; most workers have one, some have two.
   */
  serviceCategoryIds: Id[];
  zoneId: Id;
  /**
   * Where the worker is, or was last seen. A fixed point in the seed; in production it
   * follows the worker app's location updates.
   */
  location: GeoPoint;
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
