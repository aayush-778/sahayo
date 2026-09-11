# Sahayo — Cooperative Gig Services Platform

SIH26089 (Ministry of Cooperation). pnpm workspaces + Turborepo monorepo,
package scope `@sahayo/*`.

- `apps/admin-web` — Next.js 15 (App Router), Tailwind, shadcn/ui
- `apps/backend` — Node.js, Express, Socket.io, TypeScript
- `apps/customer` — Expo Router + NativeWind, customer-facing app
- `apps/worker` — Expo Router + NativeWind, worker-facing app
- `packages/shared` — TypeScript types, zod schemas, socket event contract
- `packages/ui-native` — shared React Native primitives for both mobile apps

## Two mobile apps, not one

There is no single mobile app and no role picker. `apps/customer` and
`apps/worker` are independent Expo apps with independent `app.json` files.

The reason is **permissions**. The worker app needs background location and
push notifications; the customer app must not ask for either. Separate Expo
configs mean separate native permission manifests, so the customer app can
never request a permission it has no business requesting. It also matches the
demo: two phones, two distinct apps, nothing to fumble on stage.

Permissions are **declared** in each `app.json` and nothing requests them yet.
`expo-location` and `expo-notifications` are deliberately not installed — their
config plugins modify native manifest generation at prebuild, and we do not
want that running for libraries we will not touch until Phase 5. Install them
in the phase that uses them.

| | customer | worker |
| --- | --- | --- |
| Metro port | **8081** | **8082** |
| package | `@sahayo/customer` | `@sahayo/worker` |
| android package id | `in.sahayo.customer` | `in.sahayo.worker` |
| location | foreground only | foreground **and** background |
| notifications | no | `POST_NOTIFICATIONS` |

### apps/worker is a clone of apps/customer

`apps/worker` was produced by copying `apps/customer`, not by running
`create-expo-app`. A fresh scaffold would not carry the Metro `blockList` fix,
the React 19.2.3 pin, or the NativeWind babel wiring that Phase 1 established.

**Consequence: `metro.config.js`, `babel.config.js`, `tailwind.config.js`,
`global.css`, `nativewind-env.d.ts` and `assets.d.ts` are byte-identical between
the two apps and must stay that way.** Any change to one must be applied to the other.
Verify with:

```bash
for f in metro.config.js babel.config.js tailwind.config.js \
         global.css nativewind-env.d.ts assets.d.ts; do
  diff "apps/customer/$f" "apps/worker/$f" || echo "DRIFT: $f"
done
```

Both must print nothing. Only `package.json` and `app.json` may differ, and
only in app identity, port, and permissions.

## Pinned versions — do not upgrade

These are load-bearing. Each was chosen against a specific failure, and they
are mutually dependent — moving any one of them breaks at least one other.

| Pin | Reason |
| --- | --- |
| `tailwindcss` **3.4.x** | NativeWind v4 requires Tailwind v3; NativeWind v5 is preview only. Pinned in **both** apps — two majors of `tailwindcss` under a hoisted node_modules is a resolution hazard. |
| `nativewind` **v4** | v5 needs RN 0.81+, the New Architecture and Reanimated v4+. Not acceptable risk on this timeline. |
| `shadcn` **2.10.0** | Last Radix-based, Tailwind-v3-native CLI. shadcn 3.x and 4.x emit Tailwind v4 only (`@import "shadcn/tailwind.css"`, `ring-3`, `not-aria-[…]`, `color-mix(in oklch, …)`) and hard-fail the build on Tailwind 3.4. |
| `next` **15.5.4** | Pairs with shadcn 2.10, which predates Next 16 entirely. Next 15 + shadcn 2.10 + Tailwind 3.4 + React 19 is a heavily travelled combination; Next 16 + a two-major-old shadcn CLI is not. |
| pnpm `nodeLinker: hoisted` | Lives in **`pnpm-workspace.yaml`, NOT `.npmrc`** — since pnpm 10+, `.npmrc` is **silently ignored** for this setting. Metro cannot resolve through pnpm's symlinked layout. Verify with `pnpm config get node-linker`, which must print `hoisted`. |
| `react` / `react-dom` **19.2.3** | Forced workspace-wide via `overrides` in `pnpm-workspace.yaml`. Expo SDK 57 pins 19.2.3; admin-web was on 19.1.0 and the hoisted linker produced two React copies bound to different `react-dom` instances, failing prerender with "Cannot read properties of null (reading 'useRef')". React must be a single instance. |
| `typescript` **5.x** | Expo SDK 57 asks for `~6.0.3`; we stay on 5.9.3 deliberately. Next 15 and `eslint-config-next` target TS 5. `expo install --check` will keep reporting this — it is accepted, not an oversight. |

`create-next-app@latest` now scaffolds Next 16 + Tailwind v4. Both must be
downgraded immediately after scaffolding. Do not "fix" this by upgrading.

## `packages/shared` ships TypeScript source

No build step, no `dist`. Consumed by Next.js via `transpilePackages`, by
Metro via hoisted resolution, by the backend via `tsx`. Do not add a build
step to the dev loop.

