import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@sahayo/shared';
import { env } from '../config/env';

/**
 * The typed Socket.io server. Parameterising the generics with the shared
 * contract means Phase 2's handlers cannot emit an event or payload the
 * clients do not know about.
 */
export type SahayoSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Phase 1: connection lifecycle only. No gig dispatch, no rooms, no handlers
 * for the domain events — those arrive with the dispatch phase.
 */
export function createSocketGateway(httpServer: HttpServer): SahayoSocketServer {
  const io: SahayoSocketServer = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}
