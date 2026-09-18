/**
 * Where the backend is, and how the app talks to it.
 *
 * The default is localhost, because the demo runs over USB rather than the venue's wifi:
 *
 *   adb -s <serial> reverse tcp:4000 tcp:4000     (or: pnpm demo:tunnel)
 *
 * That makes port 4000 on the phone the laptop's port 4000, with no network in between —
 * immune to the AP isolation most venue wifi has. The tunnel does not survive unplugging
 * the cable, so it is the first line of the pre-demo checklist.
 *
 * EXPO_PUBLIC_* variables are inlined by Metro at bundle time, so a wifi demo instead sets
 * the laptop's LAN address (the backend prints it at startup) in apps/customer/.env and restarts
 * Metro with -c:
 *
 *   EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
 *
 * With neither, the app runs on its demo data with the offline banner showing.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

export const API_PREFIX = '/api/v1';

/** Give up on one REST call after this long. Venue wifi fails slowly rather than quickly. */
export const REQUEST_TIMEOUT_MS = 6_000;

/** Reconnection backoff: 1 s, 2 s, 4 s, 8 s, then every 15 s, each ±25%. */
export const RECONNECT = { delayMs: 1_000, maxDelayMs: 15_000, randomization: 0.25 } as const;