Types and zod schemas are kept in sync by a `satisfies z.ZodType<T>` assertion
on every schema — drift is a compile error, not a runtime surprise.

## pnpm build scripts

pnpm 12 blocks postinstall scripts unless listed under `allowBuilds` in
`pnpm-workspace.yaml`. Currently allowed: `esbuild` (tsx needs its binary),
`sharp` (Next image optimization), `unrs-resolver` (eslint-config-next).

## Known and accepted

- **The mobile apps are Android/iOS only, by design.** `app.json` declares
  `"platforms": ["android", "ios"]`. Expo Router will fail a web bundle with
  `Unable to resolve module react-native-web/dist/index`. That is expected.
  **Do not install `react-native-web`, `react-dom`, or `@expo/metro-runtime`
  to silence it.** Adding `react-dom` to a React Native app reopens the
  duplicate-React failure that broke admin-web's prerender
  (`Cannot read properties of null (reading 'useRef')`). If web support is ever
  genuinely wanted, discuss the React version implications first — it is not a
  change to make in passing. The demo runs on physical Android phones mirrored
  via scrcpy.
- `typescript` stays on 5.x although Expo SDK 57 asks for `~6.0.3`.
  `expo install --check` will keep reporting it. Accepted, not an oversight.
- `@react-native/metro-config` resolves to 0.87.1 where 0.86.3 is wanted. No
  observed effect on bundling, typecheck or export.

## Brand assets

Source of truth lives in `brand/`:

- `sahayo-logo.jpeg` — the original supplied artwork (1318×1391)
- `sahayo-emblem.png` — the same emblem trimmed, squared, and with the cream
  knocked out to transparency at 5% fuzz. **Every icon is generated from this
  file.** 5% is deliberate: at 8% the knockout starts eating the pale leaf
  highlights (`#EFFFD2`), which sit only ~8% away from the paper cream.

The emblem carries no wordmark — "SAHAYO" is illegible at launcher size and
Android renders the app name under the icon anyway.

### The two apps are colour-coded on purpose

Both phones are on the table during the demo, so the icons must be
distinguishable at a glance. Same emblem, different ground:

| | ground | derivation |
| --- | --- | --- |
| customer (`Sahayo`) | `#FBF9F3` | the artwork's own paper cream — the dominant colour in its histogram by ~10× |
| worker (`Sahayo Partner`) | `#A9CBD8` | the interlocked hands `#4B8C96`, lightened ~52% |

Separation is by **hue (warm vs cool), not lightness**. A dark ground was
rejected: the trunk and roots are navy `#113B5E` and would disappear into it.
Navy holds 11.0:1 on the cream and 6.75:1 on the teal.

Display names follow the Urban Company / Swiggy convention — `Sahayo` and
`Sahayo Partner`, not two builds of the same name.

### Regenerating icons

Four files per app, all 1024×1024, from `brand/sahayo-emblem.png`:
`icon.png` (emblem at 800px on the ground), `android-icon-foreground.png`
(620px on transparency, inside the 66% adaptive safe zone),
`android-icon-background.png` (flat ground), `android-icon-monochrome.png`
(black silhouette, written as `PNG32:` with `-strip` — otherwise ImageMagick
emits a grayscale PNG carrying an RGB ICC profile and every build warns).

Changing a ground colour means changing `android-icon-background.png` **and**
`android.adaptiveIcon.backgroundColor` in that app's `app.json`.

### UI palette

The `brand.*` colours live in each app's `tailwind.config.js` (identical in
both, even though only the customer app renders them yet):

| token | hex | note |
| --- | --- | --- |
| `brand-primary` | `#4F8233` | the logo's mid green `#659A49`, darkened until white text clears WCAG AA (4.59:1). **The logo's own greens fail**: `#659A49` is 3.35:1 and `#8CB64A` is 2.36:1 against white. |
| `brand-primary-soft` | `#E4EFDA` | disabled button ground |
| `brand-navy` | `#113B5E` | headings and input text, 11.0:1 on cream |
| `brand-muted` | `#5B6B7A` | labels and helper text, 5.2:1 on cream |
| `brand-cream` | `#FBF9F3` | screen background, the artwork's paper tone |
| `brand-border` | `#E3E0D8` | warm border that sits with the cream |

`assets.d.ts` declares `*.png` and friends. Expo SDK 57 ships no such
declaration, and the `expo-env.d.ts` that would provide one is generated at
dev-server start **and gitignored** — so without this file `tsc --noEmit`
passes locally and fails on a clean clone.

## Admin portal design system

`apps/admin-web` has a fixed visual language. It is written down in
`src/styles/tokens.css` and `tailwind.config.ts` so it is enforced by the build
rather than by asking nicely each session. The portal is English throughout.

### The palette is nine tokens. There is no tenth.

