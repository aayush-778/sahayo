# Sahakar — Cooperative Gig Services Platform

SIH26089 (Ministry of Cooperation). pnpm workspaces + Turborepo monorepo,
package scope `@sahakar/*`.

- `apps/admin-web` — Next.js 15 (App Router), Tailwind, shadcn/ui
- `apps/backend` — Node.js, Express, Socket.io, TypeScript
- `apps/mobile` — React Native via Expo Router, NativeWind
- `packages/shared` — TypeScript types, zod schemas, socket event contract

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

## Scripts

| Command | Effect |
| --- | --- |
| `pnpm dev` | backend + admin-web (mobile is separate; Metro owns its TTY) |
| `pnpm dev:backend` | Express + Socket.io on `:4000` |
| `pnpm dev:admin` | Next.js on `:3000` |
| `pnpm dev:mobile` | Expo / Metro on `:8081` |
| `pnpm typecheck` | `tsc --noEmit` across all packages |
| `pnpm lint` | eslint across all packages |
