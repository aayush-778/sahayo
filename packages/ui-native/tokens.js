/**
 * The single source of truth for Sahayo's design tokens.
 *
 * This file is plain CommonJS on purpose. It has two consumers that cannot
 * agree on a module system:
 *
 *   - `tailwind-preset.js`, which Node `require`s while building the Tailwind
 *     config. Tailwind's config loader cannot read TypeScript.
 *   - application TypeScript, via `src/tokens.ts`, which re-exports it with
 *     the hand-written types in `tokens.d.ts`.
 *
 * TypeScript needs the raw hex values in the handful of places that are not
 * styleable with a className — React Navigation's `tabBarActiveTintColor`,
 * the root Stack's `contentStyle`, and `StatusBar`. Everywhere else, use the
 * Tailwind classes the preset generates (`bg-brand-cream`, `text-brand-navy`)
 * and never a literal hex.
 *
 * Contrast figures below are against #FFFFFF unless stated. AA body text
 * needs 4.5:1.
 */

const brandColors = {
  // --- greens, from the emblem's foliage -------------------------------
  // The logo's own greens fail AA against white button text (#659A49 is
  // 3.35:1, #8CB64A is 2.36:1). `primary` is #659A49 darkened until it
  // clears 4.5:1, so it still reads as the logo's green while being usable.
  primary: '#4F8233', // 4.59:1 white — the only green safe under white text
  'primary-dark': '#416B2A', // pressed state
  'primary-soft': '#E4EFDA', // disabled button ground
  'primary-tint': '#F1F7EA', // selected-row / chip ground
  leaf: '#659A49', // decorative only — never behind text
  'leaf-light': '#8CB64A', // decorative only — never behind text

  // --- structure --------------------------------------------------------
  navy: '#113B5E', // headings and input text, 11.0:1 on cream
  teal: '#4B8C96', // the interlocked hands; the worker app's ground colour
  cream: '#FBF9F3', // screen background, the artwork's paper tone
  surface: '#FFFFFF', // cards and inputs sitting on the cream
  muted: '#5B6B7A', // labels and helper text, 5.2:1 on cream
  border: '#E3E0D8', // warm border that sits with the cream

  // --- status ------------------------------------------------------------
  // `success` is deliberately bluer and more saturated than `primary`.
  // A success state that is the same green as every primary button reads as
  // decoration rather than as feedback.
  success: '#1E7A46', // 5.35:1 white, 5.08:1 cream
  'success-soft': '#E4F1E9', // success text on it: 4.60:1
  warning: '#9E5C08', // 5.27:1 white, 5.00:1 cream
  'warning-soft': '#FDF3E4', // warning text on it: 4.79:1
  danger: '#B3261E', // 6.54:1 white, 6.21:1 cream
  'danger-soft': '#FBEAE8', // danger text on it: 5.61:1
};

/**
 * Font family names, per script and weight.
 *
 * These strings are the keys the fonts are registered under by `useFonts`,
 * and they must match the export names of the @expo-google-fonts packages
 * exactly — `useFonts({ NotoSans_400Regular })` registers the family under
 * the literal name "NotoSans_400Regular".
 *
 * Two families are needed because Noto Sans has no Devanagari coverage. If a
 * Devanagari string is rendered in a Latin-only family, Android falls back to
 * whatever the OEM ships, which is exactly the inconsistency we are avoiding.
 * `<Text>` in src/Text.tsx picks the family from the active script; nothing
 * else should set a font family.
 */
const fontFamilies = {
  latin: {
    regular: 'NotoSans_400Regular',
    medium: 'NotoSans_500Medium',
    semibold: 'NotoSans_600SemiBold',
    bold: 'NotoSans_700Bold',
  },
  devanagari: {
    regular: 'NotoSansDevanagari_400Regular',
    medium: 'NotoSansDevanagari_500Medium',
    semibold: 'NotoSansDevanagari_600SemiBold',
    bold: 'NotoSansDevanagari_700Bold',
  },
};

module.exports = { brandColors, fontFamilies };
