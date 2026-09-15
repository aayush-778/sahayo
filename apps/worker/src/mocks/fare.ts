import { COOP_FUND_SHARE, PLATFORM_SHARE, type BookingFare, type Paise } from '@sahayo/shared';

/**
 * Splits an item total into the three shares, in integer paise.
 *
 * The worker's share is the remainder rather than a third rounded figure, so
 * the three always sum to the total exactly — the same rule the customer app's
 * settled fares follow. The percentages come from @sahayo/shared and are never
 * typed here.
 */
export function splitFare(total: Paise): BookingFare {
  const platformShare = Math.round(total * PLATFORM_SHARE);
  const coopFundShare = Math.round(total * COOP_FUND_SHARE);
  return {
    total,
    workerShare: total - platformShare - coopFundShare,
    platformShare,
    coopFundShare,
  };
}
