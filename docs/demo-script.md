# Sahayo — the demo, start to finish

Written for whoever is presenting: the exact path, who touches which device, what to say,
and what should happen. Times are from measured runs over USB; they are what "fast" looks
like, not a promise.

**Three devices, three people.** One laptop (backend, admin portal, projector), one
customer phone, one worker phone. One person can run it alone if the phones are on the
table side by side, but the timings read better with three.

Cast, fixed in the seed:

| Who | Where | Signs in as |
| --- | --- | --- |
| Neha Sinha, customer | Rajendra Nagar, Patna | `+91 98350 44712`, OTP `123456` |
| Suresh Yadav, electrician | 460 m from Neha | `+91 94310 67203`, OTP `123456` |
| Anjali Verma, cooperative administrator | the laptop | already signed in |

---

## Before you speak: the setup

Run these in order. The checklist in `demo-checklist.md` is the five-minute version.

```
pnpm dev:backend        # terminal 1, stays open on the projector
pnpm demo:tunnel        # terminal 2, after both phones are plugged in
pnpm demo:reset         # terminal 2, with both apps closed
pnpm dev:admin          # terminal 3 → http://localhost:3000
pnpm dev:customer       # terminal 4, then open the app on the customer phone
pnpm dev:worker         # terminal 5, then open the app on the worker phone
```

`demo:tunnel` is the one that matters most. It runs `adb reverse tcp:4000 tcp:4000` on
each phone, so `localhost:4000` on the phone means the laptop — no wifi involved, and
venue AP isolation cannot touch it. **It dies when a cable is unplugged. Run it again if
anything moves.** A phone that lost its tunnel shows a grey "Offline: showing demo data"
strip at the top of the app, which is the tell.

`demo:reset` prints the fund total it left behind — **₹32,59,180** — and the eight members
standing around Rajendra Nagar, Suresh nearest at 0.46 km. Those are the numbers the run
starts from, every time.

On the phones: worker app → sign in, then the **Available for work** switch to Online.
Customer app → sign in. Admin portal → **Live Dispatch**, projected.

---

## Act 1 — the booking (about 40 seconds)

**Customer phone.** Home → *Electrician* → *Ceiling fan installation* → **Book now** →
confirm the address → **Confirm booking**.

> "Neha's fan has stopped. She books an electrician the way she'd book a cab."

**What happens, and how fast.** The request reaches the worker's phone in about 10 ms over
USB, and under 2 seconds is the number we hold ourselves to.

**Worker phone.** It rings, full screen, with a 30-second countdown.

**Laptop console — point at this.** The dispatch table prints itself:

```
━━ DISPATCH  BKG-12001 · Ceiling fan installation · Rajendra Nagar · ₹471 ────── 14:22:07
round 1   5.0 km radius · 8 available electricians found

   #  worker                      dist   proximity     rating        fewer jobs     score
   1  Suresh Yadav          app   0.46 km   .91 × .30 + .86 × .25 + .90 × .45  =  0.89  → offered
   …
offered   5 workers at once · 3 with the app open · answer within 30 s
·          offers sent 9 ms after the booking was made
```

> "Five members were offered it at once. Not the nearest — the *fairest*: distance,
> rating, and how little work they've had this week, weighted 30, 25 and 45 per cent.
> Suresh is top because he's had the fewest jobs."

**Admin portal — Live Dispatch.** The request opens by itself in the inspector on the
right: who was offered it, the three score bars for each, who had the app open, and
"Waiting for someone to accept."

---

## Act 2 — the accept (about 30 seconds)

**Worker phone.** Tap **Accept**.

**Customer phone** — within a second, and measured at a few milliseconds: Suresh's name,
photo, rating, ETA, and the **arrival code** the customer will read out at the door.

**Laptop console:**

```
✔ ACCEPTED  Suresh Yadav (rank 1, score 0.89) after 1,940 ms · 4 others told it is taken
·           customer's room told 2 ms after the accept
```

