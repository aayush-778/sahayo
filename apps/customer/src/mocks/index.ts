import { DEFAULT_RADIUS_M, WorkerAvailability } from '@sahayo/shared';
import type { Booking, GeoPoint, Id, Paise, ServiceCategory } from '@sahayo/shared';
import type { AppLocale } from '@sahayo/ui-native';

import {
  CATEGORY_GROUPS,
  categoryIdsByGroup,
  chipBySubCategoryId,
  descriptionLocalizedBySubCategoryId,
  homeCategoryIds,
  serviceCategories,
  subCategoriesByCategoryId,
  subCategoryChipsByCategoryId,
  type CategoryGroup,
  type SubCategoryChip,
} from './categories';
import { servicesBySubCategoryId, type ServiceSku } from './services';
import { etaMinutesByBookingId, liveBookings, mockBookings, pastBookings } from './bookings';
import { findWorkerById, mockWorkers, type MockWorker } from './workers';
import { mockServiceLocation } from './location';
import { bannerPromotions, discountedPaise, featuredServices } from './promotions';

export {
  CategoryGroup,
  CATEGORY_GROUPS,
  categoryIdsByGroup,
  chipBySubCategoryId,
  descriptionLocalizedBySubCategoryId,
  homeCategoryIds,
  serviceCategories,
  subCategoriesByCategoryId,
  subCategoryChipsByCategoryId,
  type SubCategoryChip,
} from './categories';
export { servicesBySubCategoryId, type ServiceSku } from './services';
export {
  DEMO_SEASON,
  SERVICE_ITEM_COUNT,
  findServiceItem,
  serviceItemsBySubCategoryId,
  serviceItemsFor,
} from './serviceItems';
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

export function servicesFor(subCategoryId: Id): ServiceSku[] {
  return servicesBySubCategoryId[subCategoryId as keyof typeof servicesBySubCategoryId] ?? [];
}

export function findServiceSkuById(serviceItemId: Id): ServiceSku | undefined {
  for (const group of Object.values(servicesBySubCategoryId)) {
    const found = group.find((item) => item.id === serviceItemId);
    if (found) return found;
  }
  return undefined;
}

/**
 * The sub-category a legacy SKU hangs off.
 *
 * `findServiceSkuById` walks the same table but returns the row, not the key
 * it was found under, and "book this again" needs the key: it routes to the
 * item list, not to a price. Seed items carry `subCategoryId` on the record
 * and need none of this.
 */
