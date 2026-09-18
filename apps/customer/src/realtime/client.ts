import { io, type Socket } from 'socket.io-client';
import {
  ServerEvent,
  type BookingListResult,
  type BookingRecord,
  type ClientToServerEvents,
  type Id,
  type LoginResult,
  type ServerToClientEvents,
} from '@sahayo/shared';

import { CUSTOMER_ID } from '../mocks/bookings';
import { useBookingsStore } from '../store/bookings';
import { useConnectionStore } from '../store/connection';
import { api } from './api';
import { API_URL, RECONNECT } from './config';

/**
 * The customer app's live connection.
 *
 * Signing in opens one socket as this customer. The server puts it in the room of every
 * booking still in motion, so booking:updated and worker:moved arrive without asking.
 * The first connect replaces the demo bookings with the server's; if the server cannot be
 * reached the app stays on the demo flow, says so, and keeps trying. A dropped connection
 * keeps the server's bookings on screen and reconnects with exponential backoff.
 *
 * Screens never import this. The services in src/services do.
 */

type CustomerSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: CustomerSocket | null = null;
let starting: Promise<void> | null = null;
let session = 0;

const connection = useConnectionStore;

/** True once this session has reached the server, even while it is reconnecting. */
export function isServerBacked(): boolean {
  const { mode } = connection.getState();
  return mode === 'live' || mode === 'reconnecting';
}

export function liveCustomerId(): Id | null {
  return connection.getState().customerId;
}

/** Connects as the customer signed in on this phone. Idempotent. */
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

  /* An account the server does not know signs in as the demo customer, as the app always has. */
  let customerId: Id = CUSTOMER_ID;
  try {
    const login = await api<LoginResult>('POST', '/auth/login', { phone });
    if (login.role === 'CUSTOMER') customerId = login.user.id;
  } catch {
    /* 404 or unreachable: the demo customer. The socket below retries if unreachable. */
  }
  if (mine !== session) return;

  connection.setState({ customerId });
  const created: CustomerSocket = io(API_URL, {
    auth: { userId: customerId, role: 'CUSTOMER' },
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
    void (async () => {
      const wasDown = connection.getState().mode === 'reconnecting';
      try {
        const list = await api<BookingListResult>('GET', `/bookings?role=CUSTOMER&userId=${encodeURIComponent(customerId)}`);
        if (created === socket) useBookingsStore.getState().setLive(list.records);
      } catch {
        /* Tracking still works for bookings made from here on; the next reconnect tries again. */
      }
      if (created !== socket) return;
      everConnected = true;
      connection.setState({ mode: 'live', attempt: 0, restoredAt: wasDown ? Date.now() : null });
    })();
  });

  created.on('connect_error', () => {
    if (created !== socket) return;
    const { attempt } = connection.getState();
    connection.setState({ mode: everConnected ? 'reconnecting' : 'offline', attempt: attempt + 1 });
  });

  created.on('disconnect', (reason) => {
    if (created !== socket || reason === 'io client disconnect') return;
    connection.setState({ mode: 'reconnecting', attempt: 0 });
  });

  created.io.on('reconnect_attempt', (attempt) => {
    if (created !== socket) return;
    connection.setState({ mode: everConnected ? 'reconnecting' : 'offline', attempt });
  });

  created.on(ServerEvent.BOOKING_UPDATED, ({ bookingId, booking, worker }) => {
    if (booking.customerId !== customerId) return;
    const known = Boolean(useBookingsStore.getState().live[bookingId]);
    useBookingsStore.getState().upsertLive(bookingId, (current) => ({
      ...current,
      record: {
        ...(current?.record ?? { reference: '', customerName: '', timeline: [] }),
        booking,
        ...((worker ?? current?.record.worker) ? { worker: worker ?? current?.record.worker } : {}),
      },
    }));
    /* A booking made on another device: fetch the rest of its record once. */
    if (!known) void refreshBooking(bookingId);
  });

  created.on(ServerEvent.WORKER_MOVED, ({ bookingId, location, at }) => {
    if (!bookingId || !useBookingsStore.getState().live[bookingId]) return;
    useBookingsStore.getState().upsertLive(bookingId, (current) => ({ ...current!, workerLocation: { point: location, at } }));
  });
}

/** Closes the connection and forgets it. Signing out. */
export function stopRealtime(): void {
  session += 1;
  starting = null;
  socket?.removeAllListeners();
  socket?.io.removeAllListeners();
  socket?.disconnect();
  socket = null;
  connection.setState({ mode: 'idle', attempt: 0, customerId: null, restoredAt: null });
}

/** Re-reads one booking's full record from the server. */
export async function refreshBooking(bookingId: Id): Promise<void> {
  try {
    const record = await api<BookingRecord>('GET', `/bookings/${encodeURIComponent(bookingId)}`);
    useBookingsStore.getState().upsertLive(bookingId, (current) => ({ ...current, record }));
  } catch {
    /* The socket's copy stands. */
  }
}
