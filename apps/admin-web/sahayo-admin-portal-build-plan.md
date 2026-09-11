# Sahayo Admin Portal — Phase-wise Build Plan for Claude Code

Target: `~/Projects/sahayo/apps/admin-web` (Next.js 15, App Router, src-dir, Tailwind 3.4, shadcn 2.10.0, scope `@sahakar/*`).
Goal: a fully clickable prototype running on deterministic dummy data, where every feature works end to end in the browser with no backend. Backend swaps in later behind the service layer.

---

## How to run these phases

1. One phase per Claude Code session. Paste the prompt, let it finish, verify the gate.
2. `git add -A && git commit -m "feat(admin): phase N ..."` after each passing gate.
3. `/clear` between phases. Long sessions drift and start re-deciding settled things.
4. If a phase's gate fails, fix it in the same session. Never carry a red gate forward.
5. Run `pnpm --filter @sahakar/admin-web build` before every commit — it catches the silent shadcn/oklch class of failure your Phase 1 notes already flagged.

Phase 0 is not optional and not skippable. Every anti-slop guarantee you asked for lives in it, and every later phase just consumes the tokens it defines. If you skip it, phases 2–9 will each invent their own colours and you get exactly the look you're trying to avoid.

---

## The design brief (this is what phases consume)

Extracted from your PDF and the SunEnergy / Crextio / DriveOn screenshots. Phase 0 writes it into code so you never have to restate it.

**Palette — warm paper, marigold hero, one accent per job.**

| Token | Hex | Rule |
|---|---|---|
| `--ground` | `#FFFDFB` | Page background. Never pure white. |
| `--surface` | `#FFFFFF` | Elevated cards sitting on ground. |
| `--marigold` | `#F5B814` | Primary actions, active nav, hero metric only. |
| `--marigold-tint` | `#FEF3D4` | Icon tiles, radial page glow, active row wash. |
| `--fund-green` | `#34C77B` | Cooperative Fund, positive deltas, verified KYC. Nothing else. |
| `--coral` | `#FF8B72` | Chart series 2, warnings, reject. Never a button fill. |
| `--lavender` | `#A78BFA` | Chart series 3. |
| `--ink` | `#1F1B16` | Type. Pure `#000` is forbidden. |
| `--muted` | `#8A8279` | Secondary text, inactive toggles, table headers. |
| `--hairline` | `#F0E9DD` | Borders. Replaces heavy shadows. |

Banned outright: terracotta/clay `#D97757`, neon gradients, glassmorphism, dark mode, `rgba(0,0,0,0.1)` shadows, emoji as icons.

**Depth.** Page background carries a fixed radial glow — `radial-gradient(1200px circle at 0% 0%, rgba(245,184,20,0.08) 0%, rgba(245,184,20,0.03) 40%, transparent 100%)` — so it reads like light falling on paper, the way the SunEnergy shots do. Cards use a double shadow: `0 1px 3px rgba(31,27,22,0.03), 0 12px 32px rgba(31,27,22,0.05)`. Radii: `24px` structural cards, `12px` icon tiles, `999px` status pills.

**Type.** Plus Jakarta Sans throughout, loaded via `next/font/google` with `display: swap`. The entire interface is English — one family, no second script. Rupee figures still render as ₹, which Plus Jakarta Sans covers. Monospace is permitted *only* for tabular figures in ledgers and chart axes — nowhere decorative. Scale: 36px tabular hero metric / 24px section titles / 15px body / 13px table text / 12px pills.

**Layout.** `grid-cols-12` where content dictates span. Identical four-across stat cards are the single biggest slop tell, so the dashboard's top row is deliberately asymmetric: one hero block spanning 5, three smaller stats sharing 7. Fixed sidebar, fixed header, only `<main>` scrolls.

**Icons.** `lucide-react`, 18px, `1.5` stroke, `--muted` by default and `--ink` when active. Each sits in a 12px-radius tinted tile as in your SunEnergy and DriveOn references — tile tint varies by semantic role, not randomly.

---

## Phase map

| Phase | Delivers | Session length |
|---|---|---|
| 0 | Design tokens, fonts, app shell, sidebar, header, primitives | long |
| 1 | Dummy data seed + service layer + Zustand store | medium |
| 2 | Executive dashboard: hero fund metric, revenue chart, **region heatmap**, **hiring-by-category donut** | long |
| 3 | Workers directory + worker profile page | long |
| 4 | Live dispatch map + demand heatmap + Broadcast Inspector | long |
| 5 | Finance hub: 85/10/5 split + append-only ledger | long |
| 6 | KYC queue, split-screen, Aadhaar masking compliance | medium |
| 7 | Two-way dispute queue with booking timeline | medium |
| 8 | Cooperative Fund: proposals, voting, micro-loans | medium |
| 9 | Settings, CRCS export, anti-slop audit, demo hardening | medium |

