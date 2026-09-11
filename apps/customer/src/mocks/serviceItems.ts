import type { Id } from '@sahayo/shared';

import serviceItemsJson from '../data/serviceItems.json';
import {
  RETAINER_PERIODS,
  SERVICE_ITEM_MODES,
  SERVICE_SEASONS,
  SERVICE_UNITS,
  type RetainerPeriod,
  type ServiceItem,
  type ServiceItemMode,
  type ServiceSeason,
  type ServiceUnit,
} from '../types/service-item';
import { subCategoriesByCategoryId } from './categories';

/**
 * The priced item catalogue, read from `src/data/serviceItems.json`.
 *
 * The seed file is supplied data and is never regenerated or edited. It keys
 * items by sub-category SLUG (`"basic-electrical"`), while the rest of the
 * app keys by id (`sub_basic_electrical`); the bridge is built here, once,
 * from the slug already on every sub-category record. All 49 slugs match
 * exactly in both directions — the assertion below is what keeps that true.
 *
 * `resolveJsonModule` would hand us a structurally inferred type in which
 * `mode` is `string` and every optional field is present-or-absent across the
 * whole union, which is useless for a discriminated union. So the import is
 * taken as `unknown` and narrowed here by hand. This is the only place in the
 * app that inspects raw seed shape, and it is the reason no screen has to.
 *
 * NO HINDI IN THE SEED. All 289 names and descriptions are English, so in
 * Hindi the chrome around an item localises and the item's own name does not.
 * That is deliberate for this sub-phase rather than an oversight: a batch of
 * 578 machine-authored strings would get rubber-stamped rather than reviewed,
 * and the wrong Hindi is worse than English. `nameLocalized` and
 * `descriptionLocalized` are already on the type and already read by the
 * render path, so a reviewed Hindi map drops in later WITHOUT touching the
 * seed file.
 */

/**
 * The season the demo is pinned to.
 *
 * Read from a constant rather than the device clock on purpose. A list whose
 * order depends on today's date behaves one way in rehearsal and another way
 * on stage, and that is a bug you discover in front of judges. Change this
 * line to re-shoot the demo in another season.
 */
export const DEMO_SEASON: ServiceSeason = 'monsoon';

