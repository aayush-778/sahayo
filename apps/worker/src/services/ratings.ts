import { useMemo } from 'react';
import { BookingStatus, type Id, type User } from '@sahayo/shared';

import { findCustomer } from './people';
import { useSessionStore } from '../store/session';
import { CUSTOMER_FLAGS, type CustomerFlag, type CustomerRating, type Rating } from '../types';

export interface RatingView {
  rating: Rating;
  customer?: User;
}

export interface RatingSummary {
  average: number;
  count: number;
  /** How many reviews gave each star count. */
  distribution: Record<Rating['stars'], number>;
}

export function useRatings(): RatingView[] {
  const ratings = useSessionStore((state) => state.ratings);
  return useMemo(
    () =>
      [...ratings]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((rating) => ({ rating, customer: findCustomer(rating.customerId) })),
    [ratings],
  );
}

export function useRatingSummary(): RatingSummary {
  const ratings = useSessionStore((state) => state.ratings);
  return useMemo(() => {
    const distribution: Record<Rating['stars'], number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    for (const rating of ratings) {
      distribution[rating.stars] += 1;
      total += rating.stars;
    }
    return {
      average: ratings.length ? Math.round((total / ratings.length) * 10) / 10 : 0,
      count: ratings.length,
      distribution,
    };
  }, [ratings]);
}

/** The customer's review of this worker for one booking, if they left one. */
export function useRatingForBooking(bookingId: Id | undefined): Rating | undefined {
  const ratings = useSessionStore((state) => state.ratings);
  return useMemo(() => ratings.find((entry) => entry.bookingId === bookingId), [ratings, bookingId]);
}

/** This worker's rating of the customer for one booking, if given. */
export function useCustomerRating(bookingId: Id | undefined): CustomerRating | undefined {
  const ratings = useSessionStore((state) => state.customerRatings);
  return useMemo(() => ratings.find((entry) => entry.bookingId === bookingId), [ratings, bookingId]);
}

export interface CustomerRatingInput {
  bookingId: Id;
  stars: number;
  flags: CustomerFlag[];
  comment: string;
}

export type RateCustomerResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'not_finished' | 'invalid_stars' | 'already_rated' };

/**
 * The worker rates the customer.
 *
 * Both directions, not only customer-rates-worker: on most platforms only the
 * customer can complain, and a worker has no way to say a customer was abusive
 * or did not pay. Flags go to the cooperative in Phase 5. One rating per job,
 * and only once the job is done — rating a customer before the work is
 * finished would be rating a stranger.
 */
export async function rateCustomer(input: CustomerRatingInput): Promise<RateCustomerResult> {
  const { bookings, customerRatings } = useSessionStore.getState();
  const booking = bookings.find((entry) => entry.id === input.bookingId);
  if (!booking) return { ok: false, reason: 'not_found' };
  if (booking.status !== BookingStatus.COMPLETED && booking.status !== BookingStatus.SETTLED) {
    return { ok: false, reason: 'not_finished' };
  }
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) {
    return { ok: false, reason: 'invalid_stars' };
  }
  if (customerRatings.some((entry) => entry.bookingId === booking.id)) return { ok: false, reason: 'already_rated' };

  const rating: CustomerRating = {
    id: `crat_${booking.id}`,
    bookingId: booking.id,
    customerId: booking.customerId,
    stars: input.stars as CustomerRating['stars'],
    flags: CUSTOMER_FLAGS.filter((flag) => input.flags.includes(flag)),
    comment: input.comment.trim().slice(0, 300),
    createdAt: new Date().toISOString(),
  };
  useSessionStore.setState((state) => ({ customerRatings: [rating, ...state.customerRatings] }));
  return { ok: true };
}
