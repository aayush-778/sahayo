import {
  COOP_FUND_SHARE,
  DEFAULT_RADIUS_M,
  EQUITY_WEIGHT_INVERSE_ALLOCATION,
  EQUITY_WEIGHT_PROXIMITY,
  EQUITY_WEIGHT_RATING,
  GIG_OFFER_TIMEOUT_MS,
  PLATFORM_SHARE,
  WORKER_SHARE,
  type PlatformSettings,
  type TeamMember,
} from '../index';
import { isoAgo } from './rng';

/** A fraction from constants.ts as the whole percentage points Settings works in. */
const points = (share: number): number => Math.round(share * 100);

/**
 * The settings the cooperative launched with.
 *
 * Every number is read from constants.ts rather than written again here, so the portal
 * opens on exactly the split and weights the mobile apps use. Settings can move them for
 * the session; "Reset demo data" puts these back.
 */
export const DEFAULT_SETTINGS: PlatformSettings = {
  platform: {
    cooperativeName: 'Sahayo Shramik Sahakari Samiti Ltd.',
    registrationNumber: 'MSCS/CR/1187/2024',
    registeredOffice: 'Boring Road, Patna, Bihar 800001',
    supportPhone: '+91 61220 45800',
    supportEmail: 'help@sahayo.coop',
    serviceHoursStart: '07:00',
    serviceHoursEnd: '21:00',
  },
  dispatch: {
    broadcastRadiusKm: DEFAULT_RADIUS_M / 1000,
    pingTimeoutSeconds: GIG_OFFER_TIMEOUT_MS / 1000,
    weights: {
      proximityPercent: points(EQUITY_WEIGHT_PROXIMITY),
      ratingPercent: points(EQUITY_WEIGHT_RATING),
      inverseAllocationPercent: points(EQUITY_WEIGHT_INVERSE_ALLOCATION),
    },
  },
  split: {
    workerPercent: points(WORKER_SHARE),
    platformPercent: points(PLATFORM_SHARE),
    fundPercent: points(COOP_FUND_SHARE),
  },
};

/**
 * The administration team.
 *
 * The first member is the signed-in administrator from src/lib/nav/session.ts, under the
 * same id, so the audit rows she writes point at someone on this list.
 */
export function buildTeam(): TeamMember[] {
  return [
    {
      id: 'admin-anjali-verma',
      name: 'Anjali Verma',
      role: 'Cooperative administrator',
      email: 'anjali.verma@sahayo.coop',
      permissions: 'Everything, including the payment split and compliance exports.',
      joinedAt: isoAgo(640),
    },
    {
      id: 'admin-rakesh-paswan',
      name: 'Rakesh Paswan',
      role: 'Dispatch lead',
      email: 'rakesh.paswan@sahayo.coop',
      permissions: 'Live dispatch, reassignments and the dispatch rules. Cannot change the split.',
      joinedAt: isoAgo(511),
    },
    {
      id: 'admin-farhana-khatoon',
      name: 'Farhana Khatoon',
      role: 'Verification officer',
      email: 'farhana.khatoon@sahayo.coop',
      permissions: 'Document review, including logged Aadhaar reveals. No access to money.',
      joinedAt: isoAgo(402),
    },
    {
      id: 'admin-suresh-mandal',
      name: 'Suresh Mandal',
      role: 'Accounts and audit',
      email: 'suresh.mandal@sahayo.coop',
      permissions: 'Finance, payouts, reversals and the CRCS export. Read-only on dispatch.',
      joinedAt: isoAgo(288),
    },
  ];
}
