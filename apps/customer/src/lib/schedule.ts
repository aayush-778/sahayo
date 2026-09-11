/**
 * The bookable calendar: seven days, six slots a day.
 *
 * NOTHING HERE USES `Intl`. Weekday names, month names and the AM/PM or
 * सुबह/दोपहर wording all come from the i18next catalogue, keyed by the plain
 * numbers this module returns. That is the same call made for `formatPaise`'s
 * Indian digit grouping and for the notification timestamps: Hermes builds
 * ship a variable amount of ICU data, and a silently-English weekday in the
 * Hindi UI is exactly the kind of bug nobody notices until a judge does.
 *
 * Everything is computed from the device clock at render time, so the demo is
 * never showing last week.
 */

/** Slot start hours, on the hour, in 24-hour local time. */
export const SLOT_HOURS = [9, 11, 13, 15, 17, 19] as const;

/** How many days ahead the strip offers, today included. */
export const SCHEDULE_DAYS = 7;

export interface ScheduleSlot {
  /** Start hour, 24-hour. Doubles as the slot's identity within a day. */
  hour: number;
  /** Mocked as taken by another booking. Rendered, but not selectable. */
  unavailable: boolean;
}

export interface ScheduleDay {
  /** `YYYY-MM-DD` in local time. The selection key. */
  key: string;
  date: Date;
  /** 0 = Sunday, matching `Date.getDay()` and the catalogue's array order. */
  weekday: number;
  /** Day of the month, as displayed. */
  dayOfMonth: number;
  /** 0 = January, matching `Date.getMonth()`. */
  month: number;
  year: number;
  isToday: boolean;
  slots: ScheduleSlot[];
}

/** Local-time `YYYY-MM-DD`. Deliberately not `toISOString`, which is UTC and
 *  would roll the date over after 05:30 IST. */
function localKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * A stable 32-bit hash of the date key.
 *
 * The "unavailable" slots are mocked, but they must not be *random* — a fresh
 * `Math.random()` on every render would reshuffle which slots are greyed out
 * as the customer taps around, which looks broken rather than busy. Seeding
 * from the date means a given day always has the same two gaps, for as long
 * as that day exists.
 */
function hashKey(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** One or two slot hours mocked as already taken, fixed per day. */
function unavailableHours(key: string, candidates: readonly number[]): Set<number> {
  const taken = new Set<number>();
  if (candidates.length <= 1) return taken;

  const hash = hashKey(key);
  const count = 1 + (hash % 2);

  for (let i = 0; i < count; i += 1) {
    // Never take the last remaining slot: a day with nothing bookable is a
    // dead end the customer cannot act on.
    if (taken.size >= candidates.length - 1) break;
    const index = (hash >>> (i * 5 + 3)) % candidates.length;
    taken.add(candidates[index]);
  }

  return taken;
}

/**
 * The next seven days, with their slots.
 *
 * Today's slots that have already started are dropped entirely rather than
 * disabled — a greyed 09:00 at four in the afternoon is noise, not
 * information. That can leave today with fewer slots than the days after it,
 * and occasionally with none at all, which `firstBookableDay` handles.
 */
export function buildSchedule(now: Date = new Date()): ScheduleDay[] {
  const days: ScheduleDay[] = [];
  const todayKey = localKey(now);

  for (let offset = 0; offset < SCHEDULE_DAYS; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const key = localKey(date);
    const isToday = key === todayKey;

    const hours = isToday
      ? SLOT_HOURS.filter((hour) => hour > now.getHours() || (hour === now.getHours() && now.getMinutes() === 0))
      : [...SLOT_HOURS];

    const taken = unavailableHours(key, hours);

    days.push({
      key,
      date,
      weekday: date.getDay(),
      dayOfMonth: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      isToday,
      slots: hours.map((hour) => ({ hour, unavailable: taken.has(hour) })),
    });
  }

  return days;
}

/** The first day with something the customer can actually pick. */
export function firstBookableDay(days: ScheduleDay[]): ScheduleDay | undefined {
  return days.find((day) => day.slots.some((slot) => !slot.unavailable));
}

/** The first selectable slot on a day, for auto-selection. */
export function firstBookableHour(day: ScheduleDay): number | undefined {
  return day.slots.find((slot) => !slot.unavailable)?.hour;
}

/**
 * Which part of the day an hour falls in, as a catalogue key.
 *
 * Hindi says the period first — सुबह 9:00, दोपहर 1:00, शाम 7:00 — where
 * English says it after, as AM or PM. Both are built from this one boundary
 * table, so the two languages cannot disagree about when the afternoon ends.
 */
export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export function periodOf(hour: number): DayPeriod {
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour < 16) return 'afternoon';
  if (hour < 20) return 'evening';
  return 'night';
}

/** 24-hour clock to a 12-hour number: 13 -> 1, 0 -> 12. */
export function twelveHour(hour: number): number {
  const value = hour % 12;
  return value === 0 ? 12 : value;
}

/** The chosen slot as an ISO instant, for `Booking.scheduledFor`. */
export function slotToIso(day: ScheduleDay, hour: number): string {
  const at = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), hour, 0, 0, 0);
  return at.toISOString();
}
