import { networkInterfaces } from 'node:os';
import { createBackend } from './app';
import { env } from './config/env';
import { seedSummary } from './repositories/system';

const started = Date.now();
const backend = createBackend();
const seeded = seedSummary();

/** This machine's LAN addresses: what a phone on the same wifi puts in EXPO_PUBLIC_API_URL. */
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((net): net is NonNullable<typeof net> => Boolean(net && net.family === 'IPv4' && !net.internal))
  .map((net) => net.address);

backend.httpServer.listen(env.PORT, env.HOST, () => {
  console.log(`[backend] listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  for (const address of lanAddresses) console.log(`[backend] on the LAN at http://${address}:${env.PORT}${env.API_PREFIX}`);
  console.log(
    `[backend] seeded ${seeded.workers} workers, ${seeded.customers} customers, ${seeded.bookings.toLocaleString('en-IN')} bookings, ` +
      `${seeded.ledgerRows.toLocaleString('en-IN')} ledger rows in ${Date.now() - started} ms; SEED_NOW placed at boot`,
  );
  console.log(`[backend] cors origins: ${env.corsOrigins.join(', ')}`);
});

/*
 * A promise nobody caught, or a throw off the stack, must not take the server down in the
 * middle of a demo: one line in the console, and it keeps serving. The alternative — Node's
 * default — is a dead backend and three apps falling back to demo data on stage.
 */
process.on('unhandledRejection', (reason) => {
  console.error(`[backend] unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
});
process.on('uncaughtException', (error) => {
  console.error(`[backend] uncaught exception: ${error.message}`);
});

const shutdown = (): void => {
  void backend.close().then(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
