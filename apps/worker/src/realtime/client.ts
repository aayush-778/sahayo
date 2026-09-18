import { io, type Socket } from 'socket.io-client';
import {
  ClientEvent,
  ServerEvent,
  type ClientToServerEvents,
  type GigAcceptAck,
  type GigAcceptPayload,
  type GigDeclinePayload,
  type Id,
  type LoginResult,
  type ServerToClientEvents,
} from '@sahayo/shared';

import { DEMO_WORKER_ID } from '../mocks';
import { useConnectionStore } from '../store/connection';
import { useSessionStore } from '../store/session';
import { useWorkerStore } from '../store/worker';
import { api } from './api';
import { API_URL, RECONNECT, TAKEN_NOTICE_MS } from './config';
import { hydrateFromServer, refreshEarningsAndFund } from './hydrate';
import { currentLocation, startLocationUpdates, stopLocationUpdates } from './location';
import { jobRequestFromOffer } from './mappers';

/**
 * The worker app's live connection.
 *
 * Signing in opens one socket, handshaking as this worker. The first successful connect
 * replaces the demo data with the server's; if the server cannot be reached at all the
 * app stays on the demo data, says so in a banner, and keeps trying. A dropped
 * connection keeps the server's data on screen and reconnects with exponential backoff,
 * re-announcing availability when it comes back.
 *
 * Screens never import this. Services do, and only to choose between the server and
 * the offline path behind the same function names.
 */

type WorkerSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: WorkerSocket | null = null;
/** The connection being opened, while its login request is still out. */
let starting: Promise<void> | null = null;
let session = 0;
const takenTimers = new Map<Id, ReturnType<typeof setTimeout>>();

const connection = useConnectionStore;

export function isLive(): boolean {
  return connection.getState().mode === 'live' && Boolean(socket?.connected);
}

/** True once this session has reached the server, even while it is reconnecting. */
export function isServerBacked(): boolean {
  const { mode } = connection.getState();
  return mode === 'live' || mode === 'reconnecting';
}

export function liveWorkerId(): Id | null {
  return connection.getState().workerId;
}

/**
 * Connects as the partner signed in on this phone. Idempotent: a second call while a
 * connection exists does nothing.
 */
export function startRealtime(phone: string): Promise<void> {
  if (socket) return Promise.resolve();
  if (starting) return starting;
  const opening: Promise<void> = open(phone).finally(() => {
    if (starting === opening) starting = null;
  });
  starting = opening;
  return opening;
}

