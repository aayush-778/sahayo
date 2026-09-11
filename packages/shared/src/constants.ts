/**
 * Revenue split. Must sum to 1.
 *
 * These are shares OF the item price, not fees added to it. A customer paying
 * ₹749 for a job is paying ₹749; this says where that ₹749 goes. The only
 * thing added on top is statutory GST.
 *
 * The cooperative fund share is the differentiator of this platform: every
 * settled booking routes a slice into the workers' collectively owned fund,
 * and it costs the customer nothing extra — it comes out of the 10% the
 * platform would otherwise keep for itself.
 *
 * PLATFORM_SHARE dropped from 0.10 to 0.05 in sub-phase 2.6, when the fare
 * panel was specified as "platform fee 5%". The invariant is that the three
 * sum to exactly 1, so the 5 points came off the platform and went to the
 * worker rather than being left unallocated: 90% to the worker is also the
 * stronger number to put in front of the Ministry of Cooperation.
 */
export const WORKER_SHARE = 0.9;
export const PLATFORM_SHARE = 0.05;
export const COOP_FUND_SHARE = 0.05;

/**
 * GST on the service, added on top of the item price.
 *
 * 18% is the standard rate for the maintenance, repair and household services
 * in this catalogue. The seed catalogue's own `meta.note` states its prices
 * are exclusive of GST, so this is the line that reconciles them.
 *
 * Unlike the shares above this is genuinely additive — it is collected from
 * the customer and remitted, and it is not ours to split.
 */
export const GST_RATE = 0.18;

/**
 * Demand multiplier applied to the item price when surge is in effect.
 *
 * Phase 5 computes this from live supply and demand in the broadcast radius.
 * Until then it is a flat 1.5× behind a demo flag — see `DEMO_SURGE_ACTIVE`
 * in the customer app.
 */
export const SURGE_MULTIPLIER = 1.5;

/** Default broadcast radius, in metres, when searching for nearby workers. */
export const DEFAULT_RADIUS_M = 5000;

/** How long a worker has to accept a broadcast gig offer before it expires. */
export const GIG_OFFER_TIMEOUT_MS = 30_000;
