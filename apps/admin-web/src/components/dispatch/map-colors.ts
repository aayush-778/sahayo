/**
 * Design tokens, resolved to colour strings MapLibre can paint.
 *
 * The charts elsewhere pass `hsl(var(--marigold))` straight through, because the
 * browser resolves it as CSS. MapLibre cannot: it parses colours itself and paints
 * in WebGL, so a `var()` reference reaches it as an unparseable string and the
 * layer silently renders black or not at all.
 *
 * So the tokens are read off the document at runtime and turned into concrete
 * `hsl()` strings. tokens.css stays the single place a colour is written, no
 * component carries a hex literal, and changing the palette still changes the map.
 */

/** The tokens the map needs. */
export type MapToken =
  | 'ground'
  | 'surface'
  | 'marigold'
  | 'marigold-tint'
  | 'fund-green'
  | 'coral'
  | 'lavender'
  | 'ink'
  | 'muted'
  | 'hairline';

/**
 * Values used when the document cannot be read.
 *
 * This happens during a server render, where `document` does not exist. They are
 * the same values tokens.css declares, and they exist so the module can be
 * imported anywhere without a guard — not as a second definition to maintain. If
 * the palette changes and these drift, the map still reads the live values in the
 * browser, which is the only place it paints.
 */
const SERVER_FALLBACK: Record<MapToken, string> = {
  ground: '41.5 76.5% 96.7%',
  surface: '0 0% 100%',
  marigold: '43.7 91.8% 52%',
  'marigold-tint': '44.3 95.5% 91.4%',
  'fund-green': '149 58.6% 49.2%',
  coral: '10.6 100% 72.4%',
  lavender: '255.1 91.7% 76.3%',
  ink: '33.3 17% 10.4%',
  muted: '31.8 6.8% 50.8%',
  hairline: '37.9 38.8% 90.4%',
};

/** Reads a token's raw HSL triplet from the document, or the fallback. */
function triplet(token: MapToken): string {
  if (typeof document === 'undefined') return SERVER_FALLBACK[token];
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${token}`)
    .trim();
  return value || SERVER_FALLBACK[token];
}

/**
 * A token as an `hsl()` or `hsla()` string.
 *
 * Comma-separated rather than the modern space-separated form, because MapLibre's
 * colour parser is the conservative one and comma syntax is what every version of
 * it accepts.
 */
export function mapColor(token: MapToken, alpha?: number): string {
  const [hue = '0', saturation = '0%', lightness = '0%'] = triplet(token).split(/\s+/);
  if (alpha === undefined) {
    return `hsl(${hue}, ${saturation}, ${lightness})`;
  }
  return `hsla(${hue}, ${saturation}, ${lightness}, ${alpha})`;
}
