/**
 * The shared Sahayo Tailwind preset.
 *
 * Both mobile apps consume this so the token set cannot drift between them —
 * `apps/customer/tailwind.config.js` and `apps/worker/tailwind.config.js` are
 * required by CLAUDE.md to stay byte-identical, and a preset is what makes
 * that a one-line file rather than a palette copied twice.
 *
 * Colour values live in ./tokens.js, which TypeScript also reads. Do not
 * write a hex literal here.
 */
const { brandColors, fontFamilies } = require('./tokens');

/**
 * Every step is exactly 1.5x leading.
 *
 * Devanagari conjuncts (कृ, क्ष, त्र) stack a subscript form below the
 * baseline and reach above the shirorekha. Tailwind's default leading is
 * tighter than 1.5 from `text-lg` upward, which clips them on Android. Fixing
 * it in the scale means every `text-*` class is safe by construction and no
 * screen has to remember a `leading-*` override.
 */
const fontSize = {
  xs: ['12px', '18px'],
  sm: ['14px', '21px'],
  base: ['16px', '24px'],
  lg: ['18px', '27px'],
  xl: ['20px', '30px'],
  '2xl': ['24px', '36px'],
  '3xl': ['30px', '45px'],
  '4xl': ['36px', '54px'],
  '5xl': ['48px', '72px'],
};

/**
 * `font-latin`, `font-latin-bold`, `font-deva`, `font-deva-bold`, ...
 *
 * Deliberately NOT named `font-bold` / `font-medium`: those already exist in
 * Tailwind core as font-WEIGHT utilities, and defining a family under the
 * same class name would emit two rules with the same selector whose order is
 * not something we control.
 */
const fontFamily = {
  latin: [fontFamilies.latin.regular],
  'latin-medium': [fontFamilies.latin.medium],
  'latin-semibold': [fontFamilies.latin.semibold],
  'latin-bold': [fontFamilies.latin.bold],
  deva: [fontFamilies.devanagari.regular],
  'deva-medium': [fontFamilies.devanagari.medium],
  'deva-semibold': [fontFamilies.devanagari.semibold],
  'deva-bold': [fontFamilies.devanagari.bold],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: { brand: brandColors },
      fontFamily,
      fontSize,
    },
  },
};
