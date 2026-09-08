import type { FontScript } from '../tokens';

/** The two locales Sahayo ships. There is no fallback chain beyond `en`. */
export type AppLocale = 'en' | 'hi';

/** Which script a locale is written in — drives font family selection. */
export const SCRIPT_FOR_LOCALE: Record<AppLocale, FontScript> = {
  en: 'latin',
  hi: 'devanagari',
};

const RUPEE = '\u20B9';

/**
 * Indian digit grouping: the last three digits, then pairs.
 *   1299     -> 1,299
 *   149900   -> 1,49,900
 *   12345678 -> 1,23,45,678
 *
 * Hand-rolled rather than `Intl.NumberFormat('en-IN')` because Hermes builds
 * ship a variable amount of ICU data and a silently-Western-grouped price is
 * the kind of bug nobody notices until a judge does.
 */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${tail}`;
}

/**
 * Renders integer paise as rupees.
 *
 * Money is integer paise everywhere in this codebase and is formatted only
 * here, at the render edge. Never divide by 100 in a screen.
 *
 * Latin digits in BOTH locales, with Indian grouping: `₹1,299`, `₹1,49,900`.
 * Devanagari numerals were considered and rejected — every mainstream Indian
 * payment app (PhonePe, Paytm, Google Pay) shows Latin digits in its Hindi
 * UI, and a price is the last place to surprise someone.
 *
 * `_locale` is therefore unused today. It stays in the signature because the
 * decision is a presentation choice, not a fact about money, and reversing it
 * should not mean touching every call site.
 */
export function formatPaise(paise: number, _locale: AppLocale): string {
  const negative = paise < 0;
  const abs = Math.round(Math.abs(paise));
  const rupees = Math.floor(abs / 100);
  const remainder = abs % 100;

  const whole = groupIndian(String(rupees));
  const body = remainder === 0 ? whole : `${whole}.${String(remainder).padStart(2, '0')}`;

  return `${negative ? '-' : ''}${RUPEE}${body}`;
}

/**
 * Unit suffixes.
 *
 * These are the one set of user-facing strings that do NOT come from the
 * i18next catalogue. `packages/ui-native` is shared by both apps and must not
 * depend on either app's i18n instance, and the formatter signatures take a
 * locale precisely so the unit can be resolved here. Screens still never
 * hardcode a string — they call the formatter.
 */
const UNITS: Record<AppLocale, { m: string; km: string; min: string; hour: string }> = {
  en: { m: 'm', km: 'km', min: 'min', hour: 'h' },
  hi: { m: 'मी', km: 'किमी', min: 'मिनट', hour: 'घं' },
};

/** Metres under a kilometre, one decimal kilometre above it: `850 m`, `2.4 km`. */
export function formatDistance(metres: number, locale: AppLocale): string {
  const units = UNITS[locale];
  if (metres < 1000) return `${Math.round(metres)} ${units.m}`;
  return `${(metres / 1000).toFixed(1)} ${units.km}`;
}

/** Minutes under an hour, hours and minutes above it: `45 min`, `1 h 30 min`. */
export function formatDuration(minutes: number, locale: AppLocale): string {
  const units = UNITS[locale];
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} ${units.min}`;

  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (rest === 0) return `${hours} ${units.hour}`;
  return `${hours} ${units.hour} ${rest} ${units.min}`;
}
