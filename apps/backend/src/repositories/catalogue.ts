import { serviceCategories, subCategoriesByCategoryId, type Id, type ServiceCategory } from '@sahayo/shared';
import {
  findServiceItem,
  serviceItemsBySubCategoryId,
  workerTypeOfService,
  type ServiceItem,
} from '@sahayo/shared/service-items';

/**
 * The service catalogue. Read-only data from @sahayo/shared rather than state, so these
 * are thin — but routes still come here for it, so the catalogue can move into the
 * database with the rest.
 */

export function listServices(): {
  categories: ServiceCategory[];
  subCategoriesByCategoryId: Record<Id, ServiceCategory[]>;
  itemsBySubCategoryId: Record<Id, ServiceItem[]>;
} {
  return { categories: serviceCategories, subCategoriesByCategoryId, itemsBySubCategoryId: serviceItemsBySubCategoryId };
}

export function findItem(itemId: Id): ServiceItem | undefined {
  return findServiceItem(itemId);
}

/** The worker type (`cat_*`) dispatch matches a booking against. */
export function workerTypeFor(serviceId: Id): Id | undefined {
  return workerTypeOfService(serviceId);
}

export function subCategoryName(subCategoryId: Id): string | undefined {
  for (const subs of Object.values(subCategoriesByCategoryId)) {
    const found = subs.find((sub) => sub.id === subCategoryId);
    if (found) return found.name;
  }
  return undefined;
}