---

# PHASE 0 — Design system and application shell

**Why first:** every subsequent phase reads `tokens.css` and `CLAUDE.md`. This is the file that enforces "no AI slop" mechanically instead of by asking nicely each time.

### Prompt

```
Work on Phase 0 only. Do not build any feature page. Do not touch apps/mobile
or apps/backend. Stop when the gate passes and report.

Scope: apps/admin-web — design system, fonts, and application shell.

## 1. tokens.css

Create src/styles/tokens.css defining these as HSL triplets (not hex, not
oklch — Tailwind 3.4 needs bare triplets so `hsl(var(--x))` works):

  --ground        #FFFDFB   warm paper page background
  --surface       #FFFFFF   elevated cards
  --marigold      #F5B814   primary actions, active nav, hero metric
  --marigold-tint #FEF3D4   icon tiles and the page radial glow
  --fund-green    #34C77B   cooperative fund, positive delta, KYC verified
  --coral         #FF8B72   chart series 2, warnings, reject actions
  --lavender      #A78BFA   chart series 3
  --ink           #1F1B16   primary type
  --muted         #8A8279   secondary type, table headers, inactive states
  --hairline      #F0E9DD   all component borders

Import it in globals.css BEFORE the tailwind directives. Extend
tailwind.config.ts colors to expose every token as a utility
(bg-marigold, text-ink, border-hairline, ...). After this, grep the repo:
no hardcoded hex values may exist in any component for the rest of the build.

Also extend the theme with:
  boxShadow.card = '0 1px 3px rgba(31,27,22,0.03), 0 12px 32px rgba(31,27,22,0.05)'
  borderRadius.card = '24px', borderRadius.tile = '12px'

## 2. Fonts

next/font/google: Plus Jakarta Sans only (weights 400/500/600/700,
variable --font-sans, subsets ['latin'], display:'swap'). Apply it on <html>.
Do NOT add a second typeface or a Devanagari font — the entire product is
English. Set font-feature-settings 'tnum' 1 on a .tabular utility class for
financial figures, and confirm ₹ renders correctly at 36px.

## 3. App shell — src/app/(admin)/layout.tsx

Fixed viewport, native-app feel, no full-window scroll:
  body: h-screen w-screen overflow-hidden m-0 p-0
  A fixed absolute radial glow div behind everything:
    radial-gradient(1200px circle at 0% 0%, rgba(245,184,20,0.08) 0%,
                    rgba(245,184,20,0.03) 40%, transparent 100%)
  Parent: flex h-screen w-screen overflow-hidden
  <aside>: flex-none w-64 h-full, hairline right border, bg-surface
  Right: flex-1 flex flex-col h-full min-w-0
    Header: flex-none, h-16
    <main>: flex-1 overflow-y-auto px-8 py-6

Sidebar contents — wordmark "Sahayo" with a marigold diamond glyph, then
nav grouped under four small muted 11px labels:
  MENU      Dashboard, Live Dispatch, Bookings
  PEOPLE    Workers, Customers, Verification
  MONEY     Finance, Cooperative Fund
  INSIGHT   Analytics, Disputes, Settings
Active item: marigold-tint pill background, ink text, icon in ink.
Inactive: transparent, muted text and icon. Use usePathname().
Sidebar footer: the signed-in admin — 32px avatar, name, role, matching the
profile-chip pattern in the reference screenshots.

Header: page title (from route) + one-line subtitle on the left; on the
right a search input, a bell with a coral unread dot, a settings gear, and
an avatar chip with a chevron opening a shadcn dropdown
(Profile / Preferences / Sign out). All pill-shaped, hairline borders,
bg-surface — this is the SunEnergy header treatment.

## 4. Primitives — src/components/ui-kit/

  Card            rounded-card bg-surface border-hairline shadow-card
  SectionHeader   title + optional subtitle + optional right-slot action
  StatBlock       tinted 12px icon tile / muted label / 36px tabular value
                  / delta pill. Tint colour is a prop, defaulting marigold.
  DeltaPill       rounded-full, fund-green bg tint for +, coral tint for −,
                  arrow glyph, 12px. Match the "+12%" pill in the reference.
  StatusPill      variants: pending, verified, rejected, active, offline,
                  resolved. Tinted background, no border, 12px, 999px radius.
  SegmentedToggle Day/Month/Year style control — marigold-tint active
                  segment on a hairline track.
  EmptyState      illustration slot, one line of direction, one action.
  DataTable       wrapper over TanStack Table: sortable headers in muted
                  uppercase 12px, hairline row separators, NO vertical grid
                  lines, NO zebra striping, 56px rows, hover row wash in
                  marigold-tint at 40% opacity, pagination footer.

## Hard design constraints — these are permanent, record them in CLAUDE.md

  - Never use pure #000000 or pure #FFFFFF as a page background.
  - Never use terracotta/clay (#D97757 and neighbours). Banned.
  - No dark mode. No glassmorphism. No neon or multi-stop gradients.
  - No box-shadow using rgba(0,0,0,*). Only the two-layer warm card shadow.
  - Never place four identically sized stat cards in a row. Vary the spans.
  - No tracked-out ALL-CAPS eyebrow labels above headings. The only
    uppercase in the product is sidebar group labels and table headers.
  - No emoji anywhere. lucide-react only, 18px, stroke 1.5.
  - Monospace only for tabular financial figures and chart axes.
  - Every shadcn component added from now on: grep the emitted CSS for
    `oklch` and convert to our HSL triplets before committing.

## Gate
  pnpm --filter @sahakar/admin-web build passes
  localhost:3000 renders the shell with all 11 nav items, active state
  tracking the route, and the four placeholder pages still resolving
  grep -rn "oklch" apps/admin-web/src returns nothing
  grep -rniE "#[0-9a-f]{6}" apps/admin-web/src/components returns nothing
  Only <main> scrolls; the window itself does not
```

