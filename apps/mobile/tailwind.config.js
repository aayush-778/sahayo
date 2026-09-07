/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 requires Tailwind v3 — pinned to 3.4.x. See CLAUDE.md.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
