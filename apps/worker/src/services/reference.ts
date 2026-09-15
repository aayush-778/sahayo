import type { AppLanguage } from '@sahayo/ui-native';

import { BIHAR_CITIES, type City } from '../data/cities';
import type { Gender } from '../types';

/**
 * Fixed option lists for the registration form, and the rules around them.
 */

/**
 * Four options, Female first.
 *
 * Most caregivers and domestic workers on this platform will be women, so the
 * likeliest answer is the first one. A two-option gender field on a
 * government-facing cooperative platform would also exclude people outright;
 * "Other" and "Prefer not to say" are separate because they mean different
 * things.
 */
export const GENDER_OPTIONS: readonly Gender[] = ['female', 'male', 'other', 'undisclosed'];

export function getCities(): City[] {
  return BIHAR_CITIES;
}

/** A stored city id in the current language. Falls back to the id itself. */
export function cityName(id: string, language: AppLanguage): string {
  return BIHAR_CITIES.find((city) => city.id === id)?.name[language] ?? id;
}

/** The minimum age to register as a partner. */
export const MIN_WORKER_AGE = 18;
/** The oldest birth year the date picker offers, relative to today. */
export const MAX_WORKER_AGE = 70;

/** Whole years between a `YYYY-MM-DD` birth date and `now`. */
export function ageOn(dob: string, now: Date = new Date()): number {
  const [year, month, day] = dob.split('-').map(Number);
  let age = now.getFullYear() - year;
  const hadBirthday = now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() >= day);
  if (!hadBirthday) age -= 1;
  return age;
}

export function isOldEnough(dob: string, now: Date = new Date()): boolean {
  return ageOn(dob, now) >= MIN_WORKER_AGE;
}
