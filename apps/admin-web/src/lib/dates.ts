/**
 * The dataset's time anchor, and the arithmetic around it.
 *
 * Defined in @sahayo/shared beside the seed, because the backend builds the same
 * dataset from the same instant. Re-exported here so the services and the UI keep
 * one neutral place to import it from — the UI is barred from importing the seed,
 * and `@sahayo/shared/seed/clock` carries none of the seed's data.
 */
export { DAY_MS, SEED_NOW, compareIso, isoAgo } from '@sahayo/shared/seed/clock';