---

# PHASE 1 — Dummy data and the service layer

**Why before any page:** the PDF's most important architectural rule. Components never touch the store directly. They call `getWorkers()`, `approveKyc(id)`, `listDisputes(filter)`. Swapping to a real backend later becomes an edit inside those function bodies instead of a rewrite of every page.

### Prompt

```
Phase 1 only. No UI, no pages, no components. Data layer and service layer.
Stop at the gate.

## 1. Seed — src/lib/seed/

Deterministic. Seed a PRNG with a fixed constant so every reload and every
demo run produces identical numbers. All copy and all seed data is in
English. Use realistic Indian names in Latin script, Patna/Bihar zone names (Boring Road, Kankarbagh,
Bailey Road, Rajendra Nagar, Danapur, Patliputra, Ashok Rajpath, Bihta,
Phulwari Sharif, Gandhi Maidan), ₹ amounts, +91 phone numbers.

  workers.ts    140 workers: id(uuid), name, avatarUrl
                (pravatar), category (Plumber, Electrician, Caregiver,
                Driver, Cleaner, Carpenter, Painter, Cook), zone, phone,
                rating 3.6–5.0, kycStatus, isOnline, jobsThisWeek 0–19
                (skew it so ~15% sit at 0–2 — the income-concentration
                problem the equity dispatcher exists to fix), lifetimeJobs,
                walletBalance, fundContributed, joinedAt, equityScore

  bookings.ts   900 bookings over 90 days: id, customer, worker, category,
                zone, lat/lng jittered around real zone centroids, status
                (requested/broadcast/accepted/in_progress/completed/
                cancelled), amount ₹250–₹3,200, createdAt, completedAt,
                and a BookingEvent[] timeline (requested → broadcast →
                pinged N workers → accepted → started → completed → paid)

  ledger.ts     For every completed booking emit exactly 3 append-only
                entries that sum to the gross: 85% worker payout, 10%
                platform, 5% cooperative fund. Fields: id, bookingId,
                type, amount, party, traceId (Stripe-style), createdAt,
                reversalOf (nullable). Include 6 reversing entries so the
                append-only UI has something real to display.

  disputes.ts   40 tickets, raisedBy either 'customer' OR 'worker' — make
                it roughly even, this two-way symmetry is the point.
                status open/investigating/resolved, messages[], linked
                booking, resolution (nullable).

  proposals.ts  7 cooperative fund proposals (health insurance subsidy,
                monsoon gear stipend, tool micro-loans, childcare support,
                accident cover, training bursary, fuel advance), votesFor,
                votesAgainst, quorum, closesAt, status.
                Plus 12 micro-loan requests in a queue.

  kyc.ts        35 pending submissions: worker ref, document type
                (Aadhaar / PAN / Driving Licence), placeholder document
                image URLs, submittedAt, and aadhaarRef — a REFERENCE KEY
                only. There must be no raw 12-digit Aadhaar number
                anywhere in the seed, the store, or any type. The only
                Aadhaar-shaped string in the codebase is the masked
                display form XXXX-XXXX-4567.

  zones.ts      12 Patna zones: name, centroid lat/lng, polygon-ish bounds,
                orderCount, workerCount, avgWaitMinutes, demandIndex 0–1

## 2. Types

All shared shapes go in packages/shared (@sahakar/shared) as zod schemas +
inferred TS types, NOT in admin-web. The backend and mobile app will need
them. admin-web imports them.

## 3. Store — src/lib/store/

Zustand, one slice per domain. Hydrated from the seed on first load.
This is the in-memory database for the prototype.

## 4. Service layer — src/lib/services/

Thin async functions. Every one returns a Promise and awaits a 120–300ms
artificial delay so loading states are real and visible on stage.

  workers.service.ts   listWorkers(filter), getWorker(id), setOnline(id,b)
  bookings.service.ts  listBookings(filter), getBooking(id),
                       getBookingTimeline(id)
  ledger.service.ts    listLedger(filter), getSplitSummary(range),
                       getRevenueSeries(granularity)
  kyc.service.ts       listKycQueue(), approveKyc(id),
                       rejectKyc(id, reason), revealAadhaar(id, purpose)
  disputes.service.ts  listDisputes(filter), getDispute(id),
                       postMessage(id, body), resolveDispute(id, outcome)
  fund.service.ts      getFundTotals(), listProposals(), castVote(id,dir),
                       listLoanRequests(), disburseLoan(id)
  dispatch.service.ts  getLiveMap(), getBroadcast(bookingId),
                       getHeatmapGeoJSON(range)
  analytics.service.ts getCategoryMix(), getZoneDemand(),
                       getHiringByCategory()

THE RULE: React components import from services/ only. A component may
never import the Zustand store directly, and may never mutate it.
Mutating services must write through the store so every dependent view
updates at once — approveKyc(id) must change the badge in the Workers
directory, the KYC queue count, and the dashboard verification stat
simultaneously. Record this rule in CLAUDE.md.

## Gate
  typecheck clean; build passes
  A temporary scratch route prints counts for all eight collections
  Calling approveKyc(id) twice is idempotent and never throws
  grep -rnE "[0-9]{12}" src/lib/seed returns nothing
```

