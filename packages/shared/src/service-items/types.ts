import type { Id, Paise } from '../index';

/**
 * A priced line item inside a sub-category.
 *
 * This is NOT `ServiceCategory`. That type requires `baseFare: Paise`, and
 * two of the six pricing modes have no fare at all — a quote item is priced
 * by survey, a unit item carries a rate rather than a total. Forcing them
 * through `ServiceCategory` would mean a lie in the data (`baseFare: 0`) that
 * every render site then has to defend against.
 *
 * Lives in @sahayo/shared, importable as `@sahayo/shared/service-items`, because
 * the backend prices bookings from the same items the customer app lists. It was
 * promoted from apps/customer in Phase 5 with its loader and data unchanged.
 *
 * ALL money is integer paise. 14900 is ₹149. Nothing here is rendered without
 * going through `formatPaise`.
 */

/** The six ways an item can be priced. The union below discriminates on this. */
export const SERVICE_ITEM_MODES = [
  'fixed',
  'fault',
  'unit',
  'retainer',
  'workshop',
  'quote',
] as const;
export type ServiceItemMode = (typeof SERVICE_ITEM_MODES)[number];

/**
 * Units a `unit`-mode item is billed in.
 *
 * A closed union rather than a free string, because every one of these needs
 * a translated short form in two languages and an unknown unit would render
 * as a missing i18n key in front of a judge. All nine are present in the seed.
 */
export const SERVICE_UNITS = [
  'sqft',
  'rft',
  'point',
  'panel',
  'roll',
  'day',
  'night',
  'hour',
  'km',
] as const;
export type ServiceUnit = (typeof SERVICE_UNITS)[number];

/** Retainer billing periods. `year` occurs once, on the AC annual contract. */
export const RETAINER_PERIODS = ['month', 'year'] as const;
export type RetainerPeriod = (typeof RETAINER_PERIODS)[number];

/** Seasons an item peaks in. Used for sort order only — never for filtering. */
export const SERVICE_SEASONS = ['summer', 'monsoon', 'festival'] as const;
export type ServiceSeason = (typeof SERVICE_SEASONS)[number];

/** Fields every item carries, whatever its mode. */
interface ServiceItemBase {
  id: Id;
  /** The sub-category this item was read out of. Added by the loader; the
   *  seed keys by sub-category, so the row itself does not repeat it. */
  subCategoryId: Id;
  name: string;
  /** Absent throughout the seed today. See the note in `serviceItems.ts`. */
  nameLocalized?: Record<string, string>;
  description: string;
  descriptionLocalized?: Record<string, string>;

  /** Cleaned by machine, with no manual entry into the drain or tank. */
  mechanisedOnly?: boolean;
  /** Must be performed by a licensed nurse. */
  requiresLicence?: boolean;
  /** Peak season. Sort order only. */
  seasonal?: ServiceSeason;
  /** Unplanned, same-day work. Drives the urgency treatment on the row. */
  emergency?: boolean;
}

/** Priced up front: a known job of a known length. */
export interface FixedServiceItem extends ServiceItemBase {
  mode: 'fixed';
  priceP: Paise;
  stdMinutes: number;
}

/**
 * Diagnose first, price after.
 *
 * `visitChargeP` and `fromP` are equal on all eighteen fault items in the
 * seed, so the row shows one number and explains it once rather than showing
 * two numbers that look like they disagree.
 */
export interface FaultServiceItem extends ServiceItemBase {
  mode: 'fault';
  visitChargeP: Paise;
  fromP: Paise;
}

/** Billed by measure — square feet, points, days. */
export interface UnitServiceItem extends ServiceItemBase {
  mode: 'unit';
  ratePerUnitP: Paise;
  unit: ServiceUnit;
  minQty: number;
}

/** A standing contract billed per period. */
export interface RetainerServiceItem extends ServiceItemBase {
  mode: 'retainer';
  priceP: Paise;
  period: RetainerPeriod;
}

/** Repaired off site. Not a home visit — drop-off or pickup. */
export interface WorkshopServiceItem extends ServiceItemBase {
  mode: 'workshop';
  fromP: Paise;
  intakeChargeP: Paise;
}

/**
 * Not priced without a survey.
 *
 * `priceP` is typed as the literal `0`, not `Paise`. The seed sets it to zero
 * on all twenty-eight quote items, and pinning the literal means any attempt
 * to render this as money is a compile error rather than a "₹0" on screen.
 */
export interface QuoteServiceItem extends ServiceItemBase {
  mode: 'quote';
  priceP: 0;
}

export type ServiceItem =
  | FixedServiceItem
  | FaultServiceItem
  | UnitServiceItem
  | RetainerServiceItem
  | WorkshopServiceItem
  | QuoteServiceItem;

/**
 * Which call-to-action pair a mode gets.
 *
 * Derived from the mode rather than stored, because the two are not
 * independent: a fault item's button books a diagnostic visit, not the
 * repair, and a quote item has no "book now" to offer at all. Keeping this as
 * a function means a new mode is a compile error here rather than a row that
 * silently offers the wrong promise.
 */
export type ServiceItemCta = 'now' | 'visit' | 'survey';

export function ctaFor(mode: ServiceItemMode): ServiceItemCta {
  switch (mode) {
    case 'fixed':
    case 'unit':
    case 'retainer':
      return 'now';
    case 'fault':
    case 'workshop':
      return 'visit';
    case 'quote':
      return 'survey';
  }
}
