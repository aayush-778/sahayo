# Five minutes before you walk in

Written for whoever is presenting. Work down it; nothing here takes longer than it says.
The full run-through is in `demo-script.md`.

## 1. Phones on the cable (90 seconds)

- [ ] Both phones plugged into the laptop, USB debugging on.
- [ ] `adb devices` lists **two** phones, both saying `device` — not `unauthorized`. If one
      says `unauthorized`, unlock it and accept the prompt on its screen.
- [ ] `pnpm demo:tunnel` → it prints "localhost:4000 on this phone is now this laptop" for
      both, and "2 of 2 phones tunnelled".

Re-run `demo:tunnel` after **any** unplug, knock, or phone reboot. It does not survive them.

## 2. Backend (30 seconds)

- [ ] `pnpm dev:backend` running in its own terminal, the one you will project.
- [ ] It printed `listening on http://localhost:4000/api/v1`.
- [ ] `curl http://localhost:4000/api/v1/health` → `{"ok":true}`.

## 3. Reset the board (30 seconds) — with both apps closed

- [ ] `pnpm demo:reset`.
- [ ] It says the fund is back to **₹32,59,180**.
- [ ] It lists **8 members online**, Suresh Yadav first at 0.46 km.

Closed apps matter: a phone holding bookings the server has just forgotten looks broken.

## 4. The three screens (90 seconds)

- [ ] `pnpm dev:admin` → `http://localhost:3000` open on **Live Dispatch**, projected.
- [ ] The header pill says **Live**, not "Demo data".
- [ ] Customer app open, signed in as Neha (`+91 98350 44712`, OTP `123456`), **no grey
      offline strip at the top**.
- [ ] Worker app open, signed in as Suresh (`+91 94310 67203`, OTP `123456`), **no grey
      offline strip**, switch set to **Online**.

If you changed `EXPO_PUBLIC_API_URL` or any `.env`, Metro must be restarted with `-c` —
those values are baked in when the bundle is built.

## 5. Sound and screen (30 seconds)

- [ ] Laptop volume up, and the worker phone's ringer on: the offer plays a sound, and it
      lands better than the countdown alone.
- [ ] Phone screens set to stay awake (Settings → Display → Screen timeout → 10 minutes),
      and brightness up.
- [ ] Both phones on Do Not Disturb, so nothing slides over the demo.
- [ ] Projector mirrors the laptop; the console window is readable from the back row.

## 6. One silent rehearsal (60 seconds)

Run the whole thing once, without narrating:

- [ ] Book from the customer phone → the worker phone rings inside two seconds.
- [ ] Accept → the customer sees Suresh's name, ETA and arrival code.
- [ ] On my way → Arrived → code → Start → Complete.
- [ ] The admin dashboard's green card appears and the fund counts up to **₹32,59,203**.
- [ ] `pnpm demo:reset` again, apps closed, and reopen them.

If the rehearsal ran clean, the real one will: nothing in it depends on the network, the
weather, the time of day, or anything random.

## Keep within reach

| | |
| --- | --- |
| Re-tunnel a phone | `pnpm demo:tunnel` |
| Start over | close apps → `pnpm demo:reset` → reopen |
| Book without touching the phone | `pnpm demo:request` |
| Book one for later | `pnpm demo:request -- --scheduled +50m` |
| Move the worker without walking | `pnpm demo:walk` |