---

# PHASE 2 — Executive dashboard

This is the screen judges see first, and it carries items 7 and 8 from your list.

On the heatmap: use a **self-contained SVG zone heatmap** here, not a map tile provider. It needs no API key, cannot rate-limit you mid-demo, and renders instantly on a projector. The real interactive Mapbox/MapLibre map belongs on the Dispatch page in Phase 4, where panning and zooming actually matter.

### Prompt

```
Phase 2 only — the Executive Dashboard at /dashboard. Use ONLY ui-kit
primitives and semantic tokens from Phase 0, and read data ONLY through
services from Phase 1. Stop at the gate.

12-column grid. Do NOT put four identical stat cards across the top.

## Row 1 — asymmetric, 5 / 7

LEFT, col-span-5 — the hero. The Cooperative Fund Total is the single most
prominent number on the page, because it is what makes this platform
different from Ola or Urban Company:
  marigold-tint icon tile (PiggyBank, 12px radius)
  label "Cooperative Fund" in muted 13px
  ₹ value at 36px, weight 700, tabular figures
  fund-green DeltaPill "+12.4% this month"
  one line underneath: "5% of every booking, owned by 140 workers"
  a thin fund-green progress bar toward a ₹10,00,000 community goal

RIGHT, col-span-7 — three smaller StatBlocks side by side, visibly lighter
weight than the hero (no shadow, hairline separators between them, sitting
inside one card):
  Worker Payouts This Week (₹, marigold tint)
  Active Workers (count + "of 140", lavender tint)
  Bookings Today (count + delta, coral tint)

## Row 2 — col-span-8 / col-span-4

LEFT: "Revenue and Fund Growth" Recharts line chart, two series —
platform revenue (marigold) and cooperative fund (fund-green).
Strip Recharts of every default that makes it look generic:
  no vertical grid lines; horizontal grid lines as 1px dotted hairlines
  no axis lines, no tick marks
  strokeWidth exactly 2, dot={false}, activeDot 4px
  custom tooltip: bg-surface, rounded-tile, shadow-card, hairline border,
    ₹ formatted with Indian digit grouping (₹1,24,500 not ₹124,500)
  SegmentedToggle Day / Month / Year re-aggregates the same array through
    pure functions client-side — instant, no refetch

RIGHT: "Hiring by Category" — the pie chart you asked for. Build it as a
DONUT, not a pie: eight categories is past the point where pie slices stop
being readable. Rules:
  Top 5 categories drawn individually, the remaining 3 collapsed into an
    "Other" segment
  Palette: marigold, fund-green, coral, lavender, and two derived tints of
    marigold — do NOT introduce new hues
  Centre of the donut holds the total hires and a "this quarter" label
  Legend sits BELOW as a two-column list with a coloured dot, category
    name, count, and percentage — not a floating chart legend
  Hovering a segment raises it 2px and dims the others to 40%

## Row 3 — col-span-7 / col-span-5

LEFT: "Where orders are coming from" — the region heatmap.
Build it WITHOUT any map tile provider or API key. A responsive inline SVG
of the 12 Patna zones from the seed, drawn as a honeycomb of hexagon cells
(roughly positioned to mirror the city's real layout). Each hex fills on a
marigold→coral interpolated scale driven by zone.demandIndex, with a
hairline gap between cells. Hover shows a tooltip with zone name, order
count, active workers, average wait. A compact horizontal legend runs
underneath from "Quiet" to "High demand". Add a small toggle for
Orders / Workers / Wait time that re-colours the same hexes.
Beneath the hexes, a three-row "Underserved zones" list: zones where
orders outnumber available workers, each with a "View in dispatch" link.

RIGHT: "Recent Activity" feed. Vertical hairline timeline, no cards.
Mixed event types (booking completed, KYC approved, dispute raised,
proposal passed, loan disbursed), each with a small tinted icon tile,
relative timestamp, and ₹ where relevant.

## Row 4 — full width

"Jobs distributed this week" — a horizontal bar composition, not a table:
each of the 8 categories as a row with a marigold bar and a tabular count,
sorted descending. One line above it in plain language explaining that
dispatch prioritises workers with fewer jobs so income does not concentrate.

## Copy rules
Plain, warm, human. "Workers were paid ₹4,20,000 this week" — never
"disbursement volume". The words "utilisation", "capital deployment",
"fund utilisation metrics", "leverage", "synergy" are banned.

## Loading and empty states
Every card shows a skeleton on its 120–300ms service delay — hairline
shimmer only, no spinners. Every table and feed has a written EmptyState.

## Gate
  build passes
  Every number traces to a service call; nothing hardcoded in a component
  Toggling Day/Month/Year re-renders the chart with no network call
  Donut and heatmap are both keyboard-focusable and screen-reader labelled
  Page renders correctly at 1280x720 (projector resolution) with no
    horizontal scroll
```

