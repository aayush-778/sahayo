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
    extend: {},
  },
  plugins: [],
};
