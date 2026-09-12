import type { Paise } from '@sahayo/shared';

/**
 * Formatting helpers. Pure functions, safe for any component to import.
 *
 * These are not services: they compute nothing and read nothing. Money arrives
 * here as paise and leaves as a string.
 */

/**
 * Rupees with Indian digit grouping — ₹1,24,500, not ₹124,500.
 *
 * The lakh/crore grouping is the whole point. `en-IN` gets it right; a plain
 * `toLocaleString()` on a machine set to en-US silently produces Western
 * thousands separators, which is wrong in front of the Ministry of Cooperation.
 * The locale is therefore passed explicitly, never left to the environment.
 */
export function rupees(paise: Paise, options: { decimals?: boolean } = {}): string {
  const amount = paise / 100;
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: options.decimals ? 2 : 0,
    maximumFractionDigits: options.decimals ? 2 : 0,
  })}`;
}

/** Compact rupees for chart axes, where a full figure would not fit. */
export function rupeesCompact(paise: Paise): string {
  const amount = paise / 100;
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${Math.round(amount / 1_000)}k`;
  return `₹${Math.round(amount)}`;
}

/** A plain count with Indian grouping. */
export function count(value: number): string {
  return value.toLocaleString('en-IN');
}

/** A share as a whole-number percentage. */
export function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * How long ago, in words.
 *
 * Measured against the seed's fixed "now" rather than the wall clock, so the feed
 * reads consistently with the data it describes. Against `Date.now()` the
 * deterministic dataset would drift into "3 months ago" over time while the
 * figures stayed put.
 */
export function relativeTime(iso: string, now: Date): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}
