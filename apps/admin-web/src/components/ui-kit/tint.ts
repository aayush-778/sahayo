/**
 * The semantic tints an icon tile, delta pill or status pill may take.
 *
 * Tint is chosen by the role of the thing being shown, never for variety. The
 * palette is these five entries; there is no sixth. `fund-green` in particular
 * means the Cooperative Fund, a positive delta, or a verified document — and
 * nothing else.
 */
export const TINTS = ['marigold', 'fund-green', 'coral', 'lavender', 'muted'] as const;

export type Tint = (typeof TINTS)[number];

/** Tile background and icon colour for each tint, as Tailwind utilities. */
export const TINT_TILE: Record<Tint, string> = {
  marigold: 'bg-marigold-tint text-ink',
  'fund-green': 'bg-fund-green/15 text-fund-green',
  coral: 'bg-coral/15 text-coral',
  lavender: 'bg-lavender/15 text-lavender',
  muted: 'bg-hairline/70 text-muted',
};

/** Pill background and text colour for each tint. Backgrounds only, no border. */
export const TINT_PILL: Record<Tint, string> = {
  marigold: 'bg-marigold-tint text-ink',
  'fund-green': 'bg-fund-green/15 text-fund-green',
  coral: 'bg-coral/20 text-ink',
  lavender: 'bg-lavender/15 text-lavender',
  muted: 'bg-hairline/70 text-muted',
};
