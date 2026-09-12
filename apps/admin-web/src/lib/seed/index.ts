import type {
  AadhaarAccessLogEntry,
  AdminBooking,
  AdminWorker,
  Dispute,
  KycSubmission,
  LedgerEntry,
  LoanRequest,
  Proposal,
  Zone,
} from '@sahayo/shared';
import { buildBookings } from './bookings';
import { buildDisputes } from './disputes';
import { buildKycQueue } from './kyc';
import { buildLedger } from './ledger';
import { buildLoanRequests, buildProposals } from './proposals';
import { buildWorkers } from './workers';
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
  ledger: LedgerEntry[];
  disputes: Dispute[];
  proposals: Proposal[];
  loanRequests: LoanRequest[];
  kycQueue: KycSubmission[];
  /** Empty at seed time. Every entry is written by an actual reveal. */
  aadhaarAccessLog: AadhaarAccessLogEntry[];
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
  const workers = buildWorkers();
  const bookings = buildBookings(workers);
  const ledger = buildLedger(bookings, workers);
  const disputes = buildDisputes(bookings);
  const proposals = buildProposals(workers);
  const loanRequests = buildLoanRequests(workers);
  const kycQueue = buildKycQueue(workers);

  return {
    zones: ZONES,
    workers,
    bookings,
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
  };
}

export { BOOKING_COUNT, BOOKING_WINDOW_DAYS, isCompletedBooking } from './bookings';
export { DISPUTE_COUNT } from './disputes';
export { KYC_QUEUE_SIZE } from './kyc';
export { SEEDED_REVERSAL_COUNT, splitAmount } from './ledger';
export { LOAN_REQUEST_COUNT } from './proposals';
export { DAY_MS, SEED_NOW, isoAgo } from './rng';
export { WORKER_COUNT, computeEquityScore } from './workers';
export { ZONES, ZONE_IDS, getZone, zoneName } from './zones';