---

# PHASE 3 — Workers directory and profile

The profile page is where your Crextio screenshot reference lands.

### Prompt

```
Phase 3 only — /workers and /workers/[id]. Stop at the gate.

## /workers — directory

Above the table, a filter bar in one card: Category, Zone, Verification
status, Online status dropdowns, plus a search input and an Export button
(marigold outline, downloads a real CSV from the in-memory data). Filters
compose, are reflected in the URL query string, and survive a reload.

DataTable columns:
  checkbox | Avatar+Name (phone number in muted 13px beneath the name)
  | Category | Zone | Verification (StatusPill) | Online (fund-green or
  muted dot) | Rating | JOBS THIS WEEK | Wallet | row actions (⋮)

"Jobs This Week" gets deliberate visual weight — it is the equity signal.
Render it as a number plus a 40px inline mini-bar whose fill is relative to
the cohort maximum. Values of 2 or below get a coral-tinted bar and a small
"Under-allocated" pill. Sort descending on this column by default, with a
one-click "Show under-allocated first" switch.

Row selection drives a bulk action bar that slides up from the bottom:
Verify selected, Assign zone, Export selection. Selected rows take a
marigold-tint wash exactly like the reference screenshot.

## /workers/[id] — profile

Layout is 4 / 8, NOT a centred card:

LEFT col-span-4, sticky identity panel:
  96px avatar with a fund-green verified tick badge if KYC passed
  Name, category, zone
  Phone, joined date, rating with a star row
  Three stacked figures separated by hairlines: wallet balance, lifetime
    earnings, lifetime contribution to the Cooperative Fund (fund-green)
  Actions: Message, Suspend (coral outline), View documents

RIGHT col-span-8, tabbed — Overview / Earnings / Bookings / Documents:
  Overview  three StatBlocks (jobs this week, completion rate, avg rating)
            + a 12-week jobs sparkline + an equity-score explainer card
            that shows the actual inputs: proximity, rating, and inverse
            job allocation, each as a labelled horizontal bar, with the
            resulting score. This is the transparency claim made visible.
  Earnings  per-booking earnings table with the 85/10/5 split shown per
            row, tabular figures, and a period filter
  Bookings  recent bookings with StatusPills, linking to the timeline
  Documents KYC documents with their status and submission dates. Any
            Aadhaar reference renders masked as XXXX-XXXX-4567 with a
            "Reveal" button. Never a raw number in props, state, or DOM.

## Gate
  build passes
  Filters + search + sort all compose and persist through a reload
  Approving KYC from the profile immediately updates the directory badge
    and the dashboard verification count (proves the service layer)
  Export downloads a CSV matching the current filter
```

---

# PHASE 4 — Live dispatch, demand heatmap, Broadcast Inspector

