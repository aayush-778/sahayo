import { createRng } from '@/lib/seed/rng';

/**
 * The artificial delay every service call awaits.
 *
 * It exists so loading states are real. A prototype that answers in zero
 * milliseconds never shows its skeletons, which means nobody notices they are
 * missing until the backend is wired up and every card flashes empty on stage.
 * 120–300ms is long enough to see and short enough to stay under the demo's
 * 200ms-per-transition feel.
 *
 * The delay is drawn from its own seeded stream rather than Math.random(), so a
 * rehearsal and the real run behave the same way. It is the one place in the app
 * where a timer is deliberate rather than incidental.
 */
const MIN_MS = 120;
const MAX_MS = 300;

const rng = createRng(0x5a4a_1000);

export function serviceDelayMs(): number {
  return rng.int(MIN_MS, MAX_MS);
}

/**
 * Awaits one service round trip.
 *
 * Every function in `src/lib/services` awaits this before returning, including
 * the mutating ones — an approval that lands instantly while its neighbours take
 * 200ms looks like a bug, and the button's pending state needs somewhere to live.
 */
export function settle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, serviceDelayMs());
  });
}

/**
 * Resolves `value` after one round trip.
 *
 * The value is computed by the caller BEFORE the delay, so a service reads a
 * consistent snapshot of the store rather than whatever it looks like 300ms
 * later. That matters when two calls are in flight and one of them writes.
 */
export async function respond<T>(value: T): Promise<T> {
  await settle();
  return value;
}
