import type { AddressInfo } from 'node:net';
import {
  ClientEvent,
  KycStatus,
  type ClientToServerEvents,
  type CreateBookingResult,
  type GeoPoint,
  type ServerToClientEvents,
} from '@sahayo/shared';
import { io as connect, type Socket } from 'socket.io-client';
import { createBackend, type Backend } from '../src/app';
import { quietLogger } from '../src/dispatch/log';
import * as workers from '../src/repositories/workers';
import { resetState } from '../src/store';

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Rajendra Nagar, where the demo customer lives. */
export const JOB_POINT: GeoPoint = { lat: 25.6013, lng: 85.1553 };

export interface TestServer {
  backend: Backend;
  url: string;
  sockets: ClientSocket[];
  close(): Promise<void>;
}

/** A fresh seeded state and a real HTTP + Socket.io server on a free port. */
export async function startServer(offerTimeoutMs = 2_000): Promise<TestServer> {
  resetState();
  const backend = createBackend({ offerTimeoutMs, log: quietLogger });
  await new Promise<void>((resolve) => backend.httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = backend.httpServer.address() as AddressInfo;
  const server: TestServer = {
    backend,
    url: `http://127.0.0.1:${port}`,
    sockets: [],
    async close() {
      for (const socket of server.sockets) socket.disconnect();
      await backend.close();
      await new Promise<void>((resolve) => backend.httpServer.close(() => resolve()));
    },
  };
  return server;
}

/**
 * @param prepare  listeners attached before the connection completes, as every real client
 *   does — the server can send something the moment it accepts the socket.
 */
export async function connectAs(server: TestServer, userId: string, role: 'WORKER' | 'CUSTOMER' | 'ADMIN', prepare?: (socket: ClientSocket) => void): Promise<ClientSocket> {
  const socket: ClientSocket = connect(server.url, { auth: { userId, role }, transports: ['websocket'], reconnection: false, forceNew: true });
  prepare?.(socket);
  server.sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', (error) => reject(error));
  });
  return socket;
}

/**
 * The electricians for a test: every other electrician is taken offline, and these `count`
 * come online over the socket, a few hundred metres apart around the job, exactly as the
 * worker app does it.
 */
export async function onlineElectricians(server: TestServer, count: number): Promise<Array<{ id: string; socket: ClientSocket }>> {
  const electricians = workers
    .list()
    .filter((worker) => worker.kycStatus === KycStatus.VERIFIED && worker.serviceCategoryIds.includes('cat_electricians'));
  for (const worker of electricians) {
    workers.setOnline(worker.id, false);
    workers.setOnJob(worker.id, false);
  }
  const chosen = electricians.slice(0, count);
  const connected = [];
  for (const [index, worker] of chosen.entries()) {
    const socket = await connectAs(server, worker.id, 'WORKER');
    const location = { lat: JOB_POINT.lat + 0.002 * (index + 1), lng: JOB_POINT.lng };
    socket.emit(ClientEvent.WORKER_ONLINE, { workerId: worker.id, serviceCategoryIds: worker.serviceCategoryIds, location });
    connected.push({ id: worker.id, socket });
  }
  /* Let the online events land before anything is dispatched. */
  await waitFor(() => chosen.every((worker) => workers.findById(worker.id)?.isOnline === true));
  return connected;
}

export async function createBooking(server: TestServer, customerId = 'usr_cust_demo'): Promise<CreateBookingResult> {
  const response = await fetch(`${server.url}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      customerId,
      serviceItemId: 'ceiling-fan-installation',
      address: { line1: 'Flat 3B, Shivam Apartment', line2: 'Road No. 4, Rajendra Nagar', city: 'Patna', state: 'Bihar', pincode: '800016', point: JOB_POINT },
    }),
  });
  if (response.status !== 201) throw new Error(`create booking: ${response.status} ${await response.text()}`);
  return (await response.json()) as CreateBookingResult;
}

export async function post(server: TestServer, path: string, body: unknown): Promise<{ status: number; body: { error?: string; message?: string } }> {
  const response = await fetch(`${server.url}/api/v1${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as { error?: string; message?: string } };
}

/** Resolves with the next `event` a socket receives. */
export function next<E extends keyof ServerToClientEvents>(socket: ClientSocket, event: E, timeoutMs = 5_000): Promise<Parameters<ServerToClientEvents[E]>[0]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    (socket as unknown as { once: (e: string, cb: (payload: unknown) => void) => void }).once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload as Parameters<ServerToClientEvents[E]>[0]);
    });
  });
}

export async function waitFor(condition: () => boolean, timeoutMs = 5_000): Promise<void> {
  const started = Date.now();
  while (!condition()) {
    if (Date.now() - started > timeoutMs) throw new Error('condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
