import type { GeoPoint, Id, IsoDateTime } from './common';

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
