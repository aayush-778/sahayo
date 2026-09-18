import { io, type Socket } from 'socket.io-client';
import {
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  ServerEvent,
  type AdminBooking,
  type AdminLiveSnapshot,
  type BroadcastRecord,
  type ClientToServerEvents,
  type DispatchResolvedPayload,
  type DispatchRoundPayload,
  type LedgerEntry,
  type ServerToClientEvents,
} from '@sahayo/shared';
import { SEED_NOW } from '@/lib/dates';
import { CURRENT_ADMIN } from '@/lib/nav/session';
import { adminState, useAdminStore, type LiveMode, type LiveTopic } from '@/lib/store';

/**
 * The portal's live connection to the backend, joined to the `admin` room.
 *
 * The portal keeps building its own copy of the seeded dataset — identical to the
 * server's — and this applies what has happened since on top: workers moving, bookings
 * requested and accepted, dispatch rounds, ledger rows. With the backend down nothing
 * here runs and every page shows the seed, exactly as before.
 *
 * TIME. The seed is anchored at the fixed SEED_NOW, and every service measures "today"
 * and ages from it. A live record is placed on that clock by its age: something that
 * happened ten seconds ago on the server is placed ten seconds before SEED_NOW. So a live
 * request sits at the top of the queue with a real age, and today's counters include it.
 */

type AdminSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
const API = `${API_URL}/api/v1`;
/** Workers' online state and position are reconciled this often, on top of the live events. */
const RECONCILE_MS = 5_000;

let socket: AdminSocket | null = null;
let reconcileTimer: ReturnType<typeof setInterval> | null = null;
let users = 0;

/** A server timestamp, placed on the seed's clock by its age. */
function toSeedClock(iso: string): string {
  return new Date(Date.parse(iso) - (Date.now() - SEED_NOW.getTime())).toISOString();
}

function bookingOnSeedClock(booking: AdminBooking): AdminBooking {
  return {
    ...booking,
    createdAt: toSeedClock(booking.createdAt),
    ...(booking.acceptedAt ? { acceptedAt: toSeedClock(booking.acceptedAt) } : {}),
    ...(booking.completedAt ? { completedAt: toSeedClock(booking.completedAt) } : {}),
    timeline: booking.timeline.map((event) => ({ ...event, at: toSeedClock(event.at) })),
  };
}

function roundOnSeedClock(round: DispatchRoundPayload): DispatchRoundPayload {
  return {
    ...round,
    requestedAt: toSeedClock(round.requestedAt),
    offeredAt: toSeedClock(round.offeredAt),
    expiresAt: toSeedClock(round.expiresAt),
  };
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return (await response.json()) as T;
}

/** A booking's identity for change detection: what moves when anything about it does. */
const signatureOf = (booking: AdminBooking): string => `${booking.status}|${booking.workerId ?? ''}|${booking.timeline.length}`;

function applyBookings(bookings: AdminBooking[]): void {
  const state = adminState();
  const held = new Map(state.bookings.map((booking) => [booking.id, booking]));
  for (const booking of bookings) {
    const current = held.get(booking.id);
    if (current && signatureOf(current) === signatureOf(booking)) continue;
    state.upsertBooking(bookingOnSeedClock(booking));
  }
}

function applyWorkers(workers: AdminLiveSnapshot['workers']): void {
  const state = adminState();
  const held = new Map(state.workers.map((worker) => [worker.id, worker]));
  const changed = workers.filter((live) => {
    const current = held.get(live.id);
    return (
      current &&
      (current.isOnline !== live.isOnline ||
        current.isOnJob !== live.isOnJob ||
        current.jobsThisWeek !== live.jobsThisWeek ||
        current.kycStatus !== live.kycStatus ||
        current.location.lat !== live.location.lat ||
        current.location.lng !== live.location.lng)
    );
  });
  state.applyLiveWorkers(changed);
}

