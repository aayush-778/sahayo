import {
  COOP_FUND_SHARE,
  GST_RATE,
  PLATFORM_SHARE,
  SURGE_MULTIPLIER,
  type Paise,
} from '@sahayo/shared';

import { bookableBasePaise } from '@sahayo/shared/service-items';
import type { ServiceItem } from '../types/service-item';

/**
 * Demand surge, for the demo.
 *
 * Phase 5 derives this from live supply and demand inside the broadcast
 * radius. Until then it is one flag, flipped by hand, so the surge line can
 * be shown or hidden on stage without editing arithmetic. `SURGE_MULTIPLIER`
 * itself lives in `@sahayo/shared` — the rate is a business rule, only the
 * "is it on right now" is a demo concern.
 */
export const DEMO_SURGE_ACTIVE = true;

/**
 * What a "book now" actually charges for, per pricing mode — defined beside the item
 * catalogue in @sahayo/shared, because the backend prices bookings with it.
 */
export { bookableBasePaise } from '@sahayo/shared/service-items';

/**
 * Every line of the fare panel, in integer paise.
 *
 * THE MODEL, because two readings of it are possible and they give different
 * totals. `platformFee` and `coopFund` are shares OF the item total, not
 * additions to it — the customer pays the item price, and that price is then
 * divided between the worker, the platform and the cooperative fund. The only
 * thing added on top is GST, which is collected and remitted and was never
 * ours to split. So:
 *
 *     total = base + surge + GST
 *
 * and NOT `base + surge + platformFee + coopFund + GST`, which would bill the
 * customer 10% extra and make the community fund look like a surcharge for a
 * social programme rather than a share of margin the platform gave up.
 *
 * `workerEarns` is the remainder rather than a fourth rounded share, so the
 * three shares always sum to `itemTotal` exactly with no stray paisa. The
 * same trick the settled fares in `mocks/bookings.ts` use.
 */
export interface FareBreakdown {
  /** The item's own price before any multiplier. */
  base: Paise;
  /** Extra charged because surge is in effect. Zero when it is not. */
  surge: Paise;
  /** `base + surge` — the price the shares below are taken out of. */
  itemTotal: Paise;

  /** Taken out of `itemTotal`, not added to it. */
  platformFee: Paise;
  /** Taken out of `itemTotal`, not added to it. THE fund. */
  coopFund: Paise;
  /** What reaches the worker: `itemTotal` less the two shares above. */
  workerEarns: Paise;

  /** Added on top. */
  gst: Paise;
  /** `itemTotal + gst`. What the customer is charged. */
  total: Paise;
}

export function calculateFare(item: ServiceItem, surgeActive: boolean): FareBreakdown {
  const base = bookableBasePaise(item);
  const surge = surgeActive ? Math.round(base * (SURGE_MULTIPLIER - 1)) : 0;
  const itemTotal = base + surge;

  const platformFee = Math.round(itemTotal * PLATFORM_SHARE);
  const coopFund = Math.round(itemTotal * COOP_FUND_SHARE);
  const workerEarns = itemTotal - platformFee - coopFund;

  const gst = Math.round(itemTotal * GST_RATE);

  return {
    base,
    surge,
    itemTotal,
    platformFee,
    coopFund,
    workerEarns,
    gst,
    total: itemTotal + gst,
  };
}

/**
 * Rebuilds a breakdown from an item total that is already known.
 *
 * Used when a fare is read back rather than quoted — a booking already
 * carries its split, and the tracker has to show the same numbers the
 * customer agreed to rather than re-pricing the job. Surge is reported as
 * zero because it is not recoverable after the fact: whatever multiplier
 * applied is already baked into the total, and inventing a split of it would
 * be a guess presented as a receipt.
 */
export function fareFromItemTotal(itemTotal: Paise): FareBreakdown {
  const platformFee = Math.round(itemTotal * PLATFORM_SHARE);
  const coopFund = Math.round(itemTotal * COOP_FUND_SHARE);

  return {
    base: itemTotal,
    surge: 0,
    itemTotal,
    platformFee,
    coopFund,
    workerEarns: itemTotal - platformFee - coopFund,
    gst: Math.round(itemTotal * GST_RATE),
    total: itemTotal + Math.round(itemTotal * GST_RATE),
  };
}

/**
 * Minutes until the nearest available worker could be at the door — defined in
 * @sahayo/shared, because the tracker quotes the same ETA from a live position.
 */
export { etaMinutesFor } from '@sahayo/shared';
