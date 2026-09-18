/**
 * Puts the demo back to its starting position.
 *
 *   pnpm demo:reset
 *   pnpm demo:reset -- --api http://localhost:4000
 *
 * Re-seeds the backend's state, drops any dispatch in flight, and stands the demo's eight
 * members in their fixed places around the customer's address. Run it between runs — with
 * the phones' apps closed, because they hold bookings this throws away.
 */
import type { ApiError, GeoPoint } from '@sahayo/shared';

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (key?.startsWith('--') && value) args.set(key.slice(2), value);
}

const base = (args.get('api') ?? process.env.API_URL ?? 'http://localhost:4000').replace(/\/+$/, '') + '/api/v1';

interface ResetResult {
  fundBalance: number;
  workersOnline: Array<{ id: string; name: string; location: GeoPoint; distanceM: number }>;
  seeded: { workers: number; customers: number; bookings: number; ledgerRows: number; seededAt: string };
  at: string;
}

const rupees = (paise: number): string => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

async function main(): Promise<void> {
  const response = await fetch(`${base}/admin/demo/reset`, { method: 'POST' }).catch(() => {
    throw new Error(`Cannot reach the backend at ${base}. Start it first: pnpm dev:backend`);
  });
  const body = (await response.json()) as ResetResult | ApiError;
  if (!response.ok) throw new Error(`${response.status} ${(body as ApiError).error}: ${(body as ApiError).message}`);

  const result = body as ResetResult;
  console.log(`\n  Demo reset · ${new Date(result.at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  console.log(
    `  seeded ${result.seeded.workers} workers, ${result.seeded.bookings.toLocaleString('en-IN')} bookings, ` +
      `${result.seeded.ledgerRows.toLocaleString('en-IN')} ledger rows`,
  );
  console.log(`  cooperative fund back to ${rupees(result.fundBalance)}`);
  console.log(`\n  ${result.workersOnline.length} members online around Rajendra Nagar:`);
  for (const worker of result.workersOnline) {
    console.log(`    ${worker.name.padEnd(20)} ${(worker.distanceM / 1000).toFixed(2)} km  ${worker.location.lat}, ${worker.location.lng}`);
  }
  console.log(`\n  Open the apps now; the phones sign in against this state.\n`);
}

main().catch((error: unknown) => {
  console.error(`\n  ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