function fundBalance(ledger: LedgerEntry[]): number {
  let total = 0;
  for (const entry of ledger) {
    if (entry.account !== LedgerAccount.COOP_FUND) continue;
    total += entry.direction === LedgerDirection.CREDIT ? entry.amount : -entry.amount;
  }
  return total;
}

async function catchUp(): Promise<void> {
  const snapshot = await get<AdminLiveSnapshot>('/admin/live');
  applyWorkers(snapshot.workers);
  applyBookings(snapshot.bookings);
  adminState().appendLiveLedger(snapshot.ledgerEntries.map((entry) => ({ ...entry, createdAt: toSeedClock(entry.createdAt) })));
  for (const record of snapshot.broadcasts) {
    /* Only a dispatch that has moved on since it was last applied, so pages are not re-read for nothing. */
    const held = useAdminStore.getState().liveBroadcasts[record.bookingId];
    if (held && held.rounds.length === record.rounds.length && Boolean(held.resolution) === Boolean(record.resolution)) continue;
    adminState().applyLiveBroadcast({
      ...record,
      rounds: record.rounds.map(roundOnSeedClock),
      ...(record.resolution ? { resolution: { ...record.resolution, at: toSeedClock(record.resolution.at) } } : {}),
    });
  }
}

function connect(): void {
  if (socket) return;
  const store = useAdminStore.getState();
  store.setLiveMode('connecting');
  let everConnected = false;

  const created: AdminSocket = io(API_URL, {
    auth: { userId: CURRENT_ADMIN.id, role: 'ADMIN' },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 15_000,
    randomizationFactor: 0.25,
    timeout: 5_000,
  });
  socket = created;

  created.on('connect', () => {
    void (async () => {
      const wasDown = useAdminStore.getState().liveMode === 'reconnecting';
      try {
        await catchUp();
      } catch {
        /* The events still arrive; the next reconcile tries the snapshot again. */
      }
      if (created !== socket) return;
      everConnected = true;
      useAdminStore.getState().setLiveMode('live', wasDown ? Date.now() : null);
      reconcileTimer ??= setInterval(() => {
        void catchUp().catch(() => undefined);
      }, RECONCILE_MS);
    })();
  });

  created.on('connect_error', () => {
    if (created === socket) useAdminStore.getState().setLiveMode(everConnected ? 'reconnecting' : 'offline');
  });
  created.on('disconnect', (reason) => {
    if (created === socket && reason !== 'io client disconnect') useAdminStore.getState().setLiveMode('reconnecting');
  });

  created.on(ServerEvent.WORKER_MOVED, ({ workerId, location }) => {
    adminState().applyLiveWorkers([{ id: workerId, location, isOnline: true }]);
  });

  created.on(ServerEvent.BOOKING_UPDATED, ({ bookingId }) => {
    void get<AdminBooking>(`/admin/bookings/${encodeURIComponent(bookingId)}`)
      .then((booking) => applyBookings([booking]))
      .catch(() => undefined);
  });

  created.on(ServerEvent.DISPATCH_ROUND, (round) => {
    const current: BroadcastRecord = useAdminStore.getState().liveBroadcasts[round.bookingId] ?? { bookingId: round.bookingId, rounds: [] };
    adminState().applyLiveBroadcast({ ...current, rounds: [...current.rounds, roundOnSeedClock(round)] });
  });

  created.on(ServerEvent.DISPATCH_RESOLVED, (resolution: DispatchResolvedPayload) => {
    const current: BroadcastRecord = useAdminStore.getState().liveBroadcasts[resolution.bookingId] ?? { bookingId: resolution.bookingId, rounds: [] };
    adminState().applyLiveBroadcast({ ...current, resolution: { ...resolution, at: toSeedClock(resolution.at) } });
  });

  created.on(ServerEvent.LEDGER_APPENDED, ({ bookingId, reference, entries }) => {
    const state = adminState();
    const before = fundBalance(state.ledger);
    state.appendLiveLedger(entries.map((entry) => ({ ...entry, createdAt: toSeedClock(entry.createdAt) })));
    const after = fundBalance(adminState().ledger);
    const share = (type: LedgerEntryType) => entries.find((entry) => entry.type === type)?.amount ?? 0;
    const workerShare = share(LedgerEntryType.WORKER_PAYOUT);
    const platformShare = share(LedgerEntryType.PLATFORM_FEE);
    const fundShare = share(LedgerEntryType.COOP_FUND_CONTRIBUTION);
    if (fundShare === 0) return;
    state.showFundFinale({
      id: `${bookingId ?? 'ledger'}-${Date.now()}`,
      bookingId,
      reference,
      workerName: state.bookings.find((booking) => booking.id === bookingId)?.workerName,
      gross: workerShare + platformShare + fundShare,
      workerShare,
      platformShare,
      fundShare,
      fundBefore: after === before ? before - fundShare : before,
      fundAfter: after === before ? before : after,
      at: Date.now(),
    });
  });

  created.on(ServerEvent.WORKER_KYC_UPDATED, ({ workerId, kycStatus }) => {
    adminState().applyLiveWorkers([{ id: workerId, kycStatus }]);
  });
}