| Token | Hex | The only thing it is for |
| --- | --- | --- |
| `--ground` | `#FFFDFB` | Page background. Warm paper, never pure white. |
| `--surface` | `#FFFFFF` | Elevated cards sitting on the ground. |
| `--marigold` | `#F5B814` | Primary actions, active nav, the hero metric. |
| `--marigold-tint` | `#FEF3D4` | Icon tiles, the page radial glow, active row wash. |
| `--fund-green` | `#34C77B` | Cooperative Fund, positive deltas, verified KYC. Nothing else. |
| `--coral` | `#FF8B72` | Chart series 2, warnings, reject actions. Never a button fill. |
| `--lavender` | `#A78BFA` | Chart series 3. |
| `--ink` | `#1F1B16` | Type. Pure `#000000` is forbidden. |
| `--muted` | `#8A8279` | Secondary text, table headers, inactive states. |
| `--hairline` | `#F0E9DD` | Every component border. Replaces heavy shadows. |

Values are stored as **bare HSL triplets**, not hex and not `oklch()`, because
Tailwind 3.4 consumes them as `hsl(var(--token))`. An `oklch()` value there
yields `hsl(oklch(...))` — invalid CSS that browsers drop without an error, so
the page renders colourless and nothing in the build complains.

shadcn's own token names (`--primary`, `--muted-foreground`, `--border`, …) are
aliased onto these in `globals.css`. There is no parallel neutral scale, and any
shadcn component added later inherits the warm palette for free.

### Hard constraints — permanent

- Never pure `#000000` or pure `#FFFFFF` as a page background.
- Terracotta / clay (`#D97757` and its neighbours) is banned.
- **No dark mode.** `darkMode` is absent from `tailwind.config.ts` and there is
  no `.dark` block in `globals.css`. Do not reintroduce either.
- No glassmorphism, no neon, no multi-stop or decorative gradients. The one
  gradient in the product is the fixed page glow in the `.page-glow` utility.
- No `box-shadow` using `rgba(0,0,0,*)`. The only shadow is `shadow-card`, whose
  two layers use warm ink — cold grey shadows fight the paper ground.
- Never four identically sized stat cards in a row. It is the single biggest
  slop tell. Vary the grid spans and vary `StatBlock`'s `emphasis`.
- No tracked-out ALL-CAPS eyebrow label above a heading. Uppercase appears in
  exactly two places: sidebar group labels and table headers.
- No emoji. `lucide-react` only, **18px at stroke 1.5**, each in a 12px-radius
  tinted tile whose tint follows the subject's semantic role.
- Monospace is for tabular financial figures and chart axes. Nowhere decorative.
- **One typeface.** Plus Jakarta Sans, loaded once on `<html>`. A second webfont
  is a layout-shift risk and the fastest route back to a templated look; the
  `font-mono` stack is the platform's, not a second download. Refuse requests to
  add a family.
- No hardcoded hex in any component. `tokens.css` is the only place a colour is
  written. Verify with
  `grep -rniE "#[0-9a-f]{6}" apps/admin-web/src/components`.
- The window never scrolls. `html` and `body` are `h-full overflow-hidden`; only
  `<main>` in `src/app/(admin)/layout.tsx` scrolls.

### After every `shadcn add`, grep for oklch

```bash
grep -rn "oklch" apps/admin-web/src
```

Must print nothing. shadcn 2.10's registry serves Tailwind-v4 colour values by
default and they fail invisibly against this app's v3 config. The portal's
`dropdown-menu` was written by hand on top of `@radix-ui/react-dropdown-menu`
for exactly this reason — prefer that over pulling a registry component whose
emitted CSS then has to be converted.

### Type scale

36px tabular hero metric / 24px section titles / 15px body / 13px table text /
12px pills. Exposed as `text-hero`, `text-section`, `text-body`, `text-table`,
`text-pill`. The `.tabular` utility sets `tnum` and is required on every rupee
figure so columns align and a live number does not jitter.

### Copy

Plain, warm, human. "Workers were paid ₹4,20,000 this week", never "disbursement
volume". Banned vocabulary: *utilisation*, *fund utilisation*, *capital
deployment*, *resource allocation*, *stakeholder value*, *leverage*, *synergy*.
Every button label is a verb naming its effect ("Approve worker", not "Submit"),
and the toast that follows uses the same word. Never append "→" to a label.
Every empty state says why it is empty and what would fill it.

## Scripts

| Command | Effect |
| --- | --- |
| `pnpm dev` | backend + admin-web + both mobile apps. Interactive Metro keystrokes (`a`, `i`, `r`) are unreliable under turbo's multiplexed output — see below. |
| `pnpm dev:backend` | Express + Socket.io on `:4000` |
| `pnpm dev:admin` | Next.js on `:3000` |
| **`pnpm dev:customer`** | **Expo / Metro on `:8081` — use this for customer-app work** |
| **`pnpm dev:worker`** | **Expo / Metro on `:8082` — use this for worker-app work** |
| `pnpm typecheck` | `tsc --noEmit` across all packages |
| `pnpm lint` | eslint across all packages |

For day-to-day mobile work run `pnpm dev:customer` and `pnpm dev:worker` in
separate terminals. `pnpm dev` is for bringing the whole stack up at once;
Metro's interactive keystrokes do not survive turbo's output multiplexing.

- **No Co-Authors:** Never append `Co-authored-by` or any AI attribution metadata to commit messages.
