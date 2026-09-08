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
`global.css` and `nativewind-env.d.ts` are byte-identical between the two apps
and must stay that way.** Any change to one must be applied to the other.
Verify with:

```bash
diff apps/customer/metro.config.js apps/worker/metro.config.js
diff apps/customer/babel.config.js apps/worker/babel.config.js
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