function disconnect(): void {
  if (reconcileTimer) clearInterval(reconcileTimer);
  reconcileTimer = null;
  socket?.removeAllListeners();
  socket?.io.removeAllListeners();
  socket?.disconnect();
  socket = null;
  useAdminStore.getState().setLiveMode('idle', null);
}

/**
 * Joins the backend's admin room and returns the way out. Counted, so two holders share one
 * socket. A plain function rather than a hook: this barrel is also imported by server routes.
 */
export function joinAdminRoom(): () => void {
  users += 1;
  connect();
  let left = false;
  return () => {
    if (left) return;
    left = true;
    users -= 1;
    if (users === 0) disconnect();
  };
}

/**
 * A counter that moves whenever live data of this kind changes. Pages list it in an
 * effect's dependencies to re-read through their services.
 */
export function useLiveVersion(...topics: LiveTopic[]): number {
  return useAdminStore((state) => topics.reduce((sum, topic) => sum + state.liveVersions[topic], 0));
}

export function useLiveMode(): { mode: LiveMode; restoredAt: number | null } {
  const mode = useAdminStore((state) => state.liveMode);
  const restoredAt = useAdminStore((state) => state.liveRestoredAt);
  return { mode, restoredAt };
}

/** The booking the backend most recently broadcast, for the dispatch console to open. */
export function useLatestLiveDispatch(): string | undefined {
  return useAdminStore((state) => {
    const ids = Object.keys(state.liveBroadcasts);
    return ids[ids.length - 1];
  });
}

/** The completion that just moved the fund, while its card is up. */
export function useFundFinale() {
  return useAdminStore((state) => state.fundFinale);
}

export function dismissFundFinale(): void {
  useAdminStore.getState().dismissFundFinale();
}

/** Ledger rows that arrived live, for the Finance page to mark. */
export function useFreshLedgerIds(): string[] {
  return useAdminStore((state) => state.freshLedgerIds);
}

/**
 * Tells the backend about a verification decision, so the worker's app hears it. A
 * no-op when the portal is not connected: the decision still stands in the portal.
 */
export async function pushKycDecision(workerId: string, status: 'VERIFIED' | 'REJECTED', reason?: string): Promise<void> {
  if (useAdminStore.getState().liveMode !== 'live') return;
  try {
    await fetch(`${API}/admin/workers/${encodeURIComponent(workerId)}/kyc`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status, adminId: CURRENT_ADMIN.id, ...(reason ? { reason } : {}) }),
    });
  } catch {
    /* The portal's own record is already updated; the worker app catches up on its next connect. */
  }
}