**Admin inspector** now reads "Suresh Yadav took it 1.9 seconds after the request", and
Suresh carries a **Took it** badge in the ranking.

> "The other four were told instantly. No race, no double-booking — the server decides."

**Optional, if nobody wants to walk about:** run `pnpm demo:walk` on the laptop. It drives
Suresh along a fixed route to Neha's door at 18 km/h, one position every five seconds, so
the customer's map and the admin's dispatch map both move while you keep talking.

---

## Act 3 — the job (about a minute)

**Worker phone**, in order: **On my way** → **I've arrived** → ask the customer for the
four-digit code → type it → **Start work**.

**Customer phone** follows each step live, with the worker's marker gliding rather than
jumping.

> "The code is the customer's. A job can't be marked started, finished and paid without
> someone actually reaching the door."

---

## Act 4 — the finale (about 40 seconds) — do not rush this

**Switch the projector to the admin Dashboard before the next tap.**

**Worker phone.** Tap **Complete**.

Watch the portal:

1. A green card rises: **"₹471 split three ways, to the paisa"** — ₹424 to Suresh, ₹24 to
   run the platform, ₹24 to the cooperative fund.
2. **"The cooperative fund now holds ₹32,59,203"**, counting up from ₹32,59,180.
3. The Cooperative Fund figure at the top of the dashboard counts up with it.

> "Five per cent of every job goes into a fund the workers own. Not a fee we keep — money
> they vote on. That number moved because Suresh finished a job."

Click **"See the three rows in Finance"** on the card: the three ledger rows are there,
highlighted green, with the trace ids.

**Customer phone.** Pay → the receipt records against the same booking.

---

## Act 5 — the cooperative (about a minute)

Pick whichever two land best with the room:

- **Worker phone → Cooperative fund.** What the fund holds, what this member put in, what
  it has already paid for, and the proposals open for a vote. Cast a vote on stage.
- **Admin → Verification.** Open the first pending member, click **Approve worker**. If
  that member's phone is signed in (worker app → Profile → Demo tools → *Sign in as a
  pending member*), it flips to approved in about 12 ms — the app opens up in front of you.
- **Admin → Cooperative Fund.** The fund's balance, its programmes, and the ledger behind
  them.
- **Worker phone → Scheduled requests.** Work customers booked for later: no countdown,
  grouped by day, with a clash warning when a slot overlaps a job already taken. Tap
  **Review clash** to show the overlap on its timeline.

---

## If something goes wrong

| What you see | What it means | What to do |
| --- | --- | --- |
| Grey strip: "Offline: showing demo data" | That phone cannot reach the laptop | Re-run `pnpm demo:tunnel`. The app keeps working on demo data meanwhile — carry on talking, nothing on screen breaks |
| Amber strip: "Reconnecting…" | The backend went away mid-run | It reconnects on its own; the data on screen stays |
| Admin header says "Demo data" | The portal cannot reach the backend | The portal runs on its own seed; everything still renders. Check terminal 1 |
| The offer never rings | Suresh is offline, or the tunnel is down | Worker app → switch to Online; then `pnpm demo:tunnel` |
| A judge asks for a second run | — | Close both apps, `pnpm demo:reset`, reopen. Same numbers, same fund total |

## The lines worth having ready

- **"Why is this a cooperative and not just an app?"** — 5% of every job goes to a fund the
  members own and vote on. The admin portal's Finance page shows the three-way split on
  every single booking, and the Cooperative Fund page shows what the fund has paid for.
- **"How do you decide who gets the job?"** — Equity score: proximity 30%, rating 25%, and
  how little work you've had this week 45%. The console prints the arithmetic for every
  candidate, and the admin can show it after the fact for any booking.
- **"Does it work without internet?"** — Every app falls back to its own data with a visible
  badge. Nothing crashes, nothing shows a stack trace.