async function open(phone: string): Promise<void> {
  const mine = (session += 1);
  connection.setState({ mode: 'connecting', attempt: 0, restoredAt: null });

  /* Who this phone number is on the server. An unknown number signs in as the demo partner, as the app always has. */
  let workerId: Id = DEMO_WORKER_ID;
  try {
    const login = await api<LoginResult>('POST', '/auth/login', { phone });
    if (login.workerId) workerId = login.workerId;
  } catch {
    /*
     * 404: a number the server does not know — the demo partner, as the app always did.
     * Unreachable: the socket below fails too and keeps retrying, as the demo partner.
     */
  }
  if (mine !== session) return;

  connection.setState({ workerId });
  const created: WorkerSocket = io(API_URL, {
    auth: { userId: workerId, role: 'WORKER' },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: RECONNECT.delayMs,
    reconnectionDelayMax: RECONNECT.maxDelayMs,
    randomizationFactor: RECONNECT.randomization,
    timeout: 5_000,
  });
  socket = created;
  let everConnected = false;

  created.on('connect', () => {
    /*
     * Synchronously, before the server's first events are processed: the scheduled
     * requests this session held are the ones the server is about to send again, and
     * any it does not send has been taken or has expired while the app was away.
     */
    useSessionStore.setState((state) => ({ scheduledRequests: state.scheduledRequests.filter((request) => request.source !== 'live') }));
    void (async () => {
      const wasDown = connection.getState().mode === 'reconnecting';
      try {
        await hydrateFromServer(workerId);
      } catch {
        /* The socket is up but a REST call failed; offers still work, and the next reconnect tries again. */
      }
      if (created !== socket) return;
      everConnected = true;
      /* The live dispatcher deals offers from here on; the offline demo's leave. */
      useSessionStore.setState((state) => ({
        jobRequests: state.jobRequests.filter((request) => request.source === 'live'),
        scheduledRequests: state.scheduledRequests.filter((request) => request.source === 'live'),
      }));
      connection.setState({ mode: 'live', attempt: 0, restoredAt: wasDown ? Date.now() : null });
      if (useWorkerStore.getState().isAvailable) void announceOnline();
    })();
  });

  created.on('connect_error', () => {
    if (created !== socket) return;
    const { attempt } = connection.getState();
    connection.setState({ mode: everConnected ? 'reconnecting' : 'offline', attempt: attempt + 1 });
  });

  created.on('disconnect', (reason) => {
    if (created !== socket) return;
    stopLocationUpdates();
    /* Offers cannot be answered without the socket; the server withdraws them on its own timer. */
    useSessionStore.setState((state) => ({ jobRequests: state.jobRequests.filter((request) => request.source !== 'live') }));
    if (reason === 'io client disconnect') return;
    connection.setState({ mode: 'reconnecting', attempt: 0 });
  });

  created.io.on('reconnect_attempt', (attempt) => {
    if (created !== socket) return;
    connection.setState({ mode: everConnected ? 'reconnecting' : 'offline', attempt });
  });

  created.on(ServerEvent.GIG_OFFER, (offer) => {
    const request = jobRequestFromOffer(offer, Date.now());
    /* Work for later never interrupts: it joins the Scheduled requests list instead. */
    if (request.scheduled) {
      useSessionStore.setState((state) => ({
        scheduledRequests: [...state.scheduledRequests.filter((entry) => entry.id !== request.id && entry.booking.id !== request.booking.id), request],
      }));
      return;
    }
    useSessionStore.setState((state) => ({
      jobRequests: [...state.jobRequests.filter((entry) => entry.id !== request.id && entry.booking.id !== request.booking.id), request],
    }));
  });

  created.on(ServerEvent.GIG_TAKEN, ({ offerId, bookingId }) => {
    /* Someone else took the booked-ahead job: it simply leaves the list. */
    useSessionStore.setState((state) => ({
      scheduledRequests: state.scheduledRequests.filter((request) => request.id !== offerId && request.booking.id !== bookingId),
    }));
    const ids = useSessionStore
      .getState()
      .jobRequests.filter((request) => request.id === offerId || request.booking.id === bookingId)
      .map((request) => request.id);
    if (ids.length === 0) return;
    useSessionStore.setState((state) => ({ takenOfferIds: { ...state.takenOfferIds, ...Object.fromEntries(ids.map((id) => [id, true as const])) } }));
    for (const id of ids) {
      clearTimeout(takenTimers.get(id));
      takenTimers.set(
        id,
        setTimeout(() => {
          takenTimers.delete(id);
          useSessionStore.setState((state) => {
            const { [id]: _gone, ...rest } = state.takenOfferIds;
            return { takenOfferIds: rest, jobRequests: state.jobRequests.filter((request) => request.id !== id) };
          });
        }, TAKEN_NOTICE_MS),
      );
    }
  });

  created.on(ServerEvent.GIG_EXPIRED, ({ offerId }) => {
    useSessionStore.setState((state) => ({
      jobRequests: state.jobRequests.filter((request) => request.id !== offerId),
      scheduledRequests: state.scheduledRequests.filter((request) => request.id !== offerId),
    }));
  });

  created.on(ServerEvent.BOOKING_UPDATED, ({ booking }) => {
    if (booking.workerId !== workerId) return;
    useSessionStore.setState((state) => ({
      bookings: [booking, ...state.bookings.filter((entry) => entry.id !== booking.id)],
      timelines: { ...state.timelines, [booking.id]: { ...state.timelines[booking.id], [booking.status]: state.timelines[booking.id]?.[booking.status] ?? booking.updatedAt } },
    }));
  });

  /* The cooperative decided this partner's verification: approval opens the job feed at once. */
  created.on(ServerEvent.WORKER_KYC_UPDATED, ({ workerId: decided, kycStatus }) => {
    if (decided !== workerId) return;
    const approved = kycStatus === 'VERIFIED';
    const { documents, patch } = useWorkerStore.getState();
    patch({
      isApproved: approved,
      ...(approved ? {} : { isAvailable: false }),
      documents: Object.fromEntries(
        Object.entries(documents).map(([kind, status]) => [kind, approved ? 'verified' : status === 'verified' ? status : 'rejected']),
      ) as typeof documents,
    });
    if (!approved) announceOffline();
  });

  created.on(ServerEvent.COOP_FUND_UPDATED, () => {
    void refreshEarningsAndFund(workerId).catch(() => undefined);
  });
}

/** Closes the connection and forgets it. Signing out, or losing approval. */
export function stopRealtime(): void {
  /* An open still waiting on its login sees the session change and gives up. */
  session += 1;
  starting = null;
  stopLocationUpdates();
  for (const timer of takenTimers.values()) clearTimeout(timer);
  takenTimers.clear();
  socket?.removeAllListeners();
  socket?.io.removeAllListeners();
  socket?.disconnect();
  socket = null;
  connection.setState({ mode: 'idle', attempt: 0, workerId: null, restoredAt: null });
}

/** Tells the dispatcher this worker is taking work, and starts sending their position. */
export async function announceOnline(): Promise<void> {
  const workerId = liveWorkerId();
  if (!socket?.connected || !workerId) return;
  const location = await startLocationUpdates((point) => {
    socket?.emit(ClientEvent.WORKER_LOCATION, { workerId, location: point, at: new Date().toISOString() });
  });
  const serviceCategoryIds = [useWorkerStore.getState().primaryCategory].filter((id): id is string => Boolean(id));
  socket?.emit(ClientEvent.WORKER_ONLINE, { workerId, serviceCategoryIds, location: location ?? currentLocation() });
}

/** Tells the dispatcher this worker has stopped taking work, and stops location at once. */
export function announceOffline(): void {
  stopLocationUpdates();
  const workerId = liveWorkerId();
  if (socket?.connected && workerId) socket.emit(ClientEvent.WORKER_OFFLINE, { workerId });
}

/** Sends an accept and waits for the server's verdict, or null if there is no connection to send it on. */
export async function sendAccept(payload: GigAcceptPayload): Promise<GigAcceptAck | null> {
  if (!socket?.connected) return null;
  try {
    return await socket.timeout(8_000).emitWithAck(ClientEvent.GIG_ACCEPT, payload);
  } catch {
    return null;
  }
}

export function sendDecline(payload: GigDeclinePayload): void {
  if (socket?.connected) socket.emit(ClientEvent.GIG_DECLINE, payload);
}
