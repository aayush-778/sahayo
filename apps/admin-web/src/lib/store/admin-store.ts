import type {
  AadhaarAccessLogEntry,
  AdminBooking,
  AdminCustomer,
  AdminWorker,
  Dispute,
  KycStatus,
  KycSubmission,
  LedgerEntry,
  LoanRequest,
  PlatformSettings,
  Proposal,
  SettingsChange,
  TeamMember,
  Zone,
} from '@sahayo/shared';
import { create } from 'zustand';
import { DEFAULT_SETTINGS, buildSeedDataset, computeEquityScore } from '@/lib/seed';

/**
 * The in-memory database for the prototype.
 *
 * ONLY `src/lib/services/**` may import this module. A React component must
 * never read the store directly and must never mutate it — see the rule at the
 * top of `src/lib/services/index.ts`. The restriction is enforced by
 * `no-restricted-imports` in eslint.config.mjs, so a violation fails lint rather
 * than relying on anyone remembering.
 *
 * The reason is the seam: when the real backend arrives, a service function's
 * body changes from "read this array" to "fetch this endpoint" and every page
 * keeps working. A component that read the store directly would be the one call
 * site that has to be rewritten, and the one that silently stops updating.
 *
 * Every mutator here is narrow and named for the domain event it records, not
 * for the field it sets. That is what lets one call — `approveKyc(id)` — update
 * the worker's badge in the directory, the queue's count, and the dashboard's
 * verification stat at once, because all three read derived state from this one
 * store.
 */

/** One domain slice per collection, plus the mutators that write to it. */
export interface AdminState {
  /** False until the seed has been loaded. Services await hydration. */
  hydrated: boolean;

  zones: Zone[];
  workers: AdminWorker[];
  bookings: AdminBooking[];
  customers: AdminCustomer[];
  ledger: LedgerEntry[];
  disputes: Dispute[];
  proposals: Proposal[];
  loanRequests: LoanRequest[];
  kycQueue: KycSubmission[];
  aadhaarAccessLog: AadhaarAccessLogEntry[];
  settings: PlatformSettings;
  settingsHistory: SettingsChange[];
  team: TeamMember[];

  /* --- lifecycle ---------------------------------------------------------- */

  /** Loads the seed. Idempotent: a second call on a hydrated store is a no-op. */
  hydrate(): void;
  /**
   * Rebuilds the store from the seed, discarding every change made in the
   * session. This is what the "Reset demo data" action calls, so a fumbled run
   * recovers in one click — and because the seed is deterministic, the figures
   * afterwards are identical to a fresh load.
   */
  reset(): void;

  /* --- workers ----------------------------------------------------------- */

  setWorkerOnline(workerId: string, isOnline: boolean): void;
  setWorkerKycStatus(workerId: string, status: KycStatus): void;
  setWorkerZone(workerId: string, zoneId: string): void;

  /* --- kyc --------------------------------------------------------------- */

  /** Records a review decision on a submission. */
  reviewKycSubmission(submissionId: string, patch: Partial<KycSubmission>): void;
  /** Appends one reveal to the audit log. Never removes or rewrites an entry. */
  appendAadhaarAccess(entry: AadhaarAccessLogEntry): void;

  /* --- ledger ------------------------------------------------------------ */

  /**
   * Appends entries. There is deliberately no update and no delete: the ledger
   * is append-only, and a correction is a new compensating entry pointing at the
   * original through `reversalOf`. The original stays byte-identical forever.
   */
  appendLedgerEntries(entries: LedgerEntry[]): void;

  /* --- disputes ---------------------------------------------------------- */

  updateDispute(disputeId: string, patch: Partial<Dispute>): void;

  /* --- fund -------------------------------------------------------------- */

  updateProposal(proposalId: string, patch: Partial<Proposal>): void;
  /** Adds a newly put-forward proposal, newest first. */
  addProposal(proposal: Proposal): void;
  updateLoanRequest(loanId: string, patch: Partial<LoanRequest>): void;

  /* --- bookings ---------------------------------------------------------- */

  /** Adds a booking, newest first. Used by the dispatch simulator. */
  addBooking(booking: AdminBooking): void;
  updateBooking(bookingId: string, patch: Partial<AdminBooking>): void;

  /* --- customers --------------------------------------------------------- */

  updateCustomer(customerId: string, patch: Partial<AdminCustomer>): void;

  /* --- settings ---------------------------------------------------------- */

  /**
   * Replaces the settings and records the change, in one write, so a setting can never
   * move without its audit row. When the dispatch weights change, every worker's stored
   * equity score is recomputed with the new weights, so the directory, the profile and
   * the Broadcast Inspector keep agreeing about who ranks where.
   */
  applySettings(settings: PlatformSettings, change: SettingsChange): void;
}

