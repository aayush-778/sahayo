import type { BookingAddress, Id } from '@sahayo/shared';

/**
 * Saved addresses and support content for the profile section.
 *
 * Both are display-only mocks. Addresses reuse `BookingAddress` from
 * @sahayo/shared so the address picker Phase 5 adds has the right shape to
 * hand a booking, and the label lives in an index beside them rather than on
 * the record — `BookingAddress` has no `label`, and adding one to make a
 * screen easier is the drift the `satisfies` guards exist to catch.
 */

export interface SavedAddress {
  id: Id;
  /** Catalogue key for the label — 'home', 'work', 'other'. */
  labelKey: 'home' | 'work' | 'other';
  address: BookingAddress;
}

export const savedAddresses: SavedAddress[] = [
  {
    id: 'addr_home',
    labelKey: 'home',
    address: {
      line1: 'Flat 3B, Shivam Apartment',
      line2: 'Road No. 4, Rajendra Nagar',
      city: 'Patna',
      state: 'Bihar',
      pincode: '800016',
      point: { lat: 25.6013, lng: 85.1553 },
    },
  },
  {
    id: 'addr_work',
    labelKey: 'work',
    address: {
      line1: 'Second Floor, Maurya Tower',
      line2: 'Fraser Road, Patna Junction',
      city: 'Patna',
      state: 'Bihar',
      pincode: '800001',
      point: { lat: 25.6118, lng: 85.1352 },
    },
  },
];

/** The address a new booking defaults to. */
export const DEFAULT_ADDRESS_ID: Id = 'addr_home';

/**
 * FAQ entries, keyed for the catalogue.
 *
 * The questions and answers are translated strings, not data, so only their
 * keys live here — the copy is in `support.faq.*` in both languages. Keeping
 * the order in code means Hindi and English cannot end up in different
 * orders, which is what happens when a list is duplicated per language.
 */
export const FAQ_KEYS = [
  'coopFund',
  'workerShare',
  'cancel',
  'payment',
  'reschedule',
  'verified',
] as const;

export type FaqKey = (typeof FAQ_KEYS)[number];

/** The cooperative's support line. Displayed, never dialled automatically. */
export const SUPPORT_PHONE = '+91 612 435 0100';
export const SUPPORT_EMAIL = 'help@sahayo.in';
