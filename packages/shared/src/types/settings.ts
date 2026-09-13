import type { Id, IsoDateTime } from './common';

/**
 * Where each booking's money goes, as whole percentage points summing to 100.
 *
 * Whole points rather than fractions because this is the one figure administrators
 * type and confirm by hand, and "90 / 5 / 5" is how the cooperative's own bylaws
 * write it. Services convert to fractions at the point of splitting.
 */
export interface RevenueSplitSettings {
  workerPercent: number;
  platformPercent: number;
  fundPercent: number;
}

/**
 * How the equity dispatcher ranks workers, as whole percentage points summing to 100.
 */
export interface EquityWeightSettings {
  proximityPercent: number;
  ratingPercent: number;
  inverseAllocationPercent: number;
}

export interface DispatchSettings {
  /** How far a request is broadcast, in kilometres. 1 to 15. */
  broadcastRadiusKm: number;
  /** How long a worker has to accept an offer before it passes on, in seconds. */
  pingTimeoutSeconds: number;
  weights: EquityWeightSettings;
}

/** The cooperative's registered identity, printed on every compliance export. */
export interface PlatformDetails {
  cooperativeName: string;
  /** Registration under the Multi-State Co-operative Societies Act, 2002. */
  registrationNumber: string;
  registeredOffice: string;
  supportPhone: string;
  supportEmail: string;
  /** Hours bookings are accepted, as `HH:MM` in India Standard Time. */
  serviceHoursStart: string;
  serviceHoursEnd: string;
}

export interface PlatformSettings {
  platform: PlatformDetails;
  dispatch: DispatchSettings;
  split: RevenueSplitSettings;
}

export type SettingsSection = 'PLATFORM' | 'DISPATCH' | 'PAYMENTS';

/**
 * One change to the settings, kept forever.
 *
 * Settings changes are part of the concurrent audit log the CRCS export carries, so a
 * change is recorded with who made it, what it was before and what it became — never
 * overwritten, the same rule the ledger follows.
 */
export interface SettingsChange {
  id: Id;
  section: SettingsSection;
  /** A sentence describing the change, e.g. "Worker share 90% to 85%". */
  summary: string;
  before: string;
  after: string;
  adminId: Id;
  adminName: string;
  changedAt: IsoDateTime;
}

/** A member of the administration team. */
export interface TeamMember {
  id: Id;
  name: string;
  role: string;
  email: string;
  /** What this person may do, in a sentence. */
  permissions: string;
  joinedAt: IsoDateTime;
}
