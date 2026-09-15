import {
  serviceCategories,
  subCategoriesByCategoryId,
  type Id,
  type ServiceCategory,
} from '@sahayo/shared';
import type { AppLanguage } from '@sahayo/ui-native';

/**
 * The service catalogue, read from @sahayo/shared — the same one the customer
 * app books against. There is no second copy in this app.
 */
const byCategory: Record<Id, ServiceCategory[]> = subCategoriesByCategoryId;

export function getWorkerTypes(): ServiceCategory[] {
  return serviceCategories;
}

export function getSubCategories(categoryId: Id): ServiceCategory[] {
  return byCategory[categoryId] ?? [];
}

export function findWorkerType(categoryId: Id): ServiceCategory | undefined {
  return serviceCategories.find((entry) => entry.id === categoryId);
}

export function findSubCategory(subCategoryId: Id): ServiceCategory | undefined {
  for (const group of Object.values(byCategory)) {
    const found = group.find((entry) => entry.id === subCategoryId);
    if (found) return found;
  }
  return undefined;
}

export function workerTypeOf(subCategoryId: Id): ServiceCategory | undefined {
  for (const [categoryId, group] of Object.entries(byCategory)) {
    if (group.some((entry) => entry.id === subCategoryId)) return findWorkerType(categoryId);
  }
  return undefined;
}

/** A catalogue node's name in the current language, English as the floor. */
export function localizedName(node: ServiceCategory, language: AppLanguage): string {
  return node.nameLocalized?.[language] ?? node.name;
}
