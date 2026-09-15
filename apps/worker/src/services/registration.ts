import type { DocumentMimeType } from '../types';

/**
 * The fixed choices and limits of onboarding steps 2–4.
 *
 * Numbers and machine values only. Every label is resolved from the i18n
 * catalogue at the render edge, so these lists read the same in both languages.
 */

// --- Step 2: service details -------------------------------------------------

/** 0 means "less than a year"; the last value means "this many or more". */
export const MAX_EXPERIENCE_YEARS = 30;
export const EXPERIENCE_OPTIONS: readonly number[] = Array.from({ length: MAX_EXPERIENCE_YEARS + 1 }, (_, i) => i);

export const SERVICE_RADIUS_MIN_KM = 2;
export const SERVICE_RADIUS_MAX_KM = 25;

export function clampRadius(km: number): number {
  return Math.min(SERVICE_RADIUS_MAX_KM, Math.max(SERVICE_RADIUS_MIN_KM, Math.round(km)));
}

// --- Step 3: documents -------------------------------------------------------

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES: readonly DocumentMimeType[] = ['image/png', 'image/jpeg', 'application/pdf'];

/** `1.4 MB`, and `5 MB` for a whole number. Latin digits in both languages, as for money. */
export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

// --- Step 4: availability & rates -------------------------------------------

/** Every half hour from 05:00 to 23:00 — the day a trade worker actually works. */
export const TIME_OPTIONS: readonly string[] = Array.from({ length: 37 }, (_, i) => {
  const minutes = 5 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

/** `HH:MM` to minutes after midnight, or NaN when malformed. */
export function minutesOf(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
}

export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * A 24-hour time split for display on a 12-hour clock.
 *
 * The period is by time of day rather than AM/PM because Hindi speakers say
 * "सुबह 8 बजे" and "शाम 6 बजे", not AM and PM; English maps the four periods
 * back onto AM/PM in its catalogue.
 */
export function clockParts(time: string): { hour: number; minute: string; period: DayPeriod } {
  const total = minutesOf(time);
  const hour24 = Math.floor(total / 60);
  const period: DayPeriod = hour24 < 12 ? 'morning' : hour24 < 16 ? 'afternoon' : hour24 < 19 ? 'evening' : 'night';
  return { hour: hour24 % 12 || 12, minute: String(total % 60).padStart(2, '0'), period };
}

/** Whole rupees. Converted to paise at the service boundary, never stored as rupees. */
export const BASE_RATE_MIN_RUPEES = 50;
export const BASE_RATE_MAX_RUPEES = 10_000;
export const BASE_RATE_STEP_RUPEES = 50;
