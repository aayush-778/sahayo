import type { Server } from 'socket.io';
import {
  ServerEvent,
  type ClientToServerEvents,
  type Id,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from '@sahayo/shared';
import { toBooking } from '../repositories/bookings';
import { publicSummary } from '../repositories/workers';
import type { StoredBooking } from '../store';

/**
 * The server's side of the socket contract: who is connected, which rooms exist, and
 * every server-to-client emit. Routes and the dispatcher emit through these functions,
 * so no event name is ever written as a string outside @sahayo/shared's types.
 */

export type SahayoSocketServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let io: SahayoSocketServer | undefined;

export function attach(server: SahayoSocketServer): void {
  io = server;
}

export function detach(): void {
  io = undefined;
  socketByWorker.clear();
  workerBySocket.clear();
}

/** Rooms. A booking's room holds its customer and worker; `admin` receives everything. */
export const rooms = {
  user: (userId: Id): string => `user:${userId}`,
  booking: (bookingId: Id): string => `booking:${bookingId}`,
  admin: 'admin',
} as const;

/* --- presence: worker ↔ socket ---------------------------------------- */

const socketByWorker = new Map<Id, string>();
const workerBySocket = new Map<string, Id>();

/** Records that `workerId` is connected on `socketId`. A newer connection replaces an older one. */
export function markConnected(workerId: Id, socketId: string): void {
  const previous = socketByWorker.get(workerId);
  if (previous) workerBySocket.delete(previous);
  socketByWorker.set(workerId, socketId);
  workerBySocket.set(socketId, workerId);
}

/** Forgets a socket. Returns the worker it belonged to, if that worker has no newer connection. */
export function markDisconnected(socketId: string): Id | undefined {
  const workerId = workerBySocket.get(socketId);
  if (!workerId) return undefined;
  workerBySocket.delete(socketId);
  if (socketByWorker.get(workerId) === socketId) {
    socketByWorker.delete(workerId);
    return workerId;
  }
  return undefined;
}

export function isConnected(workerId: Id): boolean {
  return socketByWorker.has(workerId);
}

export function connectedWorkerCount(): number {
  return socketByWorker.size;
}

/* --- emits ---------------------------------------------------------------- */

type Args<E extends keyof ServerToClientEvents> = Parameters<ServerToClientEvents[E]>;

/** Sends one event to one worker's app. Returns false when that worker has no app connected. */
export function emitToWorker<E extends keyof ServerToClientEvents>(workerId: Id, event: E, ...args: Args<E>): boolean {
  const socketId = socketByWorker.get(workerId);
  if (!io || !socketId) return false;
  io.to(socketId).emit(event, ...args);
  return true;
}

/** Puts everyone signed in as these users into a booking's room. */
export function joinBookingRoom(userIds: Id[], bookingId: Id): void {
  if (!io) return;
  for (const userId of userIds) io.in(rooms.user(userId)).socketsJoin(rooms.booking(bookingId));
}

/** The booking's customer, worker and every admin all receive the same update, from one emit. */
export function emitBookingUpdated(stored: StoredBooking): void {
  if (!io) return;
  const booking = toBooking(stored);
  const worker = stored.workerId ? publicSummary(stored.workerId) : undefined;
  io.to(rooms.booking(stored.id))
    .to(rooms.admin)
    .emit(ServerEvent.BOOKING_UPDATED, { bookingId: stored.id, status: stored.status, booking, ...(worker ? { worker } : {}) });
}

export function emitToAdmins<E extends keyof ServerToClientEvents>(event: E, ...args: Args<E>): void {
  io?.to(rooms.admin).emit(event, ...args);
}

export function emitToBookingRoom<E extends keyof ServerToClientEvents>(bookingId: Id, event: E, ...args: Args<E>): void {
  io?.to(rooms.booking(bookingId)).emit(event, ...args);
}
