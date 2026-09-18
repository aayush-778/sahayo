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

## Admin portal data architecture

The admin portal runs on a deterministic in-memory dataset behind a service
layer. That layer is the seam the real backend swaps into, and the rules below
exist to keep it a seam rather than a suggestion.

### Components call services. Nothing else.

```
src/lib/seed      deterministic dataset   <- only the store reads this
src/lib/store     zustand, the database   <- only services read this
src/lib/services  async functions         <- the UI reads ONLY this
```

`src/lib/seed` is a one-line re-export of `@sahayo/shared/seed`, where the generator
lives, so the backend builds exactly the dataset the portal shows. The lint rule
blocks `@sahayo/shared/seed` in the UI too; only `@sahayo/shared/seed/clock`, which
carries no data, is open, and `src/lib/dates.ts` re-exports it.

A React component imports from `@/lib/services` and never from `@/lib/store`,
`@/lib/seed`, or `zustand` directly. This is enforced by `no-restricted-imports`
in `apps/admin-web/eslint.config.mjs`, so a violation fails lint — the comment
asks, the rule refuses.

The reason is the swap: when the backend lands, a service function's body changes
from "filter this array" to "fetch this endpoint" and every page keeps working. A
component reading the store would be the one call site to rewrite, and the one
that silently stops updating when something else changes the data.

The other half: **mutating services write through the store.** That is what makes
`approveKyc(id)` update the badge in the Workers directory, the verification
queue's count, and the dashboard's verification stat in the same instant — all
three read derived state from the one store.

### The seed is deterministic, and must stay that way

Nothing under `packages/shared/src/seed` may call `Math.random()`, `Date.now()`, or `crypto`.
Every figure comes from `createRng(seed)`, and every date is computed backwards
from the fixed `SEED_NOW` constant. A dataset that drifts with the wall clock is
not deterministic: "12,000 bookings over 90 days" would silently re-bucket overnight
and the charts would change shape between the rehearsal and the room.

Each collection draws from **its own seed** in `SEEDS`. With one shared stream,
adding a worker would shift every booking, ledger entry and dispute after it.

`buildSeedDataset()` is idempotent and byte-identical across calls, which is what
the "Reset demo data" action relies on.

### One dataset, three apps: the demo cast

The mobile apps are demonstrated with named people and the portal with generated
ones, and all three must show the same platform. `packages/shared/src/seed/demo-cast/`
holds the one copy of the named records — the customer app's 48 workers and its demo
customer, the worker app's partner (Suresh Yadav, `wrk_suresh`) and his 12 customers,
the addresses, and the 22 hand-written bookings — importable as
`@sahayo/shared/seed/cast` without loading the generator. The mobile apps' `mocks/`
re-export them; the seed lays them over its generated records in `cast-overlay.ts`, so
Ramesh Kumar is `wrk_ramesh` in all three apps.

- Hand-written bookings are written against a `CastClock`: the apps pass
  `createDeviceClock(Date.now)`, the seed `createAnchoredClock(SEED_NOW)`.
- A cast worker keeps their identity, trades, position, availability and verification;
  the generated member they replace supplies ratings, job counts, earnings and equity.
- The overlay asserts itself on every build: every cast id present under its own name,
  no generated record sharing a cast name, and the fund balance unchanged to the paisa.
- Trades are the catalogue's ten worker types (`WorkerCategory`, mapped to `cat_*` ids
  by `CATEGORY_ID_BY_WORKER_CATEGORY`). Label them with `workerCategoryLabel`, never by
  re-casing the constant.
- The priced item catalogue is `@sahayo/shared/service-items`, kept off the package root
  so the worker app does not bundle it.

### Money

Always `Paise` — integer minor units, never a float. The three shares come from
`WORKER_SHARE` / `PLATFORM_SHARE` / `COOP_FUND_SHARE` in
`packages/shared/src/constants.ts` and are **never written as literals** in the
portal, so it cannot tell a worker a different number than the mobile app does.
They are currently **90 / 5 / 5** and are asserted to sum to 1 at module load.

