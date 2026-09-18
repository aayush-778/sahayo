/**
 * Instants relative to a clock, for the demo cast's hand-written records.
 *
 * The same records are read in two places that need different "nows". The mobile
 * apps show them against the device clock, because a job offer from last Tuesday is
 * not an offer and a demo is given on a day nobody can predict. The canonical seed
 * places them against SEED_NOW in India Standard Time, because the dataset must come
 * out byte-identical on every machine. Writing the records once against this
 * interface is what lets both read one copy.
 */
export interface CastClock {
  minutesAgo(minutes: number): string;
  minutesFromNow(minutes: number): string;
  /** A day in the past at a local wall-clock time, never later than now. */
  daysAgo(days: number, hour?: number, minute?: number): string;
  daysFromNow(days: number, hour?: number, minute?: number): string;
  /**
   * A given day of the month `monthsAgo` before this one, clamped to the month's
   * length — and for the current month to today, so it is never in the future.
   */
  dayOfMonthsAgo(monthsAgo: number, day: number, hour?: number): string;
}

const MINUTE = 60_000;

/**
 * Wall-clock arithmetic in one timezone. `wall` turns an instant into a Date whose
 * UTC fields read as that timezone's local fields, and `instant` turns it back.
 */
interface WallClock {
  now(): number;
  wall(at: number): Date;
  instant(wall: Date): number;
}

function build({ now, wall, instant }: WallClock): CastClock {
  const clampToPast = (at: number): string => new Date(at > now() ? now() - 60 * MINUTE : at).toISOString();
  const atDay = (days: number, hour: number, minute: number): number => {
    const day = wall(now());
    day.setUTCDate(day.getUTCDate() + days);
    day.setUTCHours(hour, minute, 0, 0);
    return instant(day);
  };

  return {
    minutesAgo: (minutes) => new Date(now() - minutes * MINUTE).toISOString(),
    minutesFromNow: (minutes) => new Date(now() + minutes * MINUTE).toISOString(),
    daysAgo: (days, hour = 10, minute = 0) => clampToPast(atDay(-days, hour, minute)),
    daysFromNow: (days, hour = 10, minute = 0) => new Date(atDay(days, hour, minute)).toISOString(),
    dayOfMonthsAgo(monthsAgo, day, hour = 11) {
      const today = wall(now());
      const at = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsAgo, 1, hour, 0, 0, 0));
      const lastDay = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0)).getUTCDate();
      const cap = monthsAgo === 0 ? Math.min(lastDay, today.getUTCDate()) : lastDay;
      at.setUTCDate(Math.max(1, Math.min(day, cap)));
      return clampToPast(instant(at));
    },
  };
}

/**
 * A live clock in the device's timezone. What the mobile apps show their mocks against.
 *
 * `now` is passed in — the apps pass `Date.now` — because nothing under the seed
 * directory may read the wall clock, this module included.
 */
export function createDeviceClock(now: () => number): CastClock {
  const offset = (at: number): number => -new Date(at).getTimezoneOffset() * MINUTE;
  return build({
    now,
    wall: (at) => new Date(at + offset(at)),
    instant: (wall) => {
      const guess = wall.getTime() - offset(wall.getTime());
      return wall.getTime() - offset(guess);
    },
  });
}

/** India Standard Time: UTC+05:30 all year, with no daylight saving. */
const IST_OFFSET_MS = 330 * MINUTE;

/** A fixed instant, read in India Standard Time. What the canonical seed places the cast against. */
export function createAnchoredClock(anchor: Date): CastClock {
  return build({
    now: () => anchor.getTime(),
    wall: (at) => new Date(at + IST_OFFSET_MS),
    instant: (wall) => wall.getTime() - IST_OFFSET_MS,
  });
}
