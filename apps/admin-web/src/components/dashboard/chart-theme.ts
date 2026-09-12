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
 * Interpolates marigold to coral across a 0–1 demand scale.
 *
 * Returned as an `hsl()` string built from the two tokens' own hue, saturation
 * and lightness, so the ramp moves between exactly those two colours and
 * introduces nothing in between. Kept here rather than in the component so the
 * hex map and any later heatmap share one ramp.
 */
export function demandColor(index: number): string {
  const t = Math.max(0, Math.min(1, index));
  /*
   * Marigold is hsl(43.7 91.8% 52%) and coral is hsl(10.6 100% 72.4%). Crossing
   * between them directly passes through orange, which is the intended reading:
   * warm and quiet at one end, hot and urgent at the other.
   */
  const hue = 43.7 + (10.6 - 43.7) * t;
  const saturation = 91.8 + (100 - 91.8) * t;
  const lightness = 52 + (72.4 - 52) * t;
  /*
   * Lightness rises toward coral, which would make "high demand" read as paler
   * than "quiet". Pulling it back keeps the ramp monotonic in perceived weight.
   */
  const corrected = lightness - t * 14;
  return `hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% ${corrected.toFixed(1)}%)`;
}
