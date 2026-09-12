/**
 * The deterministic random source every seed file draws from.
 *
 * Determinism is a demo requirement, not a nicety: the figures on stage must be
 * the same on every reload and on every machine, so a rehearsed line like "the
 * fund is at ₹8,40,000" does not become wrong between the rehearsal and the
 * room. Nothing in the seed may call Math.random(), Date.now(), or crypto.
 *
 * Each collection takes its own stream from its own fixed seed. That isolation
 * matters: with one shared stream, adding a worker would shift every booking,
 * ledger entry and dispute downstream of it, and a one-line seed change would
 * silently rewrite the whole dataset.
 */

/**
 * mulberry32 — a small, fast, well-distributed 32-bit generator.
 *
 * Chosen over a hand-rolled linear congruential generator because the low bits
 * of an LCG are notoriously weakly random, and several seed fields (`isOnline`,
 * the ~15% of under-allocated workers) are derived from exactly those bits.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seeded stream plus the drawing helpers the seed files actually want. */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  /** A float rounded to `places` decimals, for ratings and indices. */
  round(min: number, max: number, places: number): number;
  /** True with probability `p`. */
  chance(p: number): boolean;
  /** One item, uniformly. */
  pick<T>(items: readonly T[]): T;
  /** One item, with weights positionally matching `items`. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T;
  /** A new array, Fisher-Yates shuffled. Does not mutate the input. */
  shuffle<T>(items: readonly T[]): T[];
  /** `count` distinct items, or all of them if `count` exceeds the length. */
  sample<T>(items: readonly T[], count: number): T[];
  /** A v4-shaped UUID drawn from this stream, so ids are stable across runs. */
  uuid(): string;
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);

  function int(min: number, max: number): number {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function float(min: number, max: number): number {
    return next() * (max - min) + min;
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      const held = copy[i];
      copy[i] = copy[j];
      copy[j] = held;
    }
    return copy;
  }

  return {
    next,
    int,
    float,

    round(min, max, places) {
      const factor = 10 ** places;
      return Math.round(float(min, max) * factor) / factor;
    },

    chance(p) {
      return next() < p;
    },

    pick(items) {
      if (items.length === 0) throw new Error('pick() needs a non-empty array');
      return items[int(0, items.length - 1)];
    },

    weighted(items, weights) {
      if (items.length !== weights.length) {
        throw new Error('weighted() needs one weight per item');
      }
      const total = weights.reduce((sum, w) => sum + w, 0);
      let threshold = next() * total;
      for (let i = 0; i < items.length; i += 1) {
        threshold -= weights[i];
        if (threshold <= 0) return items[i];
      }
      return items[items.length - 1];
    },

    shuffle,

    sample(items, count) {
      return shuffle(items).slice(0, Math.min(count, items.length));
    },

    uuid() {
      /*
       * Shaped like a v4 UUID and drawn from this stream, so it is stable across
       * runs. It is NOT cryptographically random and must never be used as a
       * secret or a token — these are display ids for prototype data only.
       */
      const hex = '0123456789abcdef';
      let out = '';
      for (let i = 0; i < 36; i += 1) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
          out += '-';
        } else if (i === 14) {
          out += '4';
        } else if (i === 19) {
          out += hex[(int(0, 15) & 0x3) | 0x8];
        } else {
          out += hex[int(0, 15)];
        }
      }
      return out;
    },
  };
}

/**
 * The fixed seeds. One per collection, and they must never be reordered or
 * reused — a collection's seed is the identity of its data.
 */
export const SEEDS = {
  zones: 0x5a4a_0001,
  workers: 0x5a4a_0002,
  bookings: 0x5a4a_0003,
  ledger: 0x5a4a_0004,
  disputes: 0x5a4a_0005,
  proposals: 0x5a4a_0006,
  loans: 0x5a4a_0007,
  kyc: 0x5a4a_0008,
} as const;

/*
 * The time anchor lives in src/lib/dates.ts, not here, because the UI needs it to
 * render relative times against the same instant and the UI is barred from
 * importing the seed. Re-exported so seed modules can keep importing it from the
 * place they already do.
 */
export { DAY_MS, SEED_NOW, isoAgo } from '@/lib/dates';
