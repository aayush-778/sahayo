import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import {
  ClientEvent,
  ServerEvent,
  gigAcceptPayloadSchema,
  gigDeclinePayloadSchema,
  workerLocationPayloadSchema,
  workerOfflinePayloadSchema,
  workerOnlinePayloadSchema,
  type SocketData,
} from '@sahayo/shared';
import { buildTeam } from '@sahayo/shared/seed/settings';
import type { ZodType } from 'zod';
import { env } from '../config/env';
import { OPEN_STATUSES } from '../domain/booking-machine';
import type { Dispatcher } from '../dispatch/dispatcher';
import type { DispatchLogger } from '../dispatch/log';
import * as bookings from '../repositories/bookings';
import * as users from '../repositories/users';
import * as workers from '../repositories/workers';
import { attach, emitToAdmins, markConnected, markDisconnected, rooms, type SahayoSocketServer } from './realtime';

export type { SahayoSocketServer } from './realtime';

const ADMIN_IDS = new Set(buildTeam().map((member) => member.id));
const IN_HAND_STATUSES = new Set<string>(['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS']);

/**
 * The typed Socket.io gateway.
 *
 * Handshake: `auth: { userId, role }`. A connection without both, or naming a user the
 * server does not know in that role, is refused before any handler runs. This is demo
 * trust — the server believes the id it is given — not authentication.
 *
 * Presence: which socket each worker is on, cleaned up on disconnect.
 * Rooms: `user:<id>` for each person, `booking:<id>` for each booking's customer and
 * worker, and `admin` for everything.
 */
export function createSocketGateway(httpServer: HttpServer, dispatcher: Dispatcher, log: DispatchLogger): SahayoSocketServer {
  const io: SahayoSocketServer = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });
  attach(io);

  io.use((socket, next) => {
    const auth = (socket.handshake.auth ?? {}) as { userId?: unknown; role?: unknown };
    const userId = typeof auth.userId === 'string' ? auth.userId : '';
    const role = auth.role;
    if (!userId || (role !== 'WORKER' && role !== 'CUSTOMER' && role !== 'ADMIN')) {
      next(new Error('HANDSHAKE_REJECTED: send auth { userId, role } with role WORKER, CUSTOMER or ADMIN'));
      return;
    }

    const data: SocketData = { userId, role };
    if (role === 'WORKER') {
      const workerId = workers.findById(userId) ? userId : users.workerIdForUser(userId);
      if (!workerId) return next(new Error(`HANDSHAKE_REJECTED: no worker ${userId}`));
      data.workerId = workerId;
      data.userId = workerId;
    } else if (role === 'CUSTOMER' && !users.findCustomer(userId)) {
      return next(new Error(`HANDSHAKE_REJECTED: no customer ${userId}`));
    } else if (role === 'ADMIN' && !ADMIN_IDS.has(userId)) {
      return next(new Error(`HANDSHAKE_REJECTED: no administrator ${userId}`));
    }
    socket.data = data;
    next();
  });

  io.on('connection', (socket) => {
    const { userId, role, workerId } = socket.data as Required<Pick<SocketData, 'userId' | 'role'>> & SocketData;
    void socket.join(rooms.user(userId));
    if (role === 'ADMIN') void socket.join(rooms.admin);

    /* Back into the rooms of every booking still in motion, so a reconnect misses nothing from here on. */
    const open = role === 'WORKER' ? bookings.listForWorker(userId) : role === 'CUSTOMER' ? bookings.listForCustomer(userId) : [];
    for (const booking of open) if (OPEN_STATUSES.has(booking.status)) void socket.join(rooms.booking(booking.id));

    if (workerId) {
      markConnected(workerId, socket.id);
      log.line('note', `${workers.findById(workerId)?.name ?? workerId} connected (worker app)`);
      /* Booked-ahead requests made while this app was closed. */
      const resent = dispatcher.resendOpenOffers(workerId);
      if (resent > 0) log.line('note', `${resent} open scheduled request${resent === 1 ? '' : 's'} sent to ${workers.findById(workerId)?.name ?? workerId}`);
    }

    /** Parses a payload with its shared schema, and checks a worker only speaks for themselves. */
    const accept = <T extends { workerId: string }>(schema: ZodType<T>, payload: unknown): T | undefined => {
      const parsed = schema.safeParse(payload);
      if (!parsed.success || parsed.data.workerId !== workerId) return undefined;
      return parsed.data;
    };

    socket.on(ClientEvent.WORKER_ONLINE, (payload) => {
      const data = accept(workerOnlinePayloadSchema, payload);
      if (!data) return;
      const worker = workers.setOnline(data.workerId, true, data.location);
      log.line('note', `${worker.name} is online and taking work`);
      emitToAdmins(ServerEvent.WORKER_MOVED, { workerId: worker.id, location: worker.location, at: new Date().toISOString() });
    });

    socket.on(ClientEvent.WORKER_OFFLINE, (payload) => {
      const data = accept(workerOfflinePayloadSchema, payload);
      if (!data) return;
      const worker = workers.setOnline(data.workerId, false);
      log.line('note', `${worker.name} went offline`);
    });

    socket.on(ClientEvent.WORKER_LOCATION, (payload) => {
      const data = accept(workerLocationPayloadSchema, payload);
      if (!data) return;
      workers.setLocation(data.workerId, data.location);
      /* The job in hand, not any booking that can still be disputed: a finished job's customer is not tracking anyone. */
      const active = bookings.listForWorker(data.workerId).find((booking) => IN_HAND_STATUSES.has(booking.status));
      const moved = { workerId: data.workerId, location: data.location, at: data.at, ...(data.heading !== undefined ? { heading: data.heading } : {}), ...(active ? { bookingId: active.id } : {}) };
      emitToAdmins(ServerEvent.WORKER_MOVED, moved);
      if (active) io.to(rooms.booking(active.id)).emit(ServerEvent.WORKER_MOVED, moved);
    });

    socket.on(ClientEvent.GIG_ACCEPT, (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => undefined;
      const data = accept(gigAcceptPayloadSchema, payload);
      if (!data) return reply({ ok: false, reason: 'UNKNOWN_OFFER' });
      reply(dispatcher.accept(data));
    });

    socket.on(ClientEvent.GIG_DECLINE, (payload) => {
      const data = accept(gigDeclinePayloadSchema, payload);
      if (data) dispatcher.decline(data);
    });

    socket.on('disconnect', (reason) => {
      const gone = markDisconnected(socket.id);
      if (!gone) return;
      const worker = workers.setOnline(gone, false);
      log.line('note', `${worker.name} disconnected (${reason}) · marked offline until the app reconnects`);
    });
  });

  return io;
}