export function findSubCategoryIdForSku(serviceItemId: Id): Id | undefined {
  for (const [subCategoryId, group] of Object.entries(servicesBySubCategoryId)) {
    if (group.some((item) => item.id === serviceItemId)) return subCategoryId;
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

/** The chip row for a worker type. Always opens with `all`. */
export function chipsFor(categoryId: Id): SubCategoryChip[] {
  return subCategoryChipsByCategoryId[categoryId] ?? [];
}

/** Which chip a sub-category answers to. */
export function chipOf(subCategoryId: Id): string | undefined {
  return chipBySubCategoryId[subCategoryId];
}

/**
 * The muted second line on a sub-category card.
 *
 * `ServiceCategory` has `description` but no `descriptionLocalized`, so the
 * Hindi lives in an index beside the tree. Same fallback rule as `name`.
 */
export function localizedDescription(node: ServiceCategory, locale: AppLocale): string {
  const english = node.description ?? '';
  if (locale === 'en') return english;
  return descriptionLocalizedBySubCategoryId[node.id]?.[locale] ?? english;
}

/**
 * Matches a query against a sub-category's name in every language it has.
 *
 * Descriptions are deliberately NOT searched: they are keyword-dense lists
 * ("Tap, basin, sink, WC, shower"), so including them would make almost any
 * short query match almost everything and the result list would stop telling
 * you anything.
 */
export function subCategoryMatchesQuery(sub: ServiceCategory, query: string): boolean {
  const needle = normalizeForSearch(query);
  if (!needle) return true;

  const haystack = [sub.name, ...Object.values(sub.nameLocalized ?? {})];
  return haystack.some((label) => normalizeForSearch(label).includes(needle));
}

/** A sub-category paired with the worker type it belongs to, for search results. */
export interface SubCategoryHit {
  sub: ServiceCategory;
  category: ServiceCategory;
}

/** Every sub-category matching a query, with its parent, in catalogue order. */
export function searchSubCategories(query: string): SubCategoryHit[] {
  const hits: SubCategoryHit[] = [];

  for (const category of serviceCategories) {
    for (const sub of subCategoriesFor(category.id)) {
      if (subCategoryMatchesQuery(sub, query)) hits.push({ sub, category });
    }
  }

  return hits;
}

export function findBookingById(bookingId: Id): Booking | undefined {
  return mockBookings.find((booking) => booking.id === bookingId);
}

/**
 * Straight-line metres between two points.
 *
 * Equirectangular rather than haversine: over the 10 km this screen covers,
 * the two agree to well under a metre, and this one is legible.
 */
export function metresBetween(a: GeoPoint, b: GeoPoint): number {
  const metresPerDegLat = 111_000;
  const metresPerDegLng = 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot((a.lat - b.lat) * metresPerDegLat, (a.lng - b.lng) * metresPerDegLng);
}

/**
 * Workers who could actually take this job, nearest first.
 *
 * Three filters, and all three matter on the map. OFFLINE workers are not
 * reachable, so drawing them would promise capacity that is not there. A
 * worker approved for a different service is not a candidate for this one —
 * a plumbing broadcast showing carpenters would be a lie the customer can
 * see. And the radius is the broadcast radius: `DEFAULT_RADIUS_M`, from
 * @sahayo/shared, not a number typed into a screen.
 */
export function workersNear(categoryId: Id, radiusM: number = DEFAULT_RADIUS_M): MockWorker[] {
  return mockWorkers
    .filter((worker) => worker.profile.availability !== WorkerAvailability.OFFLINE)
    .filter((worker) => worker.profile.serviceCategoryIds.includes(categoryId))
    .filter((worker) => worker.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
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
  service?: ServiceSku;
  etaMinutes?: number;
}

export function getLiveOrders(): LiveOrder[] {
  return liveBookings.map((booking) => ({
    booking,
    worker: booking.workerId ? findWorkerById(booking.workerId) : undefined,
    service: findServiceSkuById(booking.serviceCategoryId),
    etaMinutes: etaMinutesByBookingId[booking.id],
  }));
}

/** A featured service resolved against the catalogue, with its fares worked out. */
export interface FeaturedServiceView {
  id: Id;
  item: ServiceSku;
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
    const item = findServiceSkuById(featured.serviceItemId);
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

  // Gaps in the LEGACY SKU catalogue (`services.ts`), which still feeds
  // Home's live-order card and the featured carousel. It is not the item
  // list: `serviceItems.ts` covers all 49 sub-categories and throws rather
  // than warns if one is ever empty. Warn so the gap stays visible, but do
  // not refuse to boot — nothing on screen depends on these.
  const unpriced = [...subCategoryIds].filter((id) => servicesFor(id).length === 0);
  if (unpriced.length > 0) {
    console.warn(
      `[mocks] ${unpriced.length} sub-categories have no legacy SKU (item list is unaffected): ${unpriced.join(', ')}`,
    );
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

  for (const category of serviceCategories) {
    const chips = chipsFor(category.id);
    if (chips.length === 0) {
      problems.push(`category has no chip row: ${category.id}`);
      continue;
    }
    if (chips[0]?.key !== 'all') {
      problems.push(`chip row must open with "all": ${category.id}`);
    }
    const keys = new Set(chips.map((chip) => chip.key));
    for (const sub of subCategoriesFor(category.id)) {
      const chip = chipOf(sub.id);
      if (!chip) {
        problems.push(`sub-category has no chip: ${sub.id}`);
      } else if (!keys.has(chip)) {
        problems.push(`sub-category "${sub.id}" uses chip "${chip}" absent from ${category.id}`);
      } else if (chip === 'all') {
        problems.push(`sub-category must not be assigned the "all" chip: ${sub.id}`);
      }
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

  // `distanceM` must agree with `lastLocation`, because the booking map draws
  // pins from the coordinates and filters candidates by the distance. When
  // they disagreed — and four of the original eight did — a worker could be
  // inside the broadcast radius and outside the drawn circle at the same
  // time, which is a bug the eye catches before any test does.
  for (const worker of mockWorkers) {
    const point = worker.profile.lastLocation;
    if (!point) {
      problems.push(`worker ${worker.profile.id} has no lastLocation`);
      continue;
    }
    const actual = metresBetween(mockServiceLocation.point, point);
    if (Math.abs(actual - worker.distanceM) > 2) {
      problems.push(
        `worker ${worker.profile.id}: distanceM is ${worker.distanceM} but its coordinates are ` +
          `${Math.round(actual)} m from the customer`,
      );
    }
    if (actual < 1) {
      problems.push(`worker ${worker.profile.id} sits exactly on the customer's pin`);
    }
  }

  // The booking map needs a plausible field of pins for every worker type,
  // not just the ones the first eight mock workers happened to cover.
  for (const category of serviceCategories) {
    const nearby = workersNear(category.id).length;
    if (nearby < 4) {
      problems.push(`only ${nearby} available workers within range for ${category.id}`);
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
