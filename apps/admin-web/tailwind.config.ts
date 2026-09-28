import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * Tailwind v3 classic config, pinned to 3.4.x monorepo-wide so the mobile apps
 * can run NativeWind v4 on the same major. See docs/engineering-decisions.md "Pinned versions".
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
         * colour plugin emits last — which silently replaced the warm card
         * shadow with a white one. `shadow-card` is load-bearing on every card
         * in the product, so the colour alias lost. Cards use `bg-surface`.
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
        /*
         * Two families, and their jobs do not overlap.
         *
         * `display` (Outfit) is geometric and round. It carries headings, page
         * and card titles, and every large display number — that roundness set
         * at weight 500 is what produces the warmth.
         *
         * `sans` (Plus Jakarta Sans) carries body, tables, labels, buttons and
         * form controls, where Outfit's wide geometry would cost density.
         *
         * There is no third family and no Devanagari face; the product is
         * English throughout.
         */
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        /*
         * Permitted only for tabular figures in ledgers and on chart axes. This
         * is the platform monospace stack, NOT a third webfont.
         */
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        /*
         * The scale. Each entry names its family and its weight, because the
         * weights are deliberate, not defaults — see the weight ban below.
         */
        /* 12px / Jakarta 500 — labels, pills, table headers */
        pill: ['0.75rem', { lineHeight: '1rem' }],
        /* 13.5px / Jakarta 400 — table cells */
        table: ['0.84375rem', { lineHeight: '1.15rem' }],
        /* 14.5px / Jakarta 400 — body */
        body: ['0.90625rem', { lineHeight: '1.55' }],
        /* 17px / Outfit 500 / -0.01em — card and section titles */
        'card-title': ['1.0625rem', { lineHeight: '1.4rem', letterSpacing: '-0.01em' }],
        /*
         * 24px / Outfit 500 / -0.02em — supporting stat figures.
         *
         * The brief's scale jumps from a 17px card title to the 40px hero with
         * nothing between, and a supporting StatBlock needs to read as a figure
         * rather than as a heading. This is the one step added to the scale.
         */
        stat: ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.02em' }],
        /* 30px / Outfit 500 / -0.02em — the page title in the header */
        'page-title': ['1.875rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        /* 40px / Outfit 500 / -0.03em / tabular — the one hero metric per page */
        hero: ['2.5rem', { lineHeight: '2.75rem', letterSpacing: '-0.03em' }],
      },
      fontWeight: {
        /*
         * 400, 500 and 600 are the whole range. Weight 700 is banned across the
         * product: emphasis comes from size and colour, and a 700 display title
         * at default tracking is the generic dashboard voice we are avoiding.
         * `font-bold` is therefore not available — Tailwind's `bold` key is
         * overridden to 600 so a stray use degrades instead of breaking the look.
         */
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '600',
      },
      borderRadius: {
        card: '20px',
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
         * shadow and a wide ambient one, both soft enough that a white card
         * separates from the cream canvas by colour first and shadow second. A
         * pure-black shadow colour is banned — it reads grey and cold here.
         */
        card: '0 1px 2px rgba(31,27,22,0.04), 0 8px 24px rgba(31,27,22,0.06)',
      },
      spacing: {
        /* Sidebar nav item height. Tight on purpose; airy nav reads template-like. */
        nav: '2.5rem',
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
