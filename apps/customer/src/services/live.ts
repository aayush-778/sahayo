import { useEffect, useState } from 'react';
import type { BookingRecord, CreateBookingResult, FareQuote, Id } from '@sahayo/shared';

import { calculateFare, DEMO_SURGE_ACTIVE, type FareBreakdown } from '../lib/fare';
import type { PaymentMethod } from '../lib/payment';
import { RAJENDRA_NAGAR } from '../mocks/bookings';
import { mockServiceLocation } from '../mocks/location';
import { api, ApiRequestError } from '../realtime/api';
import { isServerBacked, liveCustomerId, startRealtime, stopRealtime } from '../realtime/client';
import { useAuthStore } from '../store/auth';
import { useBookingsStore } from '../store/bookings';
import { useConnectionStore, type ConnectionMode } from '../store/connection';
import type { ServiceItem } from '../types/service-item';

/**
 * The customer app's door to the server: prices, bookings, payment, and the connection.
 *
 * Screens call these and never the socket or fetch. Each chooses between the server and
 * the offline demo flow, so a screen asks one question — "is this booking live?" — rather
 * than knowing how either works.
 */

export { isServerBacked };

/** Keeps the live connection open while someone is signed in. Mounted once, at the root. */
export function useRealtimeSession(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const phone = useAuthStore((state) => state.phone);
  useEffect(() => {
    if (!isAuthenticated || !phone) {
      stopRealtime();
      // The server's bookings belonged to whoever signed out.
      useBookingsStore.setState({ live: {} });
      return;
    }
    void startRealtime(phone);
  }, [isAuthenticated, phone]);
}

export interface ConnectionView {
  mode: ConnectionMode;
  attempt: number;
  restoredAt: number | null;
}

export function useConnection(): ConnectionView {
  const mode = useConnectionStore((state) => state.mode);
  const attempt = useConnectionStore((state) => state.attempt);
  const restoredAt = useConnectionStore((state) => state.restoredAt);
  return { mode, attempt, restoredAt };
}

/** True while the app is on the server, so booking goes through it. Re-renders when that changes. */
export function useServerBacked(): boolean {
  const mode = useConnectionStore((state) => state.mode);
  return mode === 'live' || mode === 'reconnecting';
}

export interface Quote {
  fare: FareBreakdown;
  /** 'server' is the price the server will charge; 'estimate' is the offline calculation. */
  source: 'server' | 'estimate';
  /** The multiplier behind the surge row, e.g. 1.378. */
  multiplier: number;
  /** Still waiting for the server's price. The estimate is shown meanwhile. */
  loading: boolean;
}

function breakdownOf(quote: FareQuote): FareBreakdown {
  return {
    base: quote.base,
    surge: quote.surge,
    itemTotal: quote.itemTotal,
    platformFee: quote.platformShare,
    coopFund: quote.coopFundShare,
    workerEarns: quote.workerShare,
    gst: quote.gst,
    total: quote.total,
  };
}

/**
 * The fare for an item, now (`scheduledFor` null) or ahead of time.
 *
 * Connected, it is the server's quote — urgency, weather and demand, capped — and nothing
 * is calculated here. Offline, the old local calculation stands in, marked as an estimate,
 * so a dropped network never leaves the booking screen without a price.
 */
export function useFareQuote(item: ServiceItem | undefined, scheduledFor: string | null): Quote | undefined {
  const serverBacked = useServerBacked();
  const [server, setServer] = useState<{ key: string; quote: FareQuote } | null>(null);
  const key = `${item?.id ?? ''}|${scheduledFor ?? 'now'}`;

  useEffect(() => {
    if (!item || !serverBacked) return;
    let cancelled = false;
    void api<FareQuote>('POST', '/pricing/quote', {
      serviceItemId: item.id,
      point: mockServiceLocation.point,
      ...(scheduledFor ? { scheduledFor } : {}),
    })
      .then((quote) => {
        if (!cancelled) setServer({ key, quote });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [item, scheduledFor, serverBacked, key]);

  if (!item) return undefined;
  if (serverBacked && server?.key === key) {
    return { fare: breakdownOf(server.quote), source: 'server', multiplier: server.quote.multiplier, loading: false };
  }
  const estimate = calculateFare(item, !scheduledFor && DEMO_SURGE_ACTIVE);
  return {
    fare: estimate,
    source: 'estimate',
    multiplier: estimate.base > 0 ? Math.round((estimate.itemTotal / estimate.base) * 1000) / 1000 : 1,
    loading: serverBacked,
  };
}

export type BookResult = { ok: true; bookingId: Id } | { ok: false; message: string };

/**
 * Books an item through the server at the server's price. The booking is dispatched the
 * moment it exists; the customer pays once the job is done.
 */
export async function bookLive(item: ServiceItem, scheduledFor: string | null): Promise<BookResult> {
  const customerId = liveCustomerId();
  if (!customerId) return { ok: false, message: 'Not connected to the cooperative. Try again in a moment.' };
  try {
    const { record } = await api<CreateBookingResult>('POST', '/bookings', {
      customerId,
      serviceItemId: item.id,
      address: RAJENDRA_NAGAR,
      ...(scheduledFor ? { scheduledFor } : {}),
    });
    useBookingsStore.getState().upsertLive(record.booking.id, (current) => ({ ...current, record, serviceItemId: item.id }));
    return { ok: true, bookingId: record.booking.id };
  } catch (error) {
    return { ok: false, message: error instanceof ApiRequestError ? error.message : 'The booking could not be made. Try again.' };
  }
}

export type PayResult = { ok: true } | { ok: false; message: string };

/** Records payment for a finished server booking. */
export async function payLiveBooking(bookingId: Id, method: PaymentMethod, transactionId?: string): Promise<PayResult> {
  const customerId = liveCustomerId();
  if (!customerId) return { ok: false, message: 'Not connected to the cooperative. Try again in a moment.' };
  try {
    const record = await api<BookingRecord>('POST', `/bookings/${encodeURIComponent(bookingId)}/payment`, {
      customerId,
      method,
      ...(transactionId ? { transactionId } : {}),
    });
    useBookingsStore.getState().upsertLive(bookingId, (current) => ({ ...current, record }));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof ApiRequestError ? error.message : 'The payment could not be recorded. Try again.' };
  }
}