`splitAmount()` gives the rounding remainder to the cooperative fund rather than
rounding all three parts independently, because "every period's three figures sum
exactly to the gross, to the paisa" is a hard requirement of the finance page.
Rounding each part separately loses or gains a paisa on most amounts.

### The ledger is append-only

There is no function that edits or deletes a ledger entry, in the store or in the
services, and there must never be one. A correction is a **new** compensating
entry carrying `reversalOf` — the original stays byte-identical forever. Refunds,
released payouts and loan disbursements all arrive as new rows.

In the UI this means the row menu offers View booking, Copy trace ID and Issue
reversal, and nothing else. Not disabled, not permission-gated: absent. The table
header says so in a line, so an auditor sees the claim without asking. A reversal
row carries a coral left edge and "Reversal of #xxxx"; its original shows
"Reversed by #yyyy". Both links are derived from `reversalOf` — neither row is
written again to create them.

`issueReversal` refuses, with a reason, to reverse a row twice, to reverse a
reversal, to reverse without a written reason, and to reverse a payout that has
already reached a bank.

**Status is derived, never stored.** A row cannot hold "pending" or "released",
because changing that field would be changing the row. Releasing a worker payout
to the bank appends a `PAYOUT_RELEASE` row carrying `releaseOf` — the same pattern
as `reversalOf` — and "released" means such a row exists. Any future state on a
ledger entry must follow this pattern: a new row that points back.

**A refund is four rows, and they net to zero.** The customer receives R as a
`REFUND` credit, and R is recovered from the worker, the platform and the fund as
`REFUND` debits, split by `splitAmount(R)` — the same function the booking was
split with, so the three recoveries sum to R exactly. `getSplitSummary` nets these
out of each part and out of the gross, so a refund moves the finance totals by
exactly R and a refunded period still sums to the paisa. A single customer-only
refund row would leave the finance hub's split unchanged, which misstates where
the money went. A refund is refused on a job with no posted split: money that never
moved cannot be recovered.

Verify with
`grep -rniwE "edit|delete|remove|update" apps/admin-web/src/components/finance`,
which must print nothing. Use `-w`: without it the grep matches `CREDIT`.

### The cooperative fund keeps one record, not two

`packages/shared/src/seed/fund-programmes.ts` is the single source for what the members have
voted on and what the fund has spent. A PASSED programme produces the ledger
disbursement for exactly the amount approved, dated just after its vote closed;
nothing else in the seed spends from the fund. The proposals and the ledger used to
be written separately and contradicted each other — a paid health insurance premium
beside a health insurance vote still open — on the one page where members' decisions
and the fund's spending are read side by side. Add a programme there, never directly
to the ledger or the proposals.

Each proposal carries one `ProposalBallot` per member who voted, and `votesFor` /
`votesAgainst` always equal the ballots counted by direction. Ballots are what make
"each member votes once" enforceable and what the breakdown by trade and zone is
counted from. Administrators record votes on a named member's behalf; `castVote`
refuses a second vote from the same member rather than replacing the first.

Contributions from before the 90-day booking window are carried over as one ledger
row per month, not one lump, so the fund's twelve-month chart grows the way a fund fed
by every booking does instead of jumping by lakhs in a single month.

### Settings are live, and changing them is recorded

`constants.ts` holds the split and the dispatch weights the cooperative launched with.
The portal opens on exactly those (`src/lib/seed/settings.ts` derives its defaults from
them), but Settings can change them for the session, so services never read the
constants directly for anything a setting controls. They read
`currentSplitShares()`, `currentEquityWeights()` and `currentDispatchSettings()` from
`settings.service.ts`, and pass the result to `splitAmount` / `computeEquityScore`.

- A split change applies to bookings paid from then on. Nothing already in the ledger
  is re-split, and a refund recovers money in the proportion that booking was actually
  paid, read from its own ledger rows.
