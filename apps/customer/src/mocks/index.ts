import type { Booking, Id, Paise, ServiceCategory } from '@sahayo/shared';
import type { AppLocale } from '@sahayo/ui-native';

import {
  CATEGORY_GROUPS,
  categoryIdsByGroup,
  homeCategoryIds,
  serviceCategories,
  subCategoriesByCategoryId,
  type CategoryGroup,
} from './categories';
import { servicesBySubCategoryId, type ServiceItem } from './services';
import { etaMinutesByBookingId, liveBookings, mockBookings, pastBookings } from './bookings';
import { findWorkerById, mockWorkers, type MockWorker } from './workers';
import { bannerPromotions, discountedPaise, featuredServices } from './promotions';

export {
  CategoryGroup,
  CATEGORY_GROUPS,
  categoryIdsByGroup,
  homeCategoryIds,
  serviceCategories,
  subCategoriesByCategoryId,
} from './categories';
export { servicesBySubCategoryId, type ServiceItem } from './services';
export { etaMinutesByBookingId, liveBookings, mockBookings, pastBookings } from './bookings';
export { findWorkerById, mockWorkers, type MockWorker } from './workers';
export { mockServiceLocation, type ServiceLocation } from './location';
export {
  bannerPromotions,
  discountedPaise,
  featuredServices,
  type FeaturedService,
  type Promotion,
} from './promotions';

/**
 * Read helpers over the mock catalogue.
 *
 * Screens go through these rather than indexing the records directly, so the
 * Phase 5 swap is a change of implementation here — an API call, a cache —
 * rather than a rewrite of every screen that happened to know the shape of a
 * lookup table.
 */

export function findCategoryById(categoryId: Id): ServiceCategory | undefined {
  return serviceCategories.find((category) => category.id === categoryId);
}

export function subCategoriesFor(categoryId: Id): ServiceCategory[] {
  return subCategoriesByCategoryId[categoryId as keyof typeof subCategoriesByCategoryId] ?? [];
}

export function findSubCategoryById(subCategoryId: Id): ServiceCategory | undefined {
  for (const group of Object.values(subCategoriesByCategoryId)) {
    const found = group.find((sub) => sub.id === subCategoryId);
    if (found) return found;
  }
  return undefined;
}

/** The worker type a sub-category hangs off, for breadcrumbs and back
 *  navigation. The link lives in the index, not on the row. */
export function findParentCategory(subCategoryId: Id): ServiceCategory | undefined {
  for (const [categoryId, group] of Object.entries(subCategoriesByCategoryId)) {
    if (group.some((sub) => sub.id === subCategoryId)) return findCategoryById(categoryId);
  }
  return undefined;
}

export function servicesFor(subCategoryId: Id): ServiceItem[] {
  return servicesBySubCategoryId[subCategoryId as keyof typeof servicesBySubCategoryId] ?? [];
}

export function findServiceItemById(serviceItemId: Id): ServiceItem | undefined {
  for (const group of Object.values(servicesBySubCategoryId)) {
    const found = group.find((item) => item.id === serviceItemId);
    if (found) return found;
  }
  return undefined;
}

/** The worker types in one chip group, in the catalogue's fixed order. */
export function categoriesInGroup(group: CategoryGroup): ServiceCategory[] {
  const ids = new Set(categoryIdsByGroup[group]);
  return serviceCategories.filter((category) => ids.has(category.id));
}

/** The five worker types Home shows above its "View all" link. */
export function homeCategories(): ServiceCategory[] {
  const ids = new Set(homeCategoryIds);
  return serviceCategories.filter((category) => ids.has(category.id));
}

/**
 * Normalises a string for searching.
 *
 * `normalize('NFC')` is the part that matters, and it is not decoration.
 * Devanagari letters carrying a nukta have two encodings — ढ़ is either the
 * single code point U+095D or the pair U+0922 U+093C — and different Android
 * keyboards emit different ones. Under Unicode's composition exclusions both
 * settle on the decomposed pair after NFC, so normalising BOTH the query and
 * the label is what makes typing "बढ़" match "बढ़ई" whichever form the
 * keyboard produced. Without it the search silently fails on exactly the
 * words a Hindi user is most likely to type.
 *
 * `toLowerCase` is a no-op for Devanagari, which has no letter case, and is
 * here for the Latin half of the catalogue.
 */
export function normalizeForSearch(value: string): string {
  return value.normalize('NFC').toLowerCase().trim();
}

/**
 * Matches a query against a category's name in EVERY language it has, not
 * just the one on screen. Someone reading the Hindi UI who types "carp"
 * should still find बढ़ई, and vice versa.
 */
export function categoryMatchesQuery(category: ServiceCategory, query: string): boolean {
  const needle = normalizeForSearch(query);
  if (!needle) return true;

  const haystack = [category.name, ...Object.values(category.nameLocalized ?? {})];
  return haystack.some((label) => normalizeForSearch(label).includes(needle));
}

export function findBookingById(bookingId: Id): Booking | undefined {
  return mockBookings.find((booking) => booking.id === bookingId);
}

/** The worker assigned to a booking, if one has accepted it yet. */
export function workerForBooking(bookingId: Id): MockWorker | undefined {
  const booking = findBookingById(bookingId);
  return booking?.workerId ? findWorkerById(booking.workerId) : undefined;
}

/**
 * A live booking with everything Home's live-order card needs, joined.
 *
 * Assembled here rather than in the component so the card renders one object
 * and the Phase 5 socket payload has one shape to satisfy.
 */
export interface LiveOrder {
  booking: Booking;
  worker?: MockWorker;
  service?: ServiceItem;
  etaMinutes?: number;
}

