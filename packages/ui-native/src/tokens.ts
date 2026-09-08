/**
 * Typed re-export of the CommonJS token source at the package root.
 *
 * Import tokens from here, never by reaching at `../tokens` directly, so
 * there is one import path to change if the tokens ever move.
 */
export type { BrandColorName, FontScript, FontWeightName } from '../tokens';
export { brandColors, fontFamilies } from '../tokens';