### Prompt

```
Phase 4 only — /dispatch. Stop at the gate.

## Map library decision
Use MapLibre GL JS with react-map-gl. It is API-key-free with a free
raster/vector tile source, which removes the demo-day risk of a Mapbox
token rate-limiting on venue wifi. Keep the layer code Mapbox-GL-compatible
so switching to Mapbox tiles later is a style-URL change only.

MANDATORY: a static fallback. If tiles fail to load within 3 seconds, swap
in the Phase 2 SVG hex heatmap in the same slot with a small
"Offline map view" label. The demo must never show a grey rectangle.

## Layout
Full-bleed within <main>: map occupies ~70% width, a fixed 380px right
panel holds the live queue. No dashboard cards floating over the map.

## Map
Light basemap with geography muted almost to greyscale so data reads first.
Three toggleable layers:
  Workers   dots, fund-green when idle, marigold when on a job, muted when
            offline; clustered above 40 points in view
  Requests  coral pins for open requests, with a pulse on ones under 60s old
  Demand    the heatmap layer — heatmap-weight bound to cluster density,
            heatmap-intensity scaling with zoom, heatmap-color interpolating
            transparent → lavender → marigold → coral

Feed the heatmap a pre-aggregated GeoJSON FeatureCollection from
dispatch.service.getHeatmapGeoJSON(). Write a comment at that function
noting that in production the aggregation moves to PostGIS
ST_ClusterDBSCAN and this function becomes a fetch.

## Right panel — live queue
Scrollable list of active bookings: category icon tile, customer, zone,
₹ amount, seconds-since-broadcast counter, StatusPill. Clicking one opens
the Broadcast Inspector and flies the map to that booking.

## Broadcast Inspector — the transparency feature
A slide-over panel, 480px, revealing exactly why the algorithm chose whom:
  the booking, the customer, the ₹ amount and its 85/10/5 preview
  the geofence radius drawn as a translucent marigold circle on the map
  "Pinged 7 workers" — a ranked list, each row showing avatar, name,
    distance, rating, jobs this week, and the computed equity score, with
    the three score inputs as stacked mini-bars so the weighting is visible
  the accepting worker highlighted with a fund-green left border
  a plain-language line: "Priya was ranked first because she has taken 3
    jobs this week against a zone average of 11, not because she was
    closest."
  a manual "Reassign" action for admin override, which writes through the
  service layer and updates the map

## Simulation
A "Simulate incoming request" button in the header seeds a new request,
runs the ranking client-side, pings workers, and auto-accepts after ~4
seconds so the whole loop is demonstrable on stage without a backend.

## Gate
  build passes
  All three layers toggle; heatmap visibly concentrates on high-demand zones
  Killing the network in devtools produces the SVG fallback, not a blank box
  Simulate produces a request that appears on map, queue, and inspector
```

---

# PHASE 5 — Finance hub and append-only ledger

### Prompt

```
Phase 5 only — /finance. Stop at the gate.

## Top — the split, visualised
A large donut using exactly three tokens: worker 85% marigold, platform 10%
muted, cooperative fund 5% fund-green. Centre holds gross volume for the
selected period. To its right, three rows with the ₹ figure, percentage,
and a one-line plain-English description of where that money goes.
Period selector: 7D / 30D / 90D / All.

Beside it, a worked example card that makes the model concrete:
"On a ₹1,000 booking — ₹850 to the worker, ₹100 to run the platform,
₹50 to the fund every worker owns a share of."

## Ledger table
Every entry, searchable and filterable by type, party, date, booking, and
Stripe trace ID. Columns: timestamp, entry ID (mono), booking ref, type
pill, party, amount (mono, right-aligned, +/- coloured), trace ID with a
copy button, status.

THE APPEND-ONLY RULE — this is a hard requirement, not a preference:
  There is NO edit action and NO delete action on any ledger row. Not
  disabled, not hidden behind a permission — the buttons do not exist.
  The row menu offers only: View booking, Copy trace ID, Issue reversal.
  "Issue reversal" opens a modal that creates a NEW compensating entry
  linked to the original by reversalOf. It never touches the original row.
  Reversing entries render with a subtle coral left border and a
  "Reversal of #xxxx" link. The original shows "Reversed by #yyyy".
  Put a one-line note in the table header explaining that the ledger is
  append-only and corrections are issued as new entries — auditors and
  evaluators should see this claim on screen without asking.
Record this rule in CLAUDE.md.

## Payouts tab
Pending and completed worker payouts, batch selection, a "Release batch"
action that writes new ledger entries through the service layer, and a
trace-ID column for investigating delays.

## Gate
  build passes
  grep the finance directory for "delete" and "edit" on ledger rows —
    nothing may exist
  Issuing a reversal creates exactly one new row, leaves the original
    byte-identical, and both link to each other
  Every period's three split figures sum exactly to the gross, to the paisa
```