const problems: string[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads a required string, recording a problem instead of throwing. */
function readString(row: Record<string, unknown>, key: string, where: string): string {
  const value = row[key];
  if (typeof value === 'string' && value.length > 0) return value;
  problems.push(`${where}: missing or empty "${key}"`);
  return '';
}

/** Reads a required whole number of paise or minutes. */
function readNumber(row: Record<string, unknown>, key: string, where: string): number {
  const value = row[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  problems.push(`${where}: missing or non-numeric "${key}"`);
  return 0;
}

function readMember<T extends string>(
  row: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  where: string,
): T {
  const value = row[key];
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  problems.push(`${where}: "${key}" is ${JSON.stringify(value)}, expected one of ${allowed.join(', ')}`);
  return allowed[0];
}

function readFlag(row: Record<string, unknown>, key: string): true | undefined {
  return row[key] === true ? true : undefined;
}

function readSeason(row: Record<string, unknown>, where: string): ServiceSeason | undefined {
  if (!('seasonal' in row)) return undefined;
  return readMember<ServiceSeason>(row, 'seasonal', SERVICE_SEASONS, where);
}

/** Narrows one raw seed row into the discriminated union. */
function toServiceItem(
  raw: unknown,
  subCategoryId: Id,
  slug: string,
  index: number,
): ServiceItem | undefined {
  const where = `${slug}[${index}]`;
  if (!isRecord(raw)) {
    problems.push(`${where}: not an object`);
    return undefined;
  }

  const shared = {
    id: readString(raw, 'id', where),
    subCategoryId,
    name: readString(raw, 'name', where),
    description: readString(raw, 'desc', where),
    mechanisedOnly: readFlag(raw, 'mechanisedOnly'),
    requiresLicence: readFlag(raw, 'requiresLicence'),
    emergency: readFlag(raw, 'emergency'),
    seasonal: readSeason(raw, where),
  };

  const mode = readMember<ServiceItemMode>(raw, 'mode', SERVICE_ITEM_MODES, where);

  switch (mode) {
    case 'fixed':
      return {
        ...shared,
        mode,
        priceP: readNumber(raw, 'priceP', where),
        stdMinutes: readNumber(raw, 'stdMinutes', where),
      };
    case 'fault':
      return {
        ...shared,
        mode,
        visitChargeP: readNumber(raw, 'visitChargeP', where),
        fromP: readNumber(raw, 'fromP', where),
      };
    case 'unit':
      return {
        ...shared,
        mode,
        ratePerUnitP: readNumber(raw, 'ratePerUnitP', where),
        unit: readMember<ServiceUnit>(raw, 'unit', SERVICE_UNITS, where),
        minQty: readNumber(raw, 'minQty', where),
      };
    case 'retainer':
      return {
        ...shared,
        mode,
        priceP: readNumber(raw, 'priceP', where),
        period: readMember<RetainerPeriod>(raw, 'period', RETAINER_PERIODS, where),
      };
    case 'workshop':
      return {
        ...shared,
        mode,
        fromP: readNumber(raw, 'fromP', where),
        intakeChargeP: readNumber(raw, 'intakeChargeP', where),
      };
    case 'quote': {
      const priceP = readNumber(raw, 'priceP', where);
      if (priceP !== 0) problems.push(`${where}: quote item has a non-zero priceP (${priceP})`);
      return { ...shared, mode, priceP: 0 };
    }
  }
}

/** slug -> sub-category id, built from the records rather than restated. */
const subCategoryIdBySlug: Record<string, Id> = {};
for (const group of Object.values(subCategoriesByCategoryId)) {
  for (const sub of group) subCategoryIdBySlug[sub.slug] = sub.id;
}

/**
 * In-season items first, everything else in the seed's own order.
 *
 * The seed is already ordered by relevance, so this is a stable partition and
 * not a re-sort: `Array.prototype.sort` is required to be stable, and Hermes
 * honours that, so items with equal rank keep the order they were written in.
 */
function seasonFirst(items: ServiceItem[]): ServiceItem[] {
  return [...items].sort(
    (a, b) => Number(a.seasonal !== DEMO_SEASON) - Number(b.seasonal !== DEMO_SEASON),
  );
}

function build(): Record<Id, ServiceItem[]> {
  const source: unknown = serviceItemsJson;
  if (!isRecord(source) || !isRecord(source.items)) {
    throw new Error('serviceItems.json: expected an object with an "items" map');
  }

  const byId: Record<Id, ServiceItem[]> = {};

  for (const [slug, rawList] of Object.entries(source.items)) {
    const subCategoryId = subCategoryIdBySlug[slug];
    if (subCategoryId === undefined) {
      problems.push(`seed key "${slug}" matches no sub-category slug`);
      continue;
    }
    if (!Array.isArray(rawList)) {
      problems.push(`seed key "${slug}" is not an array`);
      continue;
    }

    const items: ServiceItem[] = [];
    rawList.forEach((raw, index) => {
      const item = toServiceItem(raw, subCategoryId, slug, index);
      if (item) items.push(item);
    });
    byId[subCategoryId] = seasonFirst(items);
  }

  return byId;
}

export const serviceItemsBySubCategoryId: Record<Id, ServiceItem[]> = build();

// ---------------------------------------------------------------------------
// Integrity
//
// Same contract as the rest of the mock layer: collect every problem, then
// throw once. A loader that throws on the first bad row makes you fix 289
// items one app launch at a time.
// ---------------------------------------------------------------------------

const allItems = Object.values(serviceItemsBySubCategoryId).flat();

const seenIds = new Set<string>();
for (const item of allItems) {
  if (seenIds.has(item.id)) problems.push(`duplicate item id "${item.id}"`);
  seenIds.add(item.id);
}

for (const group of Object.values(subCategoriesByCategoryId)) {
  for (const sub of group) {
    if ((serviceItemsBySubCategoryId[sub.id] ?? []).length === 0) {
      problems.push(`sub-category "${sub.id}" has no priced items`);
    }
  }
}

if (problems.length > 0) {
  throw new Error(
    `serviceItems.json failed its integrity check:\n  - ${problems.join('\n  - ')}`,
  );
}

/** Every priced item under one sub-category, in display order. */
export function serviceItemsFor(subCategoryId: Id): ServiceItem[] {
  return serviceItemsBySubCategoryId[subCategoryId] ?? [];
}

export function findServiceItem(itemId: Id): ServiceItem | undefined {
  return allItems.find((item) => item.id === itemId);
}

/** Total across the catalogue. Used by the verification script, not by a screen. */
export const SERVICE_ITEM_COUNT = allItems.length;
