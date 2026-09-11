import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * Tailwind v3 classic config, pinned to 3.4.x monorepo-wide so the mobile apps
 * can run NativeWind v4 on the same major. See CLAUDE.md "Pinned versions".
 *
 * Every colour here resolves to a custom property declared in
 * src/styles/tokens.css. Nothing in this file is a literal colour, and no
 * component may introduce one. `darkMode` is absent on purpose — the admin
 * portal has no dark theme.
 */
const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* --- Sahayo semantic tokens --- */
        ground: 'hsl(var(--ground))',
        surface: 'hsl(var(--surface))',
        marigold: {
          DEFAULT: 'hsl(var(--marigold))',
          tint: 'hsl(var(--marigold-tint))',
        },
        'marigold-tint': 'hsl(var(--marigold-tint))',
        'fund-green': 'hsl(var(--fund-green))',
        coral: 'hsl(var(--coral))',
        lavender: 'hsl(var(--lavender))',
        ink: 'hsl(var(--ink))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        hairline: 'hsl(var(--hairline))',

        /* --- shadcn aliases, all pointing at the tokens above --- */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        /*
         * There is deliberately NO `card` colour here. `boxShadow.card` and a
         * colour named `card` both generate a `.shadow-card` rule, and the
         * colour plugin emits last — which silently replaced the warm two-layer
         * card shadow with a white one. `shadow-card` is load-bearing on every
         * card in the product, so the colour alias lost. Cards use `bg-surface`.
         */
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        /* Plus Jakarta Sans is the entire typographic system. One family. */
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        /*
         * Permitted only for tabular figures in ledgers and on chart axes. This
         * is the platform monospace stack, NOT a second webfont — a second
         * loaded family is a layout-shift risk and the fastest route back to a
         * templated look. See CLAUDE.md.
         */
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        /* The scale. Anything outside it needs a reason. */
        pill: ['0.75rem', { lineHeight: '1rem' }] /* 12px */,
        table: ['0.8125rem', { lineHeight: '1.125rem' }] /* 13px */,
        body: ['0.9375rem', { lineHeight: '1.45rem' }] /* 15px */,
        section: ['1.5rem', { lineHeight: '1.875rem' }] /* 24px */,
        hero: ['2.25rem', { lineHeight: '2.5rem' }] /* 36px */,
      },
      borderRadius: {
        card: '24px',
        tile: '12px',
        pill: '999px',
        /* shadcn's scale, rebased on --radius. */
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        /*
         * The only shadow in the product. Warm ink, two layers: a tight contact
         * shadow and a wide ambient one. A pure-black shadow colour is banned —
         * it reads grey and cold against the paper ground.
         */
        card: '0 1px 3px rgba(31,27,22,0.03), 0 12px 32px rgba(31,27,22,0.05)',
      },
      transitionDuration: {
        /* Page and panel transitions stay under the 200ms demo budget. */
        DEFAULT: '160ms',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
