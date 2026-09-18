/**
 * Walks a worker along a fixed route, so live tracking can be shown without anyone
 * leaving the room.
 *
 *   pnpm demo:walk
 *   pnpm demo:walk -- --worker wrk_suresh --speed 18
 *
 * It connects as that worker's phone would and reports positions along a hand-written
 * polyline through Rajendra Nagar, ending at the customer's door. Same path, same speed,
 * same interval on every run: nothing here reads a clock to decide what to do, only when
 * to do it. Stop it with Ctrl+C, which leaves the worker where they stood.
 *
 * It does not accept the job or move the booking on — the worker's phone does that. This
 * only supplies the movement the customer's map and the admin's dispatch map draw.
 */
import { io, type Socket } from 'socket.io-client';
import { ClientEvent, type ClientToServerEvents, type GeoPoint, type ServerToClientEvents } from '@sahayo/shared';
import { castPlaces } from '@sahayo/shared/seed/cast';

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (key?.startsWith('--') && value) args.set(key.slice(2), value);
}

const base = (args.get('api') ?? process.env.API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
const workerId = args.get('worker') ?? 'wrk_suresh';
/** Kilometres per hour. A bike through Patna's lanes, not a car on the bypass. */
const speedKmh = Number(args.get('speed') ?? 18);
/** One report every five seconds, exactly as the worker app sends them. */
const STEP_MS = 5_000;
const loop = args.has('loop');

/**
 * The route: five hand-picked corners from the eastern end of Rajendra Nagar down to the
 * customer's block. Written out rather than generated, so the line drawn on the map is
 * the same line every time.
 */
const ROUTE: GeoPoint[] = [
  { lat: 25.6075, lng: 85.1698 },
  { lat: 25.6054, lng: 85.1671 },
  { lat: 25.6031, lng: 85.1649 },
  { lat: 25.6014, lng: 85.1622 },
  { lat: 25.6004, lng: 85.161 },
  castPlaces.rajendraNagar.point,
];

const METRES_PER_DEGREE_LAT = 111_320;
const metresBetween = (a: GeoPoint, b: GeoPoint): number => {
  const north = (b.lat - a.lat) * METRES_PER_DEGREE_LAT;
  const east = (b.lng - a.lng) * METRES_PER_DEGREE_LAT * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(north, east);
};

/** Every position along the route, one per step, at the given speed. */
function trail(): GeoPoint[] {
  const perStep = (speedKmh * 1000 * (STEP_MS / 1000)) / 3600;
  const points: GeoPoint[] = [ROUTE[0]!];
  for (let leg = 1; leg < ROUTE.length; leg += 1) {
    const from = ROUTE[leg - 1]!;
    const to = ROUTE[leg]!;
    const steps = Math.max(1, Math.round(metresBetween(from, to) / perStep));
    for (let step = 1; step <= steps; step += 1) {
      points.push({
        lat: Math.round((from.lat + ((to.lat - from.lat) * step) / steps) * 1e6) / 1e6,
        lng: Math.round((from.lng + ((to.lng - from.lng) * step) / steps) * 1e6) / 1e6,
      });
    }
  }
  return points;
}

async function main(): Promise<void> {
  const points = trail();
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(base, {
    auth: { userId: workerId, role: 'WORKER' },
    transports: ['websocket'],
    reconnection: true,
  });

  socket.on('connect_error', (error) => {
    console.error(`\n  Cannot connect to ${base}: ${error.message}\n  Is the backend running, and is ${workerId} a worker it knows?\n`);
    process.exit(1);
  });

  await new Promise<void>((resolve) => socket.once('connect', () => resolve()));
  const total = ((points.length - 1) * STEP_MS) / 1000;
  console.log(`\n  ${workerId} walking ${points.length} points at ${speedKmh} km/h · about ${Math.round(total)} s to the door${loop ? ' · looping' : ''}`);
  console.log("  Watch the customer's tracker and the admin's Live Dispatch map.\n");

  let index = 0;
  const timer = setInterval(() => {
    const point = points[index]!;
    socket.emit(ClientEvent.WORKER_LOCATION, { workerId, location: point, at: new Date().toISOString() });
    const left = points.length - 1 - index;
    process.stdout.write(`\r  ${String(index + 1).padStart(3)}/${points.length}  ${point.lat}, ${point.lng}  ${left === 0 ? 'at the door ' : `${left} steps to go `}`);
    index += 1;
    if (index >= points.length) {
      if (loop) {
        index = 0;
        return;
      }
      clearInterval(timer);
      console.log('\n\n  Arrived. Leaving the worker at the address.\n');
      socket.disconnect();
      process.exit(0);
    }
  }, STEP_MS);

  process.on('SIGINT', () => {
    clearInterval(timer);
    console.log('\n\n  Stopped.\n');
    socket.disconnect();
    process.exit(0);
  });
}

main().catch((error: unknown) => {
  console.error(`\n  ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
