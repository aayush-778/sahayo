import type {
  AadhaarAccessLogEntry,
  AdminBooking,
  BroadcastRecord,
  GeoPoint,
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
  /** Notification ids the administrator has read. An id changes when its count does. */
  readNotificationIds: string[];
  /** Notification kinds switched off in the account preferences. */
  mutedNotificationKinds: string[];

  /* --- the live server -------------------------------------------------------- */

  /** Whether the portal is receiving the backend's events. 'offline' means the seed alone. */
  liveMode: LiveMode;
  /** When a dropped connection last came back, for a brief note. */
  liveRestoredAt: number | null;
  /**
   * A counter per kind of live change. Pages add the one they show to their effect
   * dependencies and re-read through their services when it moves.
   */
  liveVersions: Record<LiveTopic, number>;
  /** Real dispatch records from the backend, by booking. The Broadcast Inspector prefers these. */
  liveBroadcasts: Record<string, BroadcastRecord>;
  /** Ledger rows that arrived live, newest last, so the Finance page can mark them. */
  freshLedgerIds: string[];
  /** The completion that just moved the fund, for the finale card. */
  fundFinale: FundFinale | null;

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

  /* --- notifications ----------------------------------------------------- */

  markNotificationsRead(ids: string[]): void;
  setNotificationKindMuted(kind: string, muted: boolean): void;

  /* --- live ----------------------------------------------------------------- */

  setLiveMode(mode: LiveMode, restoredAt?: number | null): void;
  /** Applies workers' live fields: online, on a job, where they are, this week's jobs, verification. */
  applyLiveWorkers(patches: LiveWorkerPatch[]): void;
  /** Adds a booking or replaces the one with its id. */
  upsertBooking(booking: AdminBooking): void;
  applyLiveBroadcast(record: BroadcastRecord): void;
  /** Appends live ledger rows, skipping any already held. Never rewrites a row. */
  appendLiveLedger(entries: LedgerEntry[]): void;
  showFundFinale(finale: FundFinale): void;
  dismissFundFinale(): void;
}

export type LiveMode = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'offline';
export type LiveTopic = 'workers' | 'bookings' | 'ledger' | 'dispatch' | 'kyc';

export interface LiveWorkerPatch {
  id: string;
  isOnline?: boolean;
  isOnJob?: boolean;
  location?: GeoPoint;
  jobsThisWeek?: number;
  kycStatus?: KycStatus;
}

/** A finished job's money arriving: the three shares, and the fund before and after. */
export interface FundFinale {
  id: string;
  bookingId?: string;
  reference?: string;
  workerName?: string;
  gross: number;
  workerShare: number;
  platformShare: number;
  fundShare: number;
  fundBefore: number;
  fundAfter: number;
  at: number;
}

const NO_VERSIONS: Record<LiveTopic, number> = { workers: 0, bookings: 0, ledger: 0, dispatch: 0, kyc: 0 };

function bump(versions: Record<LiveTopic, number>, ...topics: LiveTopic[]): Record<LiveTopic, number> {
  const next = { ...versions };
  for (const topic of topics) next[topic] += 1;
  return next;
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
  readNotificationIds: [],
  mutedNotificationKinds: [],
  liveMode: 'idle',
  liveRestoredAt: null,
  liveVersions: NO_VERSIONS,
  liveBroadcasts: {},
  freshLedgerIds: [],
  fundFinale: null,

  hydrate() {
    if (get().hydrated) return;
    set({ ...buildSeedDataset(), hydrated: true });
  },

  reset() {
    set((state) => ({
      ...buildSeedDataset(),
      readNotificationIds: [],
      mutedNotificationKinds: [],
      liveBroadcasts: {},
      freshLedgerIds: [],
      fundFinale: null,
      /* Every page re-reads, so nothing keeps showing the discarded session. */
      liveVersions: bump(state.liveVersions, 'workers', 'bookings', 'ledger', 'dispatch', 'kyc'),
      hydrated: true,
    }));
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

  markNotificationsRead(ids) {
    set((state) => ({ readNotificationIds: [...new Set([...state.readNotificationIds, ...ids])] }));
  },

  setNotificationKindMuted(kind, muted) {
    set((state) => ({
      mutedNotificationKinds: muted
        ? [...new Set([...state.mutedNotificationKinds, kind])]
        : state.mutedNotificationKinds.filter((candidate) => candidate !== kind),
    }));
  },

  setLiveMode(mode, restoredAt) {
    set((state) => ({ liveMode: mode, liveRestoredAt: restoredAt === undefined ? state.liveRestoredAt : restoredAt }));
  },

  applyLiveWorkers(patches) {
    if (patches.length === 0) return;
    set((state) => {
      const byId = new Map(patches.map((patch) => [patch.id, patch]));
      const kycChanged = patches.some((patch) => patch.kycStatus !== undefined && state.workers.find((w) => w.id === patch.id)?.kycStatus !== patch.kycStatus);
      return {
        workers: state.workers.map((worker) => {
          const patch = byId.get(worker.id);
          /* The patch carries the same id, so spreading it over the worker changes only the live fields. */
          return patch ? { ...worker, ...patch } : worker;
        }),
        liveVersions: kycChanged ? bump(state.liveVersions, 'workers', 'kyc') : bump(state.liveVersions, 'workers'),
      };
    });
  },

  upsertBooking(booking) {
    set((state) => {
      const exists = state.bookings.some((candidate) => candidate.id === booking.id);
      return {
        bookings: exists ? state.bookings.map((candidate) => (candidate.id === booking.id ? booking : candidate)) : [booking, ...state.bookings],
        liveVersions: bump(state.liveVersions, 'bookings'),
      };
    });
  },

  applyLiveBroadcast(record) {
    set((state) => ({
      liveBroadcasts: { ...state.liveBroadcasts, [record.bookingId]: record },
      liveVersions: bump(state.liveVersions, 'dispatch'),
    }));
  },

  appendLiveLedger(entries) {
    set((state) => {
      const held = new Set(state.ledger.slice(-500).map((entry) => entry.id));
      const fresh = entries.filter((entry) => !held.has(entry.id));
      if (fresh.length === 0) return {};
      return {
        ledger: [...state.ledger, ...fresh],
        freshLedgerIds: [...state.freshLedgerIds, ...fresh.map((entry) => entry.id)].slice(-60),
        liveVersions: bump(state.liveVersions, 'ledger'),
      };
    });
  },

  showFundFinale(finale) {
    set({ fundFinale: finale });
  },

  dismissFundFinale() {
    set({ fundFinale: null });
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
