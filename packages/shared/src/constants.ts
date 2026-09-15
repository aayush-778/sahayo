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

/**
 * How the equity dispatcher weighs a worker when a request is broadcast.
 *
 * This is the platform's technical differentiator and the reason it is not a
 * nearest-worker dispatcher. `INVERSE_ALLOCATION` carries the most weight of the
 * three: a worker who has taken few jobs this week is ranked up, which is how
 * income is stopped from concentrating in the hands of whoever happens to be
 * closest to the customer.
 *
 * Must sum to 1. The weights are administrator-adjustable in settings, which is
 * why they live here rather than inside the ranking function.
 */
export const EQUITY_WEIGHT_PROXIMITY = 0.3;
export const EQUITY_WEIGHT_RATING = 0.25;
export const EQUITY_WEIGHT_INVERSE_ALLOCATION = 0.45;

/**
 * What the cooperative fund is saving toward, in paise (₹50,00,000).
 *
 * A stated target rather than a cap — it is what the fund's progress bar runs
 * against, so members can see how far the 5% has carried them.
 *
 * Sized against the platform, not picked for the look of it. 140 members
 * averaging 296 lifetime jobs at roughly ₹1,725 a job route about ₹37,00,000
 * into the fund over the platform's life, so a ₹10,00,000 target would already
 * have been passed three times over and the progress bar would read 370%. At
 * ₹50,00,000 the bar sits a little past halfway, which is what a target is for.
 * Raise it again if the membership grows.
 */
export const FUND_COMMUNITY_GOAL = 500_000_000;

/**
 * Share of the fund's balance it will lend against at any time.
 *
 * The fund keeps the rest liquid: a micro-loan book that consumes the whole
 * balance cannot also pay an accident claim the week it is needed.
 */
export const FUND_LENDING_HEADROOM_SHARE = 0.35;

/**
 * Fraction of eligible members who must vote for a proposal's result to count.
 *
 * Quorum is about participation, not approval — a proposal can fail quorum while
 * every vote cast was in favour, and the UI says so rather than reporting it as
 * a rejection.
 */
export const PROPOSAL_QUORUM_SHARE = 0.6;
