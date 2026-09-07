/**
 * Revenue split. Must sum to 1.
 * The cooperative fund share is the differentiator of this platform: every
 * settled booking routes a slice into the workers' collectively owned fund.
 */
export const WORKER_SHARE = 0.85;
export const PLATFORM_SHARE = 0.1;
export const COOP_FUND_SHARE = 0.05;

/** Default broadcast radius, in metres, when searching for nearby workers. */
export const DEFAULT_RADIUS_M = 5000;

/** How long a worker has to accept a broadcast gig offer before it expires. */
export const GIG_OFFER_TIMEOUT_MS = 30_000;
