import type {
  AadhaarAccessLogEntry,
  AdminBooking,
  AdminCustomer,
  AdminWorker,
  Dispute,
  KycSubmission,
  LedgerEntry,
  LoanRequest,
  PlatformSettings,
  Proposal,
  SettingsChange,
  TeamMember,
  Zone,
} from '../index';
import { buildBookings } from './bookings';
import { layCastOverDataset, layCastOverWorkers } from './cast-overlay';
import { buildCustomers } from './customers';
import { buildDisputes } from './disputes';
import { buildKycQueue } from './kyc';
import { buildLedger } from './ledger';
import { buildLoanRequests, buildProposals } from './proposals';
import { buildWorkers } from './workers';
import { DEFAULT_SETTINGS, buildTeam } from './settings';
import { ZONES } from './zones';

/**
 * The whole prototype dataset, in one shape.
 *
 * This is the in-memory database the store hydrates from. Nothing outside
 * `src/lib/store` should import from `src/lib/seed` — a component that reaches
 * for the seed directly bypasses both the store and the service layer, and
 * becomes the one call site that does not update when something changes.
 */
export interface SeedDataset {
  zones: Zone[];
  workers: AdminWorker[];
  bookings: AdminBooking[];
  customers: AdminCustomer[];
  ledger: LedgerEntry[];
  disputes: Dispute[];
  proposals: Proposal[];
  loanRequests: LoanRequest[];
  kycQueue: KycSubmission[];
  /** Empty at seed time. Every entry is written by an actual reveal. */
  aadhaarAccessLog: AadhaarAccessLogEntry[];
  settings: PlatformSettings;
  /** Empty at seed time, for the same reason as the Aadhaar access log. */
  settingsHistory: SettingsChange[];
  team: TeamMember[];
}

/**
 * Builds the dataset.
 *
 * Order matters, and it is a dependency order rather than a preference: bookings
 * need workers so a job is assigned to someone who does that trade, the ledger
 * needs bookings so an entry points at a real gross, and disputes need bookings
 * so a ticket has a timeline to reconstruct. Building them in any other order
 * would produce rows referring to ids that do not exist.
 *
 * Deterministic throughout — same figures on every call, on every machine. Call
 * it again to get a byte-identical dataset, which is what the "Reset demo data"
 * action in Phase 9 relies on.
 */
export function buildSeedDataset(): SeedDataset {
  /* The demo cast takes over 49 members before any job is assigned, so their jobs follow them. */
  const workers = layCastOverWorkers(buildWorkers());
  const bookings = buildBookings(workers);
  const ledger = buildLedger(bookings, workers);
  const disputes = buildDisputes(bookings);
  const customers = buildCustomers(bookings, disputes);
  const proposals = buildProposals(workers);
  const loanRequests = buildLoanRequests(workers);
  const kycQueue = buildKycQueue(workers);

  /* Then the cast's customers and hand-written bookings, over the finished dataset. */
  return layCastOverDataset({
    zones: ZONES,
    workers,
    bookings,
    customers,
    ledger,
    disputes,
    proposals,
    loanRequests,
    kycQueue,
    /*
     * The Aadhaar access log starts empty, and that is the correct initial state.
     * Seeding fake reveal events would put reveals in the audit trail that never
     * happened — the opposite of what an audit trail is for.
     */
    aadhaarAccessLog: [],
    /* A copy, so a change in the session can never write through to the defaults. */
    settings: structuredClone(DEFAULT_SETTINGS),
    settingsHistory: [],
    team: buildTeam(),
  });
}

export { BOOKING_COUNT, BOOKING_WINDOW_DAYS, isCompletedBooking } from './bookings';
export { DISPUTE_COUNT } from './disputes';
export { KYC_QUEUE_SIZE } from './kyc';
export { DEFAULT_SPLIT_SHARES, SEEDED_REVERSAL_COUNT, splitAmount, type SplitShares } from './ledger';
export { LOAN_REQUEST_COUNT } from './proposals';
export { DAY_MS, SEED_NOW, isoAgo } from './rng';
export { DEFAULT_EQUITY_WEIGHTS, WORKER_COUNT, computeEquityScore, type EquityWeights } from './workers';
export { DEFAULT_SETTINGS, buildTeam } from './settings';
export { ZONES, ZONE_IDS, getZone, zoneName } from './zones';