export function getLiveOrders(): LiveOrder[] {
  return liveBookings.map((booking) => ({
    booking,
    worker: booking.workerId ? findWorkerById(booking.workerId) : undefined,
    service: findServiceItemById(booking.serviceCategoryId),
    etaMinutes: etaMinutesByBookingId[booking.id],
  }));
}

/** A featured service resolved against the catalogue, with its fares worked out. */
export interface FeaturedServiceView {
  id: Id;
  item: ServiceItem;
  discountPercent: number;
  imageUrl: string;
  /** The catalogue fare, struck through in the UI. */
  originalFare: Paise;
  /** What the customer would actually pay. */
  discountedFare: Paise;
}

export function getFeaturedServices(): FeaturedServiceView[] {
  const views: FeaturedServiceView[] = [];

  for (const featured of featuredServices) {
    const item = findServiceItemById(featured.serviceItemId);
    // A featured id that no longer matches a catalogue row is a data bug, not
    // a reason to crash Home. Skipping it loses one card and nothing else.
    if (!item) continue;

    views.push({
      id: item.id,
      item,
      discountPercent: featured.discountPercent,
      imageUrl: featured.imageUrl,
      originalFare: item.baseFare,
      discountedFare: discountedPaise(item.baseFare, featured.discountPercent),
    });
  }

  return views;
}

/**
 * Catalogue names are content, not UI chrome, so they live on the record as
 * `nameLocalized` rather than in the i18next catalogue — a real backend would
 * serve them the same way. English is the fallback because `name` is the
 * canonical value in `ServiceCategory`.
 */
export function localizedName(node: ServiceCategory, locale: AppLocale): string {
  if (locale === 'en') return node.name;
  return node.nameLocalized?.[locale] ?? node.name;
}

/** The same fallback rule for any localised string on a mock record. */
export function localized(
  value: string,
  localizedValues: Record<string, string> | undefined,
  locale: AppLocale,
): string {
  if (locale === 'en') return value;
  return localizedValues?.[locale] ?? value;
}

export const allWorkers = mockWorkers;
export const allBookings = mockBookings;
export const bookingCounts = {
  live: liveBookings.length,
  past: pastBookings.length,
};

/**
 * Referential integrity across the mock files.
 *
 * The ids tying these files together are plain strings, so TypeScript cannot
 * see a dangling one — renaming `cat_cleaning` to `cat_cleaners` typechecks
 * perfectly while quietly emptying a screen. This walks every cross-file
 * reference once at module load and reports ALL the breakages rather than the
 * first, which is what you want when a rename has just gone through.
 */
(function assertCatalogueIntegrity() {
  const problems: string[] = [];

  const categoryIds = new Set(serviceCategories.map((category) => category.id));
  const subCategoryIds = new Set(
    Object.values(subCategoriesByCategoryId).flatMap((group) => group.map((sub) => sub.id)),
  );
  const itemIds = new Set(
    Object.values(servicesBySubCategoryId).flatMap((group) => group.map((item) => item.id)),
  );

  for (const categoryId of Object.keys(subCategoriesByCategoryId)) {
    if (!categoryIds.has(categoryId)) {
      problems.push(`subCategoriesByCategoryId has no such category: ${categoryId}`);
    }
  }

  for (const category of serviceCategories) {
    if (subCategoriesFor(category.id).length === 0) {
      problems.push(`category has no sub-categories: ${category.id}`);
    }
  }

  for (const subCategoryId of Object.keys(servicesBySubCategoryId)) {
    if (!subCategoryIds.has(subCategoryId)) {
      problems.push(`servicesBySubCategoryId has no such sub-category: ${subCategoryId}`);
    }
  }

  for (const subCategoryId of subCategoryIds) {
    if (servicesFor(subCategoryId).length === 0) {
      problems.push(`sub-category has no priced items: ${subCategoryId}`);
    }
  }

  for (const group of CATEGORY_GROUPS) {
    for (const categoryId of categoryIdsByGroup[group]) {
      if (!categoryIds.has(categoryId)) {
        problems.push(`group "${group}" references missing category: ${categoryId}`);
      }
    }
  }

  // Every category must be in exactly one group, or the chips stop being a
  // partition and start hiding things.
  const grouped = CATEGORY_GROUPS.flatMap((group) => categoryIdsByGroup[group]);
  for (const category of serviceCategories) {
    const count = grouped.filter((id) => id === category.id).length;
    if (count !== 1) {
      problems.push(`category is in ${count} groups, expected exactly 1: ${category.id}`);
    }
  }

  for (const categoryId of homeCategoryIds) {
    if (!categoryIds.has(categoryId)) {
      problems.push(`homeCategoryIds references missing category: ${categoryId}`);
    }
  }

  for (const worker of mockWorkers) {
    for (const categoryId of worker.profile.serviceCategoryIds) {
      if (!categoryIds.has(categoryId)) {
        problems.push(`worker ${worker.profile.id} references missing category: ${categoryId}`);
      }
    }
  }

  for (const booking of mockBookings) {
    if (!itemIds.has(booking.serviceCategoryId)) {
      problems.push(`booking ${booking.id} references missing item: ${booking.serviceCategoryId}`);
    }
  }

  for (const promotion of bannerPromotions) {
    if (!categoryIds.has(promotion.categoryId)) {
      problems.push(`banner ${promotion.id} references missing category: ${promotion.categoryId}`);
    }
  }

  for (const featured of featuredServices) {
    if (!itemIds.has(featured.serviceItemId)) {
      problems.push(`featured service references missing item: ${featured.serviceItemId}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Mock catalogue integrity failed:\n  - ${problems.join('\n  - ')}`);
  }
})();
