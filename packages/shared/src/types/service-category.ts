import type { Id, Paise } from './common';

export interface ServiceCategory {
  id: Id;
  /** Stable machine key, e.g. `plumbing`. */
  slug: string;
  name: string;
  /** Localised display name, keyed by locale, e.g. `{ hi: '...' }`. */
  nameLocalized?: Record<string, string>;
  description?: string;
  iconKey?: string;
  baseFare: Paise;
  /** Nominal duration used for scheduling and fare estimation. */
  estimatedDurationMin: number;
  active: boolean;
}
