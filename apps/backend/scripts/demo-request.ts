/**
 * Books a job near a worker, the way the customer app will — for the live demo.
 *
 *   pnpm --filter @sahayo/backend demo:request
 *   pnpm --filter @sahayo/backend demo:request -- --near wrk_suresh --item ceiling-fan-installation
 *   pnpm --filter @sahayo/backend demo:request -- --scheduled +50m
 *   pnpm --filter @sahayo/backend demo:request -- --scheduled +1d@14:00
 *
 * `--scheduled` books ahead instead: `+50m` or `+3h` from now, or `+1d@14:00` for a
 * day and a clock time in Patna. From half an hour out it arrives in the worker's
 * Scheduled requests list rather than ringing; `+50m` is close enough that, once
 * accepted, the reminder banner shows straight away.
 *
 * It reads where the worker is right now (their phone reports it every five seconds
 * while online), books the job a few hundred metres away as the demo customer, and
 * prints what the server priced it at. The dispatch table appears in the backend's own
 * console; the offer appears on the worker's phone.
 */
import type { AdminWorker, ApiError, CreateBookingResult } from '@sahayo/shared';

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (key?.startsWith('--') && value) args.set(key.slice(2), value);
}

const base = (args.get('api') ?? process.env.API_URL ?? 'http://localhost:4000').replace(/\/+$/, '') + '/api/v1';
const near = args.get('near') ?? 'wrk_suresh';
const item = args.get('item') ?? 'ceiling-fan-installation';
const customer = args.get('customer') ?? 'usr_cust_demo';
const scheduled = args.get('scheduled');

/** `+50m`, `+3h`, or `+1d@14:00` (a clock time in India, n days from today) as an instant. */
function slotFrom(spec: string): string {
  const relative = /^\+(\d+)([mh])$/.exec(spec);
  if (relative) return new Date(Date.now() + Number(relative[1]) * (relative[2] === 'h' ? 3_600_000 : 60_000)).toISOString();
  const dayAt = /^\+(\d+)d@(\d{1,2}):(\d{2})$/.exec(spec);
  if (dayAt) {
    const IST_MS = 330 * 60_000;
    const today = new Date(Date.now() + IST_MS);
    const wall = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + Number(dayAt[1]), Number(dayAt[2]), Number(dayAt[3]));
    return new Date(wall - IST_MS).toISOString();
  }
  throw new Error(`--scheduled ${spec}: use +50m, +3h or +1d@14:00`);
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new Error(`Cannot reach the backend at ${base}. Start it with: pnpm dev:backend`);
  });
  const json = (await response.json()) as T | ApiError;
  if (!response.ok) throw new Error(`${response.status} ${(json as ApiError).error}: ${(json as ApiError).message}`);
  return json as T;
}

const rupees = (paise: number): string => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

async function main(): Promise<void> {
  const worker = await call<AdminWorker>('GET', `/workers/${near}`);
  if (!worker.isOnline) {
    console.log(`\n  ${worker.name} is offline. Open the worker app, sign in and switch to Online first — or the offer will go to others.\n`);
  }

  /* About 300 m north-east of the worker. */
  const point = { lat: Math.round((worker.location.lat + 0.002) * 1e5) / 1e5, lng: Math.round((worker.location.lng + 0.002) * 1e5) / 1e5 };
  const { record, fare } = await call<CreateBookingResult>('POST', '/bookings', {
    customerId: customer,
    serviceItemId: item,
    address: { line1: 'House 12, Lane 3', line2: 'Rajendra Nagar', city: 'Patna', state: 'Bihar', pincode: '800016', point },
    notes: 'Booked from the demo script.',
    ...(scheduled ? { scheduledFor: slotFrom(scheduled) } : {}),
  });

  console.log(`\n  ${record.reference} booked for ${record.customerName} near ${worker.name}`);
  console.log(`  status ${record.booking.status} · ${fare.base / 100} base × ${fare.multiplier} (urgency ${fare.factors.urgency}, ${fare.weather.toLowerCase()} ${fare.factors.weather}, demand ${fare.factors.demand})`);
  console.log(`  customer pays ${rupees(fare.total)} incl. GST · worker gets ${rupees(fare.workerShare)} · fund ${rupees(fare.coopFundShare)}`);
  if (record.booking.scheduledFor) {
    const when = new Date(record.booking.scheduledFor).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    console.log(`  booked ahead for ${when}`);
    console.log(`\n  It waits in the worker's Scheduled requests list, open until the slot.\n`);
  } else {
    console.log(`\n  Watch the backend console for the dispatch table, and the worker's phone for the offer.\n`);
  }
}

main().catch((error: unknown) => {
  console.error(`\n  ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
