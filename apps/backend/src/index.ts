import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { apiRouter } from './routes/index';
import { createSocketGateway } from './sockets/gateway';

const app = express();

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json());

app.use(env.API_PREFIX, apiRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'NOT_FOUND' });
});

const httpServer = createServer(app);
createSocketGateway(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`[backend] listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  console.log(`[backend] cors origins: ${env.corsOrigins.join(', ')}`);
});
