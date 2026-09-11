import type { Id, Paise } from '@sahayo/shared';

/**
 * Saved payment instruments for the demo customer.
 *
 * NO BRAND LOGOS. The card brand is carried as plain text — "Visa •••• 8492"
 * — beside a neutral card glyph. Bundling Visa, Mastercard or Amex artwork
 * into the app would be shipping someone else's trademark as an asset;
 * naming the brand is ordinary nominative use and needs nobody's permission.
 * The same reasoning kept the OpenStreetMap credit on the booking map.
 *
 * These numbers are not card numbers. `last4` is four digits of nothing, and
 * no full number exists anywhere in the app — the "add new card" fields on
 * the payment screen are local component state that is never stored, never
 * passed to the provider, and never leaves the screen.
 */

export interface SavedCard {
  id: Id;
  /** Displayed as text. Never used to look up an image. */
  brand: string;
  last4: string;
  /** MM/YY, as printed on a card. */
  expires: string;
}

export const savedCards: SavedCard[] = [
  { id: 'card_visa', brand: 'Visa', last4: '8492', expires: '11/30' },
  { id: 'card_mastercard', brand: 'Mastercard', last4: '7294', expires: '01/28' },
  { id: 'card_amex', brand: 'Amex', last4: '8321', expires: '05/28' },
];

/** Which card is default on a cold start. Changeable from the payment screen. */
export const DEFAULT_CARD_ID: Id = 'card_visa';

/**
 * The Sahayo cooperative wallet.
 *
 * A member wallet rather than Paytm or PhonePe, which avoids third-party
 * marks entirely and says something the other options do not: money held
 * inside the cooperative, spendable on its own services.
 *
 * ₹2,500 is deliberately not enough for everything in the catalogue. A
 * monthly retainer runs past it, so the insufficient-balance state is
 * reachable in a demo rather than being dead code nobody ever sees.
 */
export const walletBalancePaise: Paise = 250000;

/** UPI handle suffix used to prefill the field, so nobody types on stage. */
export const UPI_SUFFIX = '@upi';

/** A UPI id is `something@handle`. Loose on purpose — this validates shape,
 *  not existence, and no real VPA is ever contacted. */
export function isPlausibleUpiId(value: string): boolean {
  const trimmed = value.trim();
  const at = trimmed.indexOf('@');
  return at > 0 && at < trimmed.length - 1 && !trimmed.includes(' ');
}
