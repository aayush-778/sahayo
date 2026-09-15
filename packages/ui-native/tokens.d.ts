/**
 * Hand-written types for `tokens.js`.
 *
 * `tokens.js` must stay CommonJS so Tailwind's Node-based config loader can
 * require it, so its types cannot be inferred. Keep this file in step with it.
 */

export type BrandColorName =
  | 'primary'
  | 'primary-dark'
  | 'primary-soft'
  | 'primary-tint'
  | 'leaf'
  | 'leaf-light'
  | 'navy'
  | 'teal'
  | 'cream'
  | 'surface'
  | 'muted'
  | 'border'
  | 'success'
  | 'success-soft'
  | 'warning'
  | 'warning-soft'
  | 'danger'
  | 'danger-soft';

/** The worker app's palette. Role names, not colour names — see tokens.js. */
export type WorkerColorName =
  | 'primary'
  | 'primary-dark'
  | 'primary-soft'
  | 'primary-tint'
  | 'sky'
  | 'sky-light'
  | 'ink'
  | 'ground'
  | 'surface'
  | 'muted'
  | 'outline'
  | 'border'
  | 'success'
  | 'success-soft'
  | 'warning'
  | 'warning-soft'
  | 'danger'
  | 'danger-soft';

export type FontScript = 'latin' | 'devanagari';
export type FontWeightName = 'regular' | 'medium' | 'semibold' | 'bold';

export declare const brandColors: Record<BrandColorName, string>;
export declare const workerColors: Record<WorkerColorName, string>;
export declare const fontFamilies: Record<FontScript, Record<FontWeightName, string>>;
