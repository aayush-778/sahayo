/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 requires Tailwind v3 — pinned to 3.4.x. See CLAUDE.md.
  //
  // The ui-native glob is load-bearing: className written inside
  // packages/ui-native is only compiled if Tailwind scans it from HERE. If it
  // is dropped, shared components silently lose their styles.
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui-native/src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Brand palette derived from brand/sahayo-emblem.png. See CLAUDE.md.
      //
      // NOTE: this file must stay byte-identical between apps/customer and
      // apps/worker, so both carry the full palette even when only one app
      // currently renders it.
      colors: {
        brand: {
          // The logo's own greens (#659A49, #8CB64A) fail WCAG AA against
          // white button text (3.35:1 and 2.36:1). `primary` is #659A49
          // darkened until it clears 4.5:1, so it still reads as the logo's
          // green while remaining accessible.
          primary: '#4F8233',
          'primary-dark': '#416B2A',
          'primary-soft': '#E4EFDA',
          'primary-tint': '#F1F7EA',
          leaf: '#659A49',
          'leaf-light': '#8CB64A',
          navy: '#113B5E',
          teal: '#4B8C96',
          cream: '#FBF9F3',
          surface: '#FFFFFF',
          muted: '#5B6B7A',
          border: '#E3E0D8',
          danger: '#B3261E',
        },
      },
    },
  },
  plugins: [],
};
