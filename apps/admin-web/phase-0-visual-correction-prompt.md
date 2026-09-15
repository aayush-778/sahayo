# Phase 0 visual correction — paste this into Claude Code now

Phase 0 already ran. This corrects the shell in place. Don't re-scaffold, don't start Phase 1.

```
Phase 0 correction only. The shell is built but three things are wrong.
Fix them in place. Do not build any feature page. Do not start Phase 1.
Stop at the gate and report.

## Problem 1 — the background reads as flat dirty beige, not warm light

The current single radial at 0% 0% spreads one uniform wash across the
whole canvas, and the sidebar is a white panel against it, which inverts
the depth relationship.

Replace the background entirely. One fixed, pointer-events-none, z-0
element covering the viewport, with three stacked layers:

  background-color: #FDF9F0;
  background-image:
    radial-gradient(900px circle at 12% -5%,
      rgba(245,184,20,0.22) 0%, rgba(245,184,20,0.08) 35%, transparent 68%),
    radial-gradient(1100px circle at 95% 8%,
      rgba(254,243,212,0.55) 0%, transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,0.55) 0%,
      rgba(255,255,255,0) 45%);

Update --ground to #FDF9F0. --surface stays #FFFFFF.

Then fix the surface relationship. Sidebar, header and main must ALL be
bg-transparent, sitting on the same cream ground, separated only by
hairline borders. Remove the white panel behind the sidebar and header.
Cards are the only white surfaces in the product. A white sidebar against
a cream canvas is what makes the current screen look unfinished.

Soften the card shadow to match:
  boxShadow.card = '0 1px 2px rgba(31,27,22,0.04), 0 8px 24px rgba(31,27,22,0.06)'
  borderRadius.card = 20px  (down from 24px)

## Problem 2 — typography reads as generic dashboard

Add Outfit via next/font/google as --font-display (weights 400/500/600,
subset latin, display swap). Keep Plus Jakarta Sans as --font-sans.
Two families, strictly separated jobs:

  Outfit             headings, page titles, card titles, and every large
                     display number. Geometric and round.
  Plus Jakarta Sans  body, tables, labels, buttons, form controls.

Apply this scale and these weights exactly — the weights are the fix, not
a suggestion:
  Page title      30px / Outfit 500 / tracking -0.02em
  Hero metric     40px / Outfit 500 / tracking -0.03em / tabular
  Card title      17px / Outfit 500 / tracking -0.01em
  Body            14.5px / Jakarta 400 / line-height 1.55
  Table cell      13.5px / Jakarta 400
  Label, pill     12px / Jakarta 500

font-weight 700 is now banned across the entire product. Grep for
font-bold and weight 700 and remove every instance. Emphasis comes from
size and colour. The current "Dashboard" title at 700 with default
tracking is exactly the generic voice we're avoiding.

## Problem 3 — the shell has three template tells

  a. The sidebar group labels MENU / PEOPLE / MONEY / INSIGHT are
     tracked-out uppercase eyebrows — the most recognisable generated-UI
     signature there is. Delete all four. Keep the grouping, but separate
     groups with 20px of space and a hairline rule. The icons and ordering
     already communicate the structure.

  b. The nav is too airy. Tighten to 40px item height, 2px gap between
     items, 12px horizontal padding. Active item keeps the marigold-tint
     pill but the icon should also go marigold, not ink.

  c. A grey system scrollbar is visible down the middle of the layout.
     Hide scrollbars visually while keeping scroll functional:
     scrollbar-width: none plus ::-webkit-scrollbar { display: none }
     on <main> and the sidebar nav.

## Problem 4 — rewrite EmptyState

The current placeholder is a large centered rounded card floating in the
middle of the viewport with a centered icon tile and two centered lines.
That shape is a generated-UI cliché and it will propagate into every
feature page that uses the primitive.

Rewrite EmptyState as: left-aligned, inline at the top of the region it
belongs to, max-width 420px, no card wrapper, no icon tile. A 15px ink
line of direction, a 13.5px muted line of detail, one action button.
Update the four placeholder pages to use it.

## Gate
  pnpm --filter @sahakar/admin-web build passes
  grep -rn "font-bold\|font-weight: *700\|MENU\|PEOPLE\|INSIGHT" src → nothing
  Sidebar and header are transparent; only cards are white
  No visible scrollbar anywhere in the layout
  Screenshot at 1280x720: the canvas shows a marigold bloom in the upper
  left falling off to warm cream, not a uniform beige field
```

## After it runs

Check one thing by eye: put a white card on the canvas and confirm it clearly separates from the background. If the card and the ground look like the same colour, the cream base is too light — push `#FDF9F0` toward `#FCF6EA`. That contrast is the entire effect.