- Past-period figures show the ratio that period was paid at, computed from its totals,
  not the split in force now.
- Changing the split never saves on slider release. It opens a dialog that computes the
  consequence in rupees and refuses until `CONFIRM` is typed; `applySplitChange`
  enforces the word server-side too. Do not add a shortcut around this.
- Every settings write goes through the store's `applySettings(settings, change)`, which
  writes the setting and its `SettingsChange` audit row together. Changing the dispatch
  weights recomputes every worker's stored equity score in the same write.

### Compliance exports never carry Aadhaar data

`compliance.service.ts` builds the CRCS datasets from the same collections every page
reads. No export may contain an Aadhaar number, masked form, `aadhaarRef` or last four:
the audit log records that a reveal happened, by whom and for what purpose, and nothing
about the number. CSV cells opening with `= + - @` are prefixed with an apostrophe so a
free-text note cannot become a spreadsheet formula.

### UIDAI Circular 14 of 2025 — Aadhaar

These rules have legal force. They override design and convenience. The five
numbered rules below are verbatim from the build brief and must not be reworded.

1. No Aadhaar number is ever stored in localStorage, sessionStorage,
   IndexedDB, Zustand, React state, a URL, or a log. The store holds a
   reference key only.
2. Aadhaar always renders masked: XXXX-XXXX-4567. The masked form is the
   default and the only persistent representation.
3. A "Reveal" button calls kyc.service.revealAadhaar(id, purpose). It
   first requires selecting a purpose from a dropdown, then writes an
   audit record (admin id, timestamp, worker id, purpose), then shows the
   full value for 30 seconds with a visible countdown, then clears it
   from memory. It is never written to state that survives that window.
4. Hashing Aadhaar numbers is banned. Routes use UUIDs
   (/workers/[uuid]), never anything Aadhaar-derived.
5. Add an "Access log" tab listing every reveal event with admin,
   timestamp, worker, and stated purpose. This is the auditability proof
   an evaluator will ask for.

How the code meets them:

- **Rules 1 and 3 together.** Rule 1 forbids React state outright; rule 3 allows
  the value on screen for 30 seconds. `AadhaarReveal` satisfies both by writing
  the value straight into one text node through a ref and wiping it when the
  window ends or the component unmounts. React state holds only the countdown.
  **Every Aadhaar field in the product must use `AadhaarReveal`** — an earlier
  profile tab kept the value in `useState`, which broke rule 1.
- **The audit row is written before the value exists.** `revealAadhaar` appends
  to the access log synchronously, before its first `await`, so the row is there
  while the promise is still pending.
- `KycSubmission.aadhaarRef` is an opaque `aref_…` handle, `kycSubmissionSchema`
  rejects a 12-digit value in it, and only `aadhaarLast4` is ever stored. No
  component or route reads `aadhaarRef`.
- Review selection on `/verification` is page state, never the URL, so nothing
  about identity documents reaches history, a shared link or a referrer.

Verify with `grep -rnE "[0-9]{12}" apps/admin-web/src`, which must print nothing,
and `grep -rn "aadhaarRef" apps/admin-web/src/components apps/admin-web/src/app`,
which must also print nothing.

### Service conventions

Every function is `async` and awaits a 120–300ms delay, mutations included, so
loading states are real and a button has somewhere to put its pending state.
Reads return plain data; writes return the updated record. Errors carry a message
saying what went wrong **and what to do next**, because that message is what the
user sees. Mutations that a queue is worked fast are idempotent: `approveKyc`
called twice does not throw and does not double-apply.

### Street maps: MapLibre, heat spots, and the worker script

Both the dashboard's demand map (`src/components/maps/DemandMap.tsx`) and Live Dispatch
(`src/components/dispatch/DispatchMap.tsx`) are MapLibre maps on OpenStreetMap raster
tiles, with no API key. CARTO basemaps render an "API key required" watermark without an
account, so do not switch to them. Do not add Leaflet or a second map library.

