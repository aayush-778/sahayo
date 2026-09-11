import { create } from 'zustand';

import type { Id } from '@sahayo/shared';
import type { ServiceItem } from '../types/service-item';
import { findServiceItem } from '../mocks/serviceItems';

/**
 * The item the customer is part-way through booking.
 *
 * WHY A STORE AND NOT ROUTE PARAMS — the sub-phase left this call open, so:
 * a `ServiceItem` is a six-shape discriminated union, and serialising one
 * into a URL param means `JSON.stringify` on the way out and an untyped
 * `JSON.parse` on the way in, which throws away exactly the type safety the
 * union exists to provide. The booking flow is also about to accumulate an
 * address, a slot and notes across `now`, `schedule` and `payment` — that is
 * a draft, and a draft threaded through three screens' params is how those
 * screens end up knowing about each other.
 *
 * ONLY IDS ARE STORED, never the resolved object. The catalogue stays the one
 * source of truth, a stale draft cannot outlive an item that changed under
 * it, and the draft survives Fast Refresh, which a captured object would not.
 *
 * NOT PERSISTED, deliberately. A half-finished booking restored days later on
 * a cold start is worse than no booking at all — the customer has forgotten
 * it and the price may have moved. `useAuthStore` persists because identity
 * outlives a session; a draft does not.
 */

/** Which exit the customer took off the item row. */
export type BookingIntent = 'now' | 'schedule';

export interface BookingDraftState {
  subCategoryId: Id | null;
  serviceItemId: Id | null;
  intent: BookingIntent | null;
  /**
   * The chosen slot, as an ISO instant — the shape `Booking.scheduledFor`
   * takes, so Phase 5 sends it straight through. Null for "book now", which
   * is what an unset `scheduledFor` already means on a booking.
   */
  scheduledFor: string | null;

  /** Records the row that was tapped and which button was used. */
  select: (subCategoryId: Id, serviceItemId: Id, intent: BookingIntent) => void;
  /** Records the date and time slot chosen on the schedule screen. */
  setSchedule: (scheduledFor: string | null) => void;
  clear: () => void;
}

export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  subCategoryId: null,
  serviceItemId: null,
  intent: null,
  scheduledFor: null,

  // Choosing a different service abandons any slot picked for the old one.
  select: (subCategoryId, serviceItemId, intent) =>
    set({ subCategoryId, serviceItemId, intent, scheduledFor: null }),

  setSchedule: (scheduledFor) => set({ scheduledFor }),

  clear: () =>
    set({ subCategoryId: null, serviceItemId: null, intent: null, scheduledFor: null }),
}));

/**
 * The drafted item, resolved from the catalogue.
 *
 * A hook rather than a field so the booking screens read the item the same
 * way every other screen reads the catalogue, and so an id that no longer
 * resolves is `undefined` at the point of use instead of a stale object.
 */
export function useDraftedServiceItem(): ServiceItem | undefined {
  const serviceItemId = useBookingDraftStore((state) => state.serviceItemId);
  return serviceItemId ? findServiceItem(serviceItemId) : undefined;
}
