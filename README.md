<div align="center">

<img src="brand/SahayoLogo.png" alt="Sahayo" width="120" />

# Sahayo

### Cooperative Gig Services Platform for Household & Community Services 
**Turning on-demand gig work into worker-owned enterprise.** Sahayo matches the on-demand speed and convenience of commercial aggregators while fundamentally restructuring ownership: workers retain 90% of job earnings, algorithmic dispatch actively prevents income concentration, and an append-only, member-governed cooperative fund provides structural social security at zero additional cost to the customer.

[![Smart India Hackathon 2026](https://img.shields.io/badge/Smart_India_Hackathon-2026-F5B814?style=flat-square)](https://www.sih.gov.in/)
[![Problem Statement SIH26089](https://img.shields.io/badge/Problem_Statement-SIH26089-113B5E?style=flat-square)](https://www.sih.gov.in/)
[![Ministry of Cooperation](https://img.shields.io/badge/Ministry_of-Cooperation-4F8233?style=flat-square)](https://cooperation.gov.in/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![Expo SDK](https://img.shields.io/badge/Expo_SDK-57-000020?style=flat-square&logo=expo)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.86.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?style=flat-square&logo=socketdotio)](https://socket.io/)
[![pnpm workspaces](https://img.shields.io/badge/pnpm-workspaces-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/workspaces)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.x-EF4444?style=flat-square&logo=turborepo)](https://turborepo.com/)

</div>

---

## Executive summary

India's gig economy runs on proximity-and-rating dispatch. That single design
choice is what concentrates income: the worker who happens to be closest to
affluent demand, with the earliest good reviews, gets offered more work, earns
more, stays online more, and pulls further ahead. Everyone else subsidises the
platform's convenience with idle hours. The worker has no equity, no safety net,
and no say in the rules they work under.

**Sahayo is the same product built on a cooperative premise.** The workers are
members. The dispatcher deliberately ranks a quiet worker up. A fixed slice of
every settled booking goes into a fund the members own and vote on — and it
costs the customer nothing extra, because it comes out of the platform's own
share.

### The problem, stated plainly

| | Conventional aggregator | Sahayo |
| --- | --- | --- |
| Who gets the job | nearest + highest rated | weighted so the least-worked member ranks up |
| Platform take | 20–30% commission | **5%** |
| Worker take | 70–80% | **90%** |
| Collective safety net | none | **5%** into a member-owned fund |
| Who sets the rules | the platform | members, by recorded vote |
| Customer price | — | **unchanged** — the fund comes out of the platform's cut |

### Beneficiaries and measurable impact

- **Members (workers).** 90% of the item price instead of the industry's 70–80%.
  At the seeded cooperative's scale — `WORKER_COUNT = 140`,
  `BOOKING_COUNT = 12000` over `BOOKING_WINDOW_DAYS = 90`, averaging ~₹1,725 a
  job — each member bills roughly ₹11,500 a week, so the extra 10–20 points is
  **₹1,150 to ₹2,300 more per member per week** at the same volume. No change to
  what the customer pays.
- **Idle members specifically.** `INVERSE_ALLOCATION` carries the heaviest
  dispatch weight (0.45, against 0.30 proximity and 0.25 rating), so a member
  with few jobs this week is ranked *up*. The backend test suite asserts the
  claim directly: *"a lower-rated worker with fewer jobs this week outranks a
  saturated top-rated worker."*
- **The collective.** The seeded fund holds **₹32,59,180** against a stated
  ₹50,00,000 goal, funding accident cover, health premiums, tool loans and
  children's education — each one traceable to the vote that approved it.
- **Customers.** Identical booking flow, transparent fare breakdown, live
  tracking. The cooperative model is invisible at the point of sale, which is
  the point.
- **The registrar (CRCS).** Compliance datasets export straight from the same
  collections the portal reads, so the cooperative's statutory reporting is a
  download rather than a reconciliation exercise.

---

## Key features and innovation

### 1. The equity dispatcher — the technical differentiator

One scoring function, `computeEquityScore`, in
[packages/shared/src/equity.ts](packages/shared/src/equity.ts). The backend
dispatcher, the admin portal's Broadcast Inspector and the seed all call it, so
the inspector's on-screen claim *"ranked first for taking fewer jobs"* is true
by construction rather than by narration.

```
score = 0.30 · proximity          (1 at the door, 0 at the radius edge)
      + 0.25 · rating             (0 at the 3.6 floor, 1 at a perfect 5)
      + 0.45 · inverseAllocation  (1 with no jobs this week, 0 for the busiest)
```

The weights are administrator-adjustable from Settings, and changing them
recomputes every member's stored score in the same write — with an audit row.

### 2. A real-time offer race, arbitrated server-side

A request broadcasts to ranked candidates over Socket.io with a 30-second
countdown. Five simultaneous accepts on one booking yield exactly one winner;
the other four are told `TAKEN`. If nobody accepts, the radius widens from 5 km
to 8 km, the job is offered once more, then expires. Decliners are not
re-offered the same job. All four behaviours are covered by tests.

### 3. Scheduled bookings with conflict detection

A job booked for later goes to every verified member nearby — online or not —
and stays claimable past the instant window. Accepting one that overlaps work
already taken is refused with `CONFLICT` plus the overlapping jobs, until the
worker explicitly confirms.

### 4. Transparent fare engine

```
multiplier = 1 + urgency(0.15) + weather(0–0.25) + demand(0–0.25),  capped at 1.5×
item total = base × multiplier      <- the 90/5/5 split comes out of this
total      = item total + 18% GST   <- added on top, never split
```

A booking made ahead of time carries none of the three surcharges: each is a
statement about *right now*. GST is collected and remitted, so it is never
treated as revenue to divide.

### 5. An append-only ledger

There is no function anywhere that edits or deletes a ledger entry, and there
must never be one. A correction is a **new** compensating row carrying
`reversalOf`; the original stays byte-identical forever. Status is *derived*, not
stored — "released" means a `PAYOUT_RELEASE` row exists pointing back. A refund
is four rows that net to zero: the customer is credited R, and R is recovered
from worker, platform and fund by the same `splitAmount` the booking was paid
with, so a refunded period still sums to the paisa.

In the UI this is visible rather than claimed: the row menu offers View booking,
Copy trace ID and Issue reversal — and nothing else. Not disabled. Absent.

### 6. Cooperative governance, on the members' phones

Members read proposals, cast one recorded vote each, and request micro-loans
from within the worker app. Every rupee the fund has spent traces back to the
proposal that authorised it, for exactly the amount approved, dated just after
the vote closed. Quorum is 60% of eligible members and is reported as
participation — a proposal can fail quorum with every vote in favour, and the UI
says so rather than calling it a rejection.

### 7. UIDAI Circular 14 of 2025 compliance — Aadhaar handled correctly

This has legal force and the code is built around it:

- **No Aadhaar number is ever persisted.** Not in `localStorage`, Zustand, React
  state, a URL, or a log. The store holds an opaque `aref_…` reference and
  `aadhaarLast4`, nothing more.
- **Masked by default** — `XXXX-XXXX-4567` is the only persistent form.
- **Reveal is purpose-bound and audited.** Select a purpose, then the audit row
  is written *synchronously, before the value exists* — then the full number is
  written straight into a text node through a ref, shown for 30 seconds with a
  visible countdown, and wiped. React state holds only the countdown.
- **Hashing Aadhaar is banned.** Routes are UUIDs, never anything
  Aadhaar-derived.
- **An Access log tab** lists every reveal with admin, timestamp, worker and
  stated purpose.
- **Compliance exports carry no Aadhaar data at all** — not the number, not a
  masked form, not the last four.

Verify: `grep -rnE "[0-9]{12}" apps/admin-web/src` prints nothing.

### 8. Offline-first, because venue wifi fails

- The admin portal precaches every route plus the scripts, styles and fonts
  their HTML references, so an airplane-mode reload still renders every page.
- Street maps measure health on the **first basemap tile**, not the map's `load`
  event; if no tile arrives in time an SVG zone map covers the street map — and
  lifts by itself if tiles arrive late.
- Both mobile apps fall back to bundled demo data behind a visible offline strip.
- Maps use OpenStreetMap raster tiles and need **no API key**.

### 9. Bilingual from the first screen

English and Hindi, around 1,080 strings each, every user-facing string in both
mobile apps routed through i18next from day one. Money is integer **paise** end
to end and formatted only at the render edge, through one shared formatter.

---

## Tech stack

| Layer | Technology | Why |
| --- | --- | --- |
| **Customer app** | Expo SDK 57, Expo Router, React Native 0.86.3, NativeWind 4 | File-based routing; Tailwind classes on native |
| **Worker app** | same, plus `expo-location`, `expo-audio` | Background location and an audible offer ring |
| **Admin portal** | Next.js 15.5.4 (App Router), React 19.2.3, Tailwind 3.4, shadcn/ui 2.10, Radix | Static generation for offline precaching |
| **Data viz** | Recharts 3 | Revenue, fund growth, zone demand |
| **Maps** | MapLibre GL 6 + react-map-gl, OpenStreetMap raster tiles | No API key, no watermark, no vendor account |
| **Tables** | TanStack Table 8 | Headless, so the design system stays in charge |
| **Backend** | Node.js, Express 4, TypeScript, `tsx` | No build step in the dev loop |
| **Real time** | Socket.io 4.8, typed both ends from one contract | A renamed event is a compile error |
| **Validation** | Zod 3, shared between client and server | One schema, one source of truth |
| **State** | Zustand 5 | Admin portal store; mobile app stores |
| **i18n** | i18next + react-i18next, `expo-localization` | English and Hindi |
| **Persistence (provisioned)** | PostgreSQL 16 + PostGIS 3.4, Redis 7 via Docker Compose | Geospatial dispatch queries, offer locks |
| **Monorepo** | pnpm 12 workspaces + Turborepo 2 | Four apps, two shared packages, one install |
| **Quality** | `tsc --noEmit`, ESLint 9 (flat config), Prettier, `node:test` | 6/6 typecheck, 6/6 lint, 19 backend tests |

> **Current data layer.** The backend runs on a deterministic in-memory store
> seeded from `packages/shared/src/seed`, and the admin portal runs on a
> deterministic dataset behind an async service layer. Both are deliberate: a
> dataset that drifts with the wall clock is not demonstrable, and "12,000
> bookings over 90 days" would silently re-bucket overnight and change the shape
> of every chart between the rehearsal and the room. Postgres + PostGIS and Redis
> are provisioned in `docker-compose.yml` and the service layer is the seam they
> swap into — a service function's body changes from "filter this array" to
> "fetch this endpoint" and every page keeps working.

---

## Architecture

### Data flow, end to end

```
 CUSTOMER APP (Expo, :8081)                              WORKER APP (Expo, :8082)
 +--------------------------+                            +--------------------------+
 | browse 10 trades ->      |                            | go Online                |
 | 49 sub-categories ->     |                            | location every 5 s       |
 | 289 priced items         |                            | ring + 30 s countdown    |
 +-----------+--------------+                            +-----------+--------------+
             | POST /bookings                       gig:accept (race)| worker:location
             v                                                       v
 ===================================================================================
   BACKEND -- Express + Socket.io  (:4000, /api/v1)
 -----------------------------------------------------------------------------------
   pricing/fare.ts ----> base x (1 + urgency + weather + demand <= 1.5x) + 18% GST
           |
   dispatch/ranking.ts ----> computeEquityScore()  <-- shared with portal + seed
           |                 0.30 proximity - 0.25 rating - 0.45 inverseAllocation
           v
   dispatch/dispatcher.ts - broadcast 5 km, 30 s - no accept -> widen 8 km -> expire
           |                                       first accept wins, rest TAKEN
           v
   domain/booking-machine.ts   REQUESTED -> BROADCAST -> ACCEPTED -> EN_ROUTE ->
           |                   ARRIVED -> IN_PROGRESS -> COMPLETED -> SETTLED
           |                   (role-checked; illegal moves throw, naming both states)
           v
   repositories/ledger.ts ----> splitAmount() ----> 3 append-only rows, sum exact
                                90% worker - 5% platform - 5% cooperative fund
 ===================================================================================
        booking:updated | worker:moved | coop:fund_updated        | dispatch:round
        gig:offer/taken | ledger:appended | worker:kyc_updated    | dispatch:resolved
                     v                                            v
            both mobile apps                       ADMIN PORTAL (Next.js, :3000)
                                                   Live Dispatch - Broadcast Inspector
                                                   Finance - Fund - KYC - Analytics

 -- packages/shared ---------------------------------------------------------------
    types + zod schemas (kept in lockstep by `satisfies z.ZodType<T>`)
    socket event contract - equity maths - fare constants - deterministic seed
    consumed as TypeScript SOURCE by all four apps -- no build step, no dist
```

### The three architectural rules that hold it together

**1. One definition of the maths, imported everywhere.** `WORKER_SHARE`,
`PLATFORM_SHARE`, `COOP_FUND_SHARE` (90/5/5, asserted to sum to 1 at module
load) and `computeEquityScore` live in `packages/shared` and are **never written
as literals** in an app. The portal cannot tell a worker a different number than
the mobile app does.

**2. Types and schemas cannot drift.** Every zod schema carries
`satisfies z.ZodType<T>` against its TypeScript type. Drift is a compile error,
not a runtime surprise.

**3. Components call services. Nothing else.** In the admin portal:

```
src/lib/seed      deterministic dataset   <- only the store reads this
src/lib/store     zustand, the database   <- only services read this
src/lib/services  async functions         <- the UI reads ONLY this
```

Enforced by `no-restricted-imports` in `eslint.config.mjs`, so a component
importing the store fails lint. The comment asks; the rule refuses. That is what
makes the seam real: `approveKyc(id)` updates the Workers directory badge, the
verification queue count and the dashboard stat in the same instant, because all
three read derived state from one store.

### REST surface — `/api/v1`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness — `{"ok":true}` |
| `POST` | `/auth/login` | Phone + OTP, returns the session |
| `GET` | `/services` | The full catalogue tree |
| `POST` | `/pricing/quote` | Fare with every surcharge itemised |
| `POST` | `/bookings` | Create; enters dispatch |
| `GET` | `/bookings` and `/bookings/:id` | List / read |
| `POST` | `/bookings/:id/transitions` | Role-checked state move |
| `POST` | `/bookings/:id/payment` | Settle; posts the split |
| `GET` | `/workers/:id` | Public worker profile |
| `GET` | `/earnings/:workerId` | Earnings and payouts |
| `GET` | `/coop/fund` | Fund balance, programmes, proposals |
| `POST` | `/coop/proposals/:id/vote` | One recorded ballot per member |
| `GET` | `/admin/overview` and `/admin/live` | Dashboard, live dispatch feed |
| `GET` | `/admin/broadcasts/:bookingId` | Broadcast Inspector — equity components |
| `GET` | `/admin/kyc/queue` | Verification queue |
| `POST` | `/admin/workers/:id/kyc` | Approve or reject KYC |
| `POST` | `/admin/demo/reset` | Restore the seed, byte-identically |

### Socket.io contract

Typed from [packages/shared/src/events.ts](packages/shared/src/events.ts) on
both ends. A connection without `userId` and `role` is refused at the handshake.

| Direction | Events |
| --- | --- |
| **client to server** | `worker:online`, `worker:offline`, `worker:location`, `gig:accept`, `gig:decline` |
| **server to client** | `gig:offer`, `gig:taken`, `gig:expired`, `booking:updated`, `worker:moved`, `coop:fund_updated`, `ledger:appended`, `worker:kyc_updated` |
| **server to admin room** | `dispatch:round`, `dispatch:resolved` |

---

## Getting started

### Prerequisites

| | Version | Notes |
| --- | --- | --- |
| **Node.js** | 20 or newer (developed on 24.16.0) | |
| **pnpm** | **12.3.4** | `corepack enable && corepack prepare pnpm@12.3.4 --activate`. Do not use npm or yarn — see below. |
| **Expo Go** | SDK 57 build | On each phone, from the Play Store / App Store |
| **Android platform-tools** | any | Only for the USB demo route (`adb`) |
| **Docker** | optional | `docker-compose.yml` provisions Postgres + Redis; nothing reads them yet |

> **pnpm is not interchangeable here.** `nodeLinker: hoisted` in
> `pnpm-workspace.yaml` is load-bearing: Metro cannot resolve modules through
> pnpm's default symlinked layout. React is also pinned to a single instance
> (19.2.3) workspace-wide via `overrides` — two React copies bound to different
> `react-dom` instances broke the portal's prerender with *"Cannot read
> properties of null (reading 'useRef')"*.

### 1. Clone and install

```bash
git clone https://github.com/aayush-778/sahayo.git
cd sahayo
pnpm install
```

Verify the linker took — this **must** print `hoisted`:

```bash
pnpm config get node-linker
```

### 2. Environment

```bash
cp .env.example .env                                       # backend
cp apps/admin-web/.env.example apps/admin-web/.env.local   # admin portal
cp apps/customer/.env.example  apps/customer/.env          # customer app
cp apps/worker/.env.example    apps/worker/.env            # worker app
```

Defaults work as-is for local development. Two things are worth knowing:

- **`EXPO_PUBLIC_API_URL` is an origin, not a base path.** `http://host:4000`,
  **not** `http://host:4000/api/v1` — `src/realtime/config.ts` appends the
  prefix itself, and the same origin is what Socket.io connects to.
- **`EXPO_PUBLIC_*` is inlined at bundle time.** After editing a mobile `.env`,
  Metro must be restarted with `-c` or the old value stays baked in.

### 3. Database (optional — nothing reads it yet)

```bash
docker compose up -d      # postgres/postgis:16-3.4 + redis:7, both health-checked
```

There are no migrations to run. The backend seeds a deterministic in-memory
store on boot; `POST /api/v1/admin/demo/reset` (or `pnpm demo:reset`) restores it
byte-identically.

### 4. Run it

Everything at once:

```bash
pnpm dev                  # backend + admin portal + both mobile apps
```

Or, recommended — one terminal each, because Metro's interactive keystrokes
(`a`, `i`, `r`) do not survive turbo's multiplexed output:

```bash
pnpm dev:backend          # Express + Socket.io   -> :4000/api/v1
pnpm dev:admin            # Next.js admin portal  -> :3000
pnpm dev:customer         # Expo / Metro          -> :8081
pnpm dev:worker           # Expo / Metro          -> :8082
```

Sanity check: `curl http://localhost:4000/api/v1/health` returns `{"ok":true}`.

### 5. Get the apps onto phones (Expo Go)

Scan each Metro QR with Expo Go. Then point the apps at the backend — the
default `localhost:4000` means the *phone*, not your laptop:

**Over USB — what the demo uses.** Immune to the AP isolation most venue wifi
has, because there is no network in between:

```bash
pnpm demo:tunnel          # adb reverse tcp:4000 tcp:4000, per attached phone
```

No `.env` needed. **It does not survive an unplug, a knocked cable or a phone
reboot — re-run it after any of those.** A phone that lost its tunnel shows a
grey offline strip, which is the tell.

**Over wifi.** Put the LAN address the backend printed at startup into each
mobile `.env`, then restart Metro with `-c`:

```bash
# apps/customer/.env and apps/worker/.env
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
```

> **One Expo Go caveat.** Foreground location works. The worker app's
> **background** location does not — Expo Go's native manifest is fixed and
> cannot carry `app.json`'s permissions. Use `npx expo run:android` or an EAS dev
> build if you need that specific piece. Everything else runs in Expo Go.

### 6. Demo helpers

```bash
pnpm demo:reset           # restore the seed — prints the fund back at ₹32,59,180
pnpm demo:tunnel          # adb reverse, both phones
pnpm demo:request         # inject a customer booking request
pnpm demo:walk            # simulate worker movement along a route
```

Full presenter walkthrough: [docs/demo-script.md](docs/demo-script.md).
Five-minute pre-flight: [docs/demo-checklist.md](docs/demo-checklist.md).

### 7. Quality gates

```bash
pnpm typecheck                          # tsc --noEmit across all 6 packages
pnpm lint                               # eslint across all 6 packages
pnpm --filter @sahayo/backend test      # 19 tests, node:test
pnpm --filter @sahayo/admin-web build   # Next.js production build
```

> **Do not run `next build` while `pnpm dev:admin` is running** — both write
> `apps/admin-web/.next` and the dev server's output is corrupted. To verify a
> build alongside a running dev server:
>
> ```bash
> cd apps/admin-web && NEXT_DIST_DIR=.next-verify npx next build
> rm -rf .next-verify && git checkout -- tsconfig.json
> ```

---

## Repository structure

```
sahayo/
├── apps/
│   ├── backend/                    Node.js - Express 4 - Socket.io - TypeScript via tsx
│   │   ├── src/
│   │   │   ├── dispatch/           the equity dispatcher: ranking, broadcast rounds,
│   │   │   │                       radius widening, offer expiry, scheduled conflicts
│   │   │   ├── domain/             booking state machine — role-checked, terminal states
│   │   │   │                       have no exit, nothing moves backwards
│   │   │   ├── pricing/            fare engine (urgency + weather + demand, capped 1.5x)
│   │   │   ├── repositories/       bookings, workers, ledger, proposals, catalogue
│   │   │   ├── routes/             8 route modules under /api/v1
│   │   │   ├── sockets/            gateway (authenticated handshake) + realtime fan-out
│   │   │   └── store/              in-memory store seeded from @sahayo/shared
│   │   ├── scripts/                demo-reset, demo-tunnel, demo-request, demo-walk
│   │   └── test/                   19 tests, incl. the 5-way accept race and the
│   │                               cooperative claim itself
│   │
│   ├── admin-web/                  Next.js 15 App Router - cooperative administrator portal
│   │   └── src/
│   │       ├── app/(admin)/        dashboard, dispatch, bookings, workers, customers,
│   │       │                       verification, finance, fund, disputes, analytics,
│   │       │                       settings, account
│   │       ├── components/         feature folders + ui-kit primitives
│   │       │   ├── maps/           MapLibre demand map, CSS heat spots, SVG fallback
│   │       │   ├── finance/        append-only ledger — no edit or delete path exists
│   │       │   └── verification/   KYC queue, AadhaarReveal, access log
│   │       ├── lib/
│   │       │   ├── seed/           deterministic dataset — no Math.random, no Date.now
│   │       │   ├── store/          zustand; the database
│   │       │   └── services/       async seam the real backend swaps into
│   │       └── styles/tokens.css   nine colour tokens. There is no tenth.
│   │
│   ├── customer/                   Expo app - port 8081 - in.sahayo.customer - "Sahayo"
│   │   └── app/                    (auth); (tabs) home/categories/bookings/support/profile;
│   │                               category -> subcategory -> booking now|schedule ->
│   │                               payment -> success -> track/[bookingId]
│   │
│   └── worker/                     Expo app - port 8082 - in.sahayo.worker - "Sahayo Partner"
│       └── app/                    (auth); (onboarding) service details -> documents ->
│                                   availability -> review; (tabs) home/bookings/earnings/
│                                   chat/profile; job/[id] -> active -> rate;
│                                   coop/ proposals, votes, loan requests; scheduled/
│
├── packages/
│   ├── shared/                     ships TypeScript SOURCE — no build step, no dist
│   │   └── src/
│   │       ├── types/              14 domain type modules
│   │       ├── schemas/            matching zod schemas, `satisfies z.ZodType<T>` each
│   │       ├── events.ts           the Socket.io contract, typed both ends
│   │       ├── equity.ts           computeEquityScore — one definition, three consumers
│   │       ├── constants.ts        90/5/5, 18% GST, dispatch weights, fund goal
│   │       ├── catalogue.ts        10 trades -> 49 sub-categories
│   │       ├── service-items/      289 priced items (fixed, fault, unit, retainer)
│   │       └── seed/               deterministic dataset, per-collection RNG seeds
│   │
│   └── ui-native/                  primitives shared by BOTH mobile apps
│       ├── src/                    Screen, Text, PrimaryButton, FormField, Avatar,
│       │                           Checkbox, SearchField, Skeleton, FarePanel
│       ├── src/i18n/               en.json + hi.json, ~1,080 strings each
│       └── tokens.js               design tokens + the shared Tailwind preset
│
├── brand/                          source-of-truth artwork; every icon derives from
│                                   sahayo-emblem.png
├── docs/                           demo-script.md, demo-checklist.md
├── docker-compose.yml              postgres/postgis:16-3.4 + redis:7, health-checked
├── pnpm-workspace.yaml             nodeLinker: hoisted + the React 19.2.3 override
└── turbo.json                      dev, typecheck, lint, build
```

### Two mobile apps, not one — a deliberate decision

There is no single mobile app and no role picker. `apps/customer` and
`apps/worker` are independent Expo apps with independent `app.json` files.

**The reason is permissions.** The worker app needs background location and push
notifications; the customer app must not ask for either. Separate Expo configs
mean separate native permission manifests, so the customer app *cannot* request
a permission it has no business requesting — it is structurally incapable of it,
not merely coded not to.

| | customer | worker |
| --- | --- | --- |
| Metro port | 8081 | 8082 |
| Android package | `in.sahayo.customer` | `in.sahayo.worker` |
| Display name | **Sahayo** | **Sahayo Partner** |
| Icon ground | `#FBF9F3` cream | `#A9CBD8` teal |
| Location | foreground only | foreground **and** background |
| Notifications | — | `POST_NOTIFICATIONS` |

The two icons are colour-coded by **hue, not lightness**, because both phones sit
on the table during the demo and must be distinguishable at a glance.

---

## Design system

The admin portal's visual language is written into `src/styles/tokens.css` and
`tailwind.config.ts` — enforced by the build rather than by convention. Nine
colour tokens, no tenth. Cream canvas, white cards, and warm-ink shadows rather
than cold grey. Two typefaces with strictly separated jobs: **Outfit** for
headings and display numbers, **Plus Jakarta Sans** for body, tables and
controls. Weight 700 is banned product-wide — neither webfont ships a 700 face,
and `fontWeight.bold` is remapped to 600 so a stray `font-bold` degrades instead
of breaking the look. No dark mode, no glassmorphism, no decorative gradients, no
emoji. Every figure is monospace and `tnum`, so a live number does not jitter.

Copy is plain and human: *"Workers were paid ₹4,20,000 this week"*, never
*"disbursement volume"*. Every button label is a verb naming its effect, and the
toast that follows uses the same word.

---

## Team and acknowledgements

| | |
| --- | --- |
| **Problem Statement ID** | SIH26089 |
| **Ministry** | Ministry of Cooperation, Government of India |
| **Event** | Smart India Hackathon 2026 |
| **Team name** | Innovex |
| **Institution** | IIT Patna |



### Acknowledgements

- **Ministry of Cooperation** for the problem statement, and the *Sahkar se
  Samriddhi* framing that the fund mechanic is built around.
- **OpenStreetMap contributors** — the street maps use OSM raster tiles under the
  [ODbL](https://www.openstreetmap.org/copyright).
- **UIDAI Circular 14 of 2025**, which shaped the Aadhaar handling throughout.
- **MapLibre**, **Expo**, **Next.js**, **shadcn/ui**, **Recharts** and
  **TanStack** — all open source, all load-bearing here.

---

## License

No `LICENSE` file is committed yet. Add one before publishing — MIT or Apache-2.0
are the conventional choices for a hackathon submission — and a license badge can
then go at the top of this file.

<div align="center">

**Sahayo** — *sahayo* means *to help*.
Built for the Ministry of Cooperation, Smart India Hackathon 2026.

</div>