/** Replaces the one item matching `id`, leaving the array's order untouched. */
function patchById<T extends { id: string }>(items: T[], id: string, patch: Partial<T>): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export const useAdminStore = create<AdminState>((set, get) => ({
  /*
   * Collections start empty and `hydrate()` fills them. They are not seeded in
   * the initialiser because `reset()` must be able to rebuild them from the same
   * function, and because a store that builds 12,000 bookings at module-eval time
   * would do it during the server render of every route.
   */
  hydrated: false,
  zones: [],
  workers: [],
  bookings: [],
  customers: [],
  ledger: [],
  disputes: [],
  proposals: [],
  loanRequests: [],
  kycQueue: [],
  aadhaarAccessLog: [],
  settings: structuredClone(DEFAULT_SETTINGS),
  settingsHistory: [],
  team: [],

  hydrate() {
    if (get().hydrated) return;
    set({ ...buildSeedDataset(), hydrated: true });
  },

  reset() {
    set({ ...buildSeedDataset(), hydrated: true });
  },

  setWorkerOnline(workerId, isOnline) {
    set((state) => ({
      workers: patchById(state.workers, workerId, {
        isOnline,
        /* Going offline necessarily ends being on a job. */
        ...(isOnline ? {} : { isOnJob: false }),
      }),
    }));
  },

  setWorkerKycStatus(workerId, status) {
    set((state) => ({
      workers: patchById(state.workers, workerId, {
        kycStatus: status,
        /*
         * Losing verification takes a worker off the map. An unverified worker
         * cannot be offered a job, so leaving them shown as available would
         * misrepresent supply.
         */
        ...(status === 'VERIFIED' ? {} : { isOnline: false, isOnJob: false }),
      }),
    }));
  },

  setWorkerZone(workerId, zoneId) {
    set((state) => ({ workers: patchById(state.workers, workerId, { zoneId }) }));
  },

  reviewKycSubmission(submissionId, patch) {
    set((state) => ({ kycQueue: patchById(state.kycQueue, submissionId, patch) }));
  },

  appendAadhaarAccess(entry) {
    set((state) => ({ aadhaarAccessLog: [entry, ...state.aadhaarAccessLog] }));
  },

  appendLedgerEntries(entries) {
    set((state) => ({ ledger: [...state.ledger, ...entries] }));
  },

  updateDispute(disputeId, patch) {
    set((state) => ({ disputes: patchById(state.disputes, disputeId, patch) }));
  },

  updateProposal(proposalId, patch) {
    set((state) => ({ proposals: patchById(state.proposals, proposalId, patch) }));
  },

  addProposal(proposal) {
    set((state) => ({ proposals: [proposal, ...state.proposals] }));
  },

  updateLoanRequest(loanId, patch) {
    set((state) => ({ loanRequests: patchById(state.loanRequests, loanId, patch) }));
  },

  addBooking(booking) {
    set((state) => ({ bookings: [booking, ...state.bookings] }));
  },

  updateBooking(bookingId, patch) {
    set((state) => ({ bookings: patchById(state.bookings, bookingId, patch) }));
  },

  updateCustomer(customerId, patch) {
    set((state) => ({ customers: patchById(state.customers, customerId, patch) }));
  },

  applySettings(settings, change) {
    set((state) => {
      const before = state.settings.dispatch.weights;
      const after = settings.dispatch.weights;
      const weightsChanged =
        before.proximityPercent !== after.proximityPercent ||
        before.ratingPercent !== after.ratingPercent ||
        before.inverseAllocationPercent !== after.inverseAllocationPercent;
      const weights = {
        proximity: after.proximityPercent / 100,
        rating: after.ratingPercent / 100,
        inverseAllocation: after.inverseAllocationPercent / 100,
      };
      return {
        settings,
        settingsHistory: [change, ...state.settingsHistory],
        ...(weightsChanged
          ? {
              workers: state.workers.map((worker) => ({
                ...worker,
                equityScore: computeEquityScore(worker.equityInputs, weights),
              })),
            }
          : {}),
      };
    });
  },
}));

/**
 * Reads the store outside React, for the service layer.
 *
 * Services are plain async functions, not hooks, so they cannot subscribe. They
 * read through this and write through the mutators; components subscribe to the
 * same store through the service layer's hooks, and so re-render when a service
 * writes.
 */
export function adminState(): AdminState {
  /*
   * Hydrate on first read rather than in a provider. The store is the prototype's
   * database, and a service call that arrived before a component mounted would
   * otherwise see empty collections.
   */
  const state = useAdminStore.getState();
  if (!state.hydrated) {
    state.hydrate();
    return useAdminStore.getState();
  }
  return state;
}
