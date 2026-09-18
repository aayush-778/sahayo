import { createServer, type Server as HttpServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { Dispatcher } from './dispatch/dispatcher';
import { createPrettyLogger, quietLogger, type DispatchLogger } from './dispatch/log';
import { errorHandler } from './lib/http';
import { createApiRouter } from './routes/index';
import { createSocketGateway, type SahayoSocketServer } from './sockets/gateway';
import { detach } from './sockets/realtime';
import { seedSummary } from './repositories/system';

export interface Backend {
  httpServer: HttpServer;
  io: SahayoSocketServer;
  dispatcher: Dispatcher;
  /** Stops accepting connections, clears every dispatch timer, and resolves when closed. */
  close(): Promise<void>;
}

export interface BackendOptions {
  /** Shorter offer windows for tests. */
  offerTimeoutMs?: number;
  log?: DispatchLogger;
}

/** Builds the HTTP server, the Socket.io gateway and the dispatcher, without listening. */
export function createBackend(options: BackendOptions = {}): Backend {
  /* Seed now, at boot, rather than on the first request. */
  seedSummary();

  const log = options.log ?? (env.DISPATCH_LOG === 'quiet' ? quietLogger : createPrettyLogger());
  const dispatcher = new Dispatcher({ log, offerTimeoutMs: options.offerTimeoutMs });

  const app = express();
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json());
  app.use(env.API_PREFIX, createApiRouter({ dispatcher }));
  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'No such route. The API lives under /api/v1.' });
  });
  app.use(errorHandler);

  const httpServer = createServer(app);
  const io = createSocketGateway(httpServer, dispatcher, log);

  return {
    httpServer,
    io,
    dispatcher,
    close: () =>
      new Promise((resolve) => {
        dispatcher.shutdown();
        void io.close(() => {
          detach();
          resolve();
        });
      }),
  };
}
