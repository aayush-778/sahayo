import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/*
 * tailwind-merge has to be told about this app's custom theme keys, or it
 * silently deletes them.
 *
 * It resolves conflicts by class group, and it infers a group from the class
 * name. `text-table` is not a font size it recognises, so it files it under
 * text-colour — and `cn('text-table', 'text-ink')` then returns only
 * `text-ink`, dropping the size with no warning at build or run time. The same
 * happens to `text-pill`, `text-hero` and every token colour.
 *
 * Keep these lists in step with theme.extend in tailwind.config.ts. A new token
 * colour or font size added there must be added here in the same commit.
 */
const FONT_SIZES = ['pill', 'table', 'body', 'section', 'hero'] as const;

const TOKEN_COLORS = [
  'ground',
  'surface',
  'marigold',
  'marigold-tint',
  'fund-green',
  'coral',
  'lavender',
  'ink',
  'muted',
  'hairline',
] as const;

const RADII = ['card', 'tile', 'pill'] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...FONT_SIZES] }],
      'text-color': [{ text: [...TOKEN_COLORS] }],
      'bg-color': [{ bg: [...TOKEN_COLORS] }],
      'border-color': [{ border: [...TOKEN_COLORS] }],
      rounded: [{ rounded: [...RADII] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