---

# PHASE 6 — KYC queue and Aadhaar compliance

### Prompt

```
Phase 6 only — /verification. Stop at the gate.
This phase has legal constraints. They override design and convenience.

## Layout — split screen, 40 / 60
LEFT: filterable queue, StatusPills (Pending, Submitted, Verified,
Rejected), worker avatar, name, category, submitted-at, document type.
Keyboard navigable with J/K, Enter to open.
RIGHT: document preview pane — large image viewer with zoom and rotate,
worker details beneath, and two actions: Approve (fund-green, filled) and
Reject (coral, outline — never a filled coral button).

Reject opens a required dropdown of standard reasons (Blurry image, Name
mismatch, Document expired, Wrong document type, Face not visible) plus an
optional note. The reason is what the worker's app would receive, so the
modal shows a preview of that message.

Approving advances the selection to the next item automatically — this
queue is worked in volume.

## UIDAI Circular 14 of 2025 compliance — non-negotiable
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
Write all five rules into CLAUDE.md verbatim.

## Gate
  build passes
  grep -rnE "[0-9]{12}" apps/admin-web/src returns nothing
  Reveal writes an access-log row before displaying anything
  After the 30s countdown, React DevTools shows no retained full value
  No Aadhaar substring appears in any URL at any point in the flow
```

---

# PHASE 7 — Two-way dispute queue

### Prompt

```
Phase 7 only — /disputes. Stop at the gate.

Split screen, Linear/Zendesk pattern: scrollable ticket list left, full
ticket context right.

## Left — the list
Filter tabs: All / Raised by customer / Raised by worker / Open /
Resolved. Each row carries a small origin badge making it obvious who
raised it — this symmetry is the platform's differentiator from
aggregators where only customers can complain, so make it legible at a
glance rather than burying it in a detail field. Show a counter above the
tabs: "18 raised by workers, 22 by customers."

## Right — the ticket
Three stacked sections:
  1. Header: dispute ID, booking ref, ₹ amount, both parties with avatars,
     StatusPill, and a "Resolve" action.
  2. Booking timeline — the core of the interface. A vertical hairline
     timeline reconstructing the gig from BookingEvent[]: requested,
     broadcast to N workers, accepted (with the equity rank), started,
     GPS breadcrumbs as a small inline route sparkline, messages with
     timestamps, completed, payment split. Each node has a tinted icon
     tile. Disputed moments get a coral marker.
  3. Conversation: message thread with both parties, admin replies inline,
     and internal notes visually distinct (marigold-tint background,
     "Only admins see this").

## Resolution
A modal with outcomes: Full refund, Partial refund (₹ input), Penalty
waived, No action, Warning issued. Every outcome that moves money writes
new append-only ledger entries through ledger.service — never an edit of
existing rows — and the resulting entries are shown in the modal before
confirming. After resolving, the ticket shows a resolution summary card
with the linked ledger entry IDs.

Add an "Escalate to Co-operative Ombudsman" action on unresolved tickets
older than 14 days (MSCS Amendment Act 2023 requirement), which generates
an escalation record with a reference number.

## Gate
  build passes
  Worker-raised and customer-raised tickets are equally represented and
    equally functional
  A partial refund creates the correct compensating ledger entries and the
    finance page totals change accordingly
```

---

# PHASE 8 — Cooperative Fund and governance

### Prompt

```
Phase 8 only — /fund. Stop at the gate.
This is the philosophical core of the product. Copy matters as much as
layout. Plain, warm, human language throughout. Banned vocabulary:
"capital deployment", "fund utilisation", "resource allocation",
"stakeholder value", "leverage".

## Top
Fund balance as the hero figure (36px tabular, fund-green), with
contributed-this-month, disbursed-this-month, and member count beside it.
A stacked area chart of fund growth over 12 months.
One sentence: "Every booking puts 5% here. 140 workers decide together
what it pays for."

## Active proposals
Card grid, 2 across, each proposal showing:
  title, plain-language description, proposer, closing date
  a horizontal vote bar — fund-green for, muted against, hairline for
    not-yet-voted — with counts and percentages
  a quorum indicator: "94 of 140 voted. Quorum met."
  For / Against buttons (admin votes on behalf where applicable)
  Status pill: Open, Passed, Rejected, Quorum not met
Clicking opens a detail view with the full text, the vote breakdown by
category and zone, and a comment thread.

Include a "New proposal" action with a form: title, description, amount
requested, voting window.

## Micro-loan queue
Table of requests: worker, amount, purpose, repayment plan, worker's
lifetime contribution to the fund, current outstanding. Approve disburses
through fund.service and writes ledger entries. Reject requires a reason.
Show the fund's remaining lending headroom above the table.

## Past decisions
A simple chronological list of concluded proposals with outcome and what
the money did. This is the trust artifact.

## Gate
  build passes
  Casting a vote updates tallies, quorum, and the dashboard instantly
  Disbursing a loan reduces the fund balance everywhere it appears
  grep the fund directory for the banned vocabulary — nothing found
```