- **The worker script must be served.** MapLibre 6 looks for its worker next to its own
  module file, which inside a Next bundle is not a web URL. Without help it silently
  starts the page as the worker: GeoJSON layers (worker dots, request pins) never load
  and the map never fires `load`. `scripts/copy-maplibre-worker.mjs` copies the worker
  into `public/maplibre/` (gitignored) on `predev` / `prebuild`, and
  `src/components/maps/maplibre-worker.ts` calls `setWorkerUrl`. Every component that
  creates a map imports that module first. If you run `next build` directly rather than
  `pnpm build`, run the copy script yourself.
- **Demand is drawn as heat spots**, not a WebGL heatmap layer: a CSS radial glow in
  coral / marigold / lavender plus a numbered badge per zone
  (`DemandHeatSpots.tsx`, classes in `globals.css` outside `@layer`, because the tier
  class names are built at runtime and Tailwind would strip them). Tiers are by rank
  across the twelve zones, in thirds. Numbers come from `getZoneDemand()`; never hardcode
  zone figures in a component.
- **Tile health is measured on the first basemap tile**, not on the map's `load` event.
  If none arrives within `TILE_TIMEOUT_MS`, the SVG map (`ZoneMapCanvas`) is laid over the
  street map as the offline view. The street map stays mounted underneath, so the cover
  lifts by itself if tiles arrive late. Keep `ZoneMapCanvas`: it is that fallback.

### Offline support

`public/sw.js` precaches every route listed by `/offline-manifest` (every sidebar page
and every worker profile, which are statically generated for this reason) plus the
scripts, styles and fonts their HTML references, so an airplane-mode reload renders
every page. It is registered in production builds only; test it with `next build` and
`next start`, never `next dev`. A page added to `NAV_GROUPS` is precached automatically.
The cache is named after `NEXT_PUBLIC_BUILD_VERSION`, set per build in `next.config.ts`.

## Admin portal design system

`apps/admin-web` has a fixed visual language. It is written down in
`src/styles/tokens.css` and `tailwind.config.ts` so it is enforced by the build
rather than by asking nicely each session. The portal is English throughout.

### The palette is nine tokens. There is no tenth.

| Token | Hex | The only thing it is for |
| --- | --- | --- |
| `--ground` | `#FDF9F0` | The cream canvas. Sidebar, header and `<main>` all sit on it. |
| `--surface` | `#FFFFFF` | Cards, and cards only. The one pure-white surface. |
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
- **The canvas is cream and cards are white.** The sidebar, the header and
  `<main>` are all `bg-transparent` over one fixed `.canvas` element, divided
  only by hairlines. Never give the sidebar or header a white panel: a white
  sidebar against a cream canvas inverts the depth and looks unfinished.
- No glassmorphism, no neon, no decorative gradients. The only gradients are the
  three stacked layers of `.canvas` — a marigold bloom off the top-left, a
  marigold-tint wash top-right, and a white veil down the top 45%. Three layers
  rather than one large corner radial, because a single radial spreads a uniform
  wash that reads as flat dirty beige instead of light falling on paper.
- Scrollbars are hidden via the `.scroll-hidden` utility on `<main>` and the
  sidebar nav. A grey system scrollbar down the middle of the layout breaks the
  native-app feel immediately. Scrolling itself is untouched.
- No `box-shadow` using `rgba(0,0,0,*)`. The only shadow is `shadow-card`,
  `0 1px 2px rgba(31,27,22,0.04), 0 8px 24px rgba(31,27,22,0.06)` — warm ink, and
  soft enough that a card separates from the canvas by colour first and shadow
  second. Cold grey shadows fight the cream ground. Radii: 20px structural cards
  (`rounded-card`), 12px icon tiles (`rounded-tile`), 999px pills
  (`rounded-pill`).
- Never four identically sized stat cards in a row. It is the single biggest
  slop tell. Vary the grid spans and vary `StatBlock`'s `emphasis`.
