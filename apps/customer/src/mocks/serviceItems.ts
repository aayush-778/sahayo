/**
 * The priced item catalogue and its lookups.
 *
 * Loaded and integrity-checked in @sahayo/shared, which the backend reads too, so
 * the price a customer sees on a row is the price the server quotes. Re-exported
 * here so the mock layer keeps one place screens import items from.
 */
export {
  DEMO_SEASON,
  SERVICE_ITEM_COUNT,
  findServiceItem,
  serviceItemsBySubCategoryId,
  serviceItemsFor,
} from '@sahayo/shared/service-items';