---

# PHASE 9 — Settings, compliance export, and demo hardening

### Prompt

```
Phase 9 only. Stop at the gate.

## /settings
Tabbed: Platform, Dispatch, Payments, Compliance, Team.

  Dispatch   max broadcast radius slider (1–15km), ping timeout, equity
             weighting sliders (proximity / rating / inverse allocation,
             constrained to sum to 100)
  Payments   the 85/10/5 split controls

THE FRICTION REQUIREMENT: changing the worker share, platform fee, or
fund percentage must NOT save on slider release. It opens a confirmation
modal that computes and displays the live consequence in rupees:
  "This changes the worker's payout on an average ₹500 booking from
   ₹425 to ₹400. Across last month's 312 bookings that is ₹7,800 less
   to workers and ₹7,800 more to the platform."
Require typing CONFIRM to proceed. Administrators must feel the weight of
these keystrokes before they land.

  Compliance CRCS export tool (MSCS Amendment Act 2023): generates
             downloadable CSV/JSON of board decisions, related-party
             transactions, concurrent audit log, and annual returns data
             for the selected financial year. Ombudsman escalation log.
             Aadhaar access log link.

## Anti-slop audit — run this as an actual checklist and fix what fails
  1. No four identical stat cards anywhere. Every grid row has varied spans.
  2. grep for hardcoded hex in src/ — should be zero outside tokens.css.
  3. grep for rgba(0,0,0 — should be zero.
  4. No ALL-CAPS eyebrow labels above headings anywhere.
  5. No emoji. No gradient decoration. No glassmorphism.
  6. Every empty state has written direction and an action, not "No data".
  7. Every error message says what went wrong and what to do next.
  8. Every button label is a verb naming its effect ("Approve worker",
     not "Submit"), and the toast that follows uses the same word.
  9. No "→" appended to button or link text.
 10. Screenshot every page at 1280x720 and review: does any page look
     interchangeable with a generic SaaS template? Fix what does.

## Quality floor
  - Visible keyboard focus rings (marigold, 2px offset) on every control
  - prefers-reduced-motion respected — disable the chart and slide-over
    transitions
  - All charts have a text alternative or aria-label with the key figures
  - Colour never carries meaning alone: every status pill has text, every
    chart series has a label
  - Page transitions under 200ms on the demo machine

## Demo hardening
  - A global error boundary that renders a calm, branded recovery card
  - Every external dependency (map tiles, avatar URLs) has a local
    fallback. pravatar failing must not leave broken images — fall back
    to initials in a marigold-tint circle.
  - A "Reset demo data" action in Settings > Team that re-seeds the store
    to its exact initial state, so a fumbled run recovers in one click
  - Verify the whole app loads with the network throttled to Slow 3G and
    with the network fully offline after first load

## Gate
  build passes
  All 10 audit items pass
  Airplane-mode reload renders every page with no white screens
  Reset demo data restores identical figures to a fresh load
```

---

## What to watch for while the sessions run

**Push back if Claude Code proposes any of these.** Each is a quiet regression that's expensive to undo later:

- Adding a colour "for variety." The palette is nine tokens. There is no tenth.
- Adding dark mode. It doubles the surface area and you will not demo it.
- Reading the Zustand store directly in a component "just this once." That's the seam the backend swaps into.
- Making ledger rows editable "for the prototype." The immutability *is* the feature.
- Caching an Aadhaar number in state "temporarily." Never.
- Replacing the equity-ranked dispatch with nearest-worker because it's simpler. That ranking is your entire technical differentiator.
- Installing a chart library alongside Recharts. One is enough.

**Two spot-checks that catch silent failures.** After any `shadcn add`, run `grep -rn "oklch" apps/admin-web/src` — the registry serves Tailwind-v4 colours by default and they fail invisibly against your v3 config, exactly as your Phase 1 notes predicted. And if any session proposes adding a second font family, refuse — one family is the whole typographic system, and a second one is both a layout-shift risk and the fastest route back to a templated look.

**Phases 2, 4, and 5 are the demo.** The hero fund metric, the dispatch inspector showing *why* a worker was chosen, and the ledger split appearing in real time. If a session runs long, protect those three and let polish slide.