- No tracked-out ALL-CAPS eyebrow labels, anywhere. Table headers are the only
  uppercase text in the product. The sidebar's four nav groups carry **no**
  visible label — `MENU` / `PEOPLE` / `MONEY` / `INSIGHT` eyebrows are the most
  recognisable generated-UI signature there is, so the grouping is shown with 20px
  of space and a hairline rule, and each group's name survives only as an
  accessible label.
- No emoji. `lucide-react` only, **18px at stroke 1.5**, each in a 12px-radius
  tinted tile whose tint follows the subject's semantic role.
- Monospace is for tabular financial figures and chart axes. Nowhere decorative.
- **Two typefaces, jobs strictly separated.** Outfit (`font-display`) takes
  headings, page and card titles, and every large display number — its round
  geometry at weight 500 is what produces the warmth. Plus Jakarta Sans
  (`font-sans`) takes body, tables, labels, buttons and form controls, where
  Outfit's width would cost density. Both are loaded once on `<html>`. There is
  no third family and no Devanagari face; `font-mono` is the platform stack, not
  a download. Refuse requests to add a family.
- **Weight 700 is banned product-wide.** Emphasis comes from size and colour, not
  from bolding: a 700 display title at default tracking is the generic dashboard
  voice. Neither webfont ships a 700 face, and `fontWeight.bold` is overridden to
  600 so a stray `font-bold` degrades instead of breaking the look. Verify with
  `grep -rnE "font-bold|font-weight: *700" apps/admin-web/src`.
- **EmptyState is left-aligned and inline**, with no card wrapper, no icon tile
  and no centring. A large centred rounded box floating mid-viewport is the most
  recognisable generated empty state there is, and every feature page consumes
  this primitive.
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

| Role | Size | Family and weight | Utility |
| --- | --- | --- | --- |
| Hero metric | 40px | Outfit 500, `-0.03em`, tabular | `text-hero` |
| Page title | 30px | Outfit 500, `-0.02em` | `text-page-title` |
| Stat figure | 24px | Outfit 500, `-0.02em` | `text-stat` |
| Card / section title | 17px | Outfit 500, `-0.01em` | `text-card-title` |
| Body | 14.5px | Jakarta 400, 1.55 | `text-body` |
| Table cell | 13.5px | Jakarta 400 | `text-table` |
| Label, pill | 12px | Jakarta 500 | `text-pill` |

`text-stat` is the one step added to the brief's scale: it jumps from a 17px card
title straight to the 40px hero, and a supporting figure has to read as a figure
rather than as a heading.

The `.tabular` utility sets `tnum` and is required on every rupee figure so
columns align and a live number does not jitter.

### `cn()` knows the theme, and must keep knowing it

`src/lib/utils.ts` builds `cn` with `extendTailwindMerge`, declaring the custom
font sizes, token colours and radii. tailwind-merge files an unrecognised `text-*`
class under text-colour, so before this was configured `cn('text-table','text-ink')`
returned only `text-ink` and silently dropped every custom font size — no build
error, no runtime error. **A font size or token colour added to
`tailwind.config.ts` must be added to `utils.ts` in the same commit.**

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

**Building while `pnpm dev:admin` is running corrupts the dev server**, because both
write `apps/admin-web/.next`. To verify a build beside a running dev server, point
the build elsewhere, then remove it and undo the `.next-verify/types` include that
Next adds to `tsconfig.json` on every build:

```bash
cd apps/admin-web && NEXT_DIST_DIR=.next-verify npx next build; rm -rf .next-verify && git checkout -- tsconfig.json
```

For day-to-day mobile work run `pnpm dev:customer` and `pnpm dev:worker` in
separate terminals. `pnpm dev` is for bringing the whole stack up at once;
Metro's interactive keystrokes do not survive turbo's output multiplexing.

- **No Co-Authors:** Never append `Co-authored-by` or any AI attribution metadata to commit messages.
