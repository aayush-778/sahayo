import { GST_RATE, SURGE_MULTIPLIER, Weather, type FareQuote, type Paise } from '@sahayo/shared';
import { splitAmount } from '@sahayo/shared/seed/ledger';
import { bookableBasePaise, type ServiceItem } from '@sahayo/shared/service-items';

/**
 * The fare engine. The customer app used to compute its fares locally; it now asks.
 *
 *   multiplier = 1 + urgency + weather + demand,  capped at SURGE_MULTIPLIER
 *   item total = base × multiplier            (what the 90/5/5 split is taken out of)
 *   total      = item total + GST             (GST is added on top, never split)
 *
 * A booking made ahead of time carries none of the three surcharges: they are all
 * statements about right now.
 */
export const PRICING = {
  /** Wanting someone today rather than on a day of your choosing. */
  URGENCY_NOW: 0.15,
  WEATHER: { [Weather.CLEAR]: 0, [Weather.CLOUDY]: 0, [Weather.RAIN]: 0.2, [Weather.HEAVY_RAIN]: 0.25 } as Record<Weather, number>,
  /** The most the demand term can add, reached when open requests outnumber free workers two to one. */
  DEMAND_MAX: 0.25,
  /** No fare is ever more than this multiple of its base price. */
  CAP: SURGE_MULTIPLIER,
} as const;

/**
 * Demand pressure in the broadcast radius, as a surcharge from 0 to DEMAND_MAX.
 *
 * Zero while there is at least one free worker for every two open requests; rising
 * linearly to the maximum when open requests outnumber free workers two to one.
 */
export function demandFactor(openRequests: number, freeWorkers: number): number {
  const pressure = (openRequests + 1) / Math.max(1, freeWorkers);
  const normalised = Math.max(0, Math.min(1, (pressure - 0.5) / 1.5));
  return Math.round(normalised * PRICING.DEMAND_MAX * 1000) / 1000;
}

export interface QuoteInput {
  item: ServiceItem;
  scheduled: boolean;
  weather: Weather;
  openRequests: number;
  freeWorkers: number;
  now?: Date;
}

export function quoteFare({ item, scheduled, weather, openRequests, freeWorkers, now = new Date() }: QuoteInput): FareQuote {
  const base: Paise = bookableBasePaise(item);
  const factors = scheduled
    ? { urgency: 0, weather: 0, demand: 0 }
    : { urgency: PRICING.URGENCY_NOW, weather: PRICING.WEATHER[weather], demand: demandFactor(openRequests, freeWorkers) };
  const asked = 1 + factors.urgency + factors.weather + factors.demand;
  const multiplier = Math.min(PRICING.CAP, Math.round(asked * 1000) / 1000);
  const itemTotal = Math.round(base * multiplier);
  const split = splitAmount(itemTotal);
  const gst = Math.round(itemTotal * GST_RATE);

  return {
    serviceItemId: item.id,
    base,
    factors,
    weather,
    multiplier,
    capped: asked > PRICING.CAP,
    surge: itemTotal - base,
    itemTotal,
    workerShare: split.worker,
    platformShare: split.platform,
    coopFundShare: split.coopFund,
    gst,
    total: itemTotal + gst,
    quotedAt: now.toISOString(),
  };
}
