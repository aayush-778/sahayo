/**
 * Chart colours and Recharts defaults.
 *
 * Recharts takes colours as strings, not as Tailwind classes, so these read the
 * same custom properties the rest of the product uses — `hsl(var(--marigold))`
 * resolves at paint time exactly as a utility class would. No hex literal appears
 * here, and no hue exists that is not already a token.
 */

/** The series colours, in the order a chart should consume them. */
export const SERIES = {
  platform: 'hsl(var(--marigold))',
  fund: 'hsl(var(--fund-green))',
  coral: 'hsl(var(--coral))',
  lavender: 'hsl(var(--lavender))',
} as const;

/**
 * The donut's six segments.
 *
 * Five slices plus Other. The last two are derived tints of marigold rather than
 * new hues, because the palette is nine tokens and a chart is not a licence to
 * add a tenth. Lightness is varied through the same `--marigold` token, so if the
 * brand colour changes these follow it.
 */
export const DONUT_SEGMENTS = [
  'hsl(var(--marigold))',
  'hsl(var(--fund-green))',
  'hsl(var(--coral))',
  'hsl(var(--lavender))',
  'hsl(var(--marigold) / 0.55)',
  'hsl(var(--marigold) / 0.25)',
] as const;

/** Hairline, for grid lines and cell gaps. */
export const HAIRLINE = 'hsl(var(--hairline))';

/** Muted, for axis labels. */
export const MUTED = 'hsl(var(--muted))';

/** Surface, for the gap between donut segments and hex cells. */
export const SURFACE = 'hsl(var(--surface))';

/**
 * Axis defaults that strip Recharts of the look that makes every dashboard the
 * same: no axis line, no tick marks, 12px muted labels.
 */
export const AXIS = {
  stroke: MUTED,
  tickLine: false,
  axisLine: false,
  tick: { fill: MUTED, fontSize: 12 },
} as const;

/** Horizontal grid lines only, 1px dotted hairline. Never vertical. */
export const GRID = {
  stroke: HAIRLINE,
  strokeDasharray: '2 4',
  vertical: false,
} as const;

/** Line defaults: 2px, no dots until hover, 4px active dot. */
export const LINE = {
  strokeWidth: 2,
  dot: false,
  activeDot: { r: 4, strokeWidth: 0 },
} as const;

/**
 * The demand ramp: pale marigold-tint through orange to coral.
 *
 * It starts at the TINT, not at full marigold. An earlier version began at
 * saturated marigold, which made a zone at 20% demand look nearly as urgent as one
 * at 100% — the whole map read as on fire and carried no information. A choropleth
 * needs its quiet end to be genuinely quiet.
 *
 * Built from the marigold-tint and coral tokens' own hue, saturation and lightness,
 * so the ramp moves between exactly those two colours and introduces no new hue.
 * Lightness falls as demand rises, so the scale is monotonic in visual weight as
 * well as in colour — hot zones read heavier, not merely different.
 */
export function demandColor(index: number): string {
  const t = Math.max(0, Math.min(1, index));
  /* marigold-tint hsl(44.3 95.5% 91.4%) -> coral hsl(10.6 100% 72.4%), darkened. */
  const hue = 44.3 + (10.6 - 44.3) * t;
  const saturation = 95.5 + (100 - 95.5) * t;
  const lightness = 91.4 + (62 - 91.4) * t;
  return `hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`;
}

/**
 * Water and land that is not a zone.
 *
 * The palette has no blue, and adding one for a river would be a tenth token. The
 * Ganga is drawn in hairline instead — which also follows the dispatch map's rule
 * that geography is muted almost to greyscale so the data reads first.
 */
export const WATER = 'hsl(var(--hairline))';
export const WATER_EDGE = 'hsl(var(--muted) / 0.25)';
