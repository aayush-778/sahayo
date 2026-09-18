import { resetState, state } from '../store';

/** Where the seed was placed in time: subtract `shiftMs` from a server time to read it on the seed's clock. */
export function clock(): { shiftMs: number; seededAt: string } {
  return { shiftMs: state().shiftMs, seededAt: state().seededAt };
}

/**
 * Throws the state away and seeds it again, with SEED_NOW placed at this instant. What
 * `pnpm demo:reset` calls between runs of the demo, and what the tests call between cases.
 */
export function reseed(): void {
  resetState();
}

/** Seeds the state now, if it has not been, and says what it holds. For boot. */
export function seedSummary(): { workers: number; customers: number; bookings: number; ledgerRows: number; seededAt: string } {
  const current = state();
  return {
    workers: current.workers.size,
    customers: current.customers.size,
    bookings: current.bookings.size,
    ledgerRows: current.ledgerEntries.length,
    seededAt: current.seededAt,
  };
}
