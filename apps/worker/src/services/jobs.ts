import { useEffect, useMemo } from 'react';
import { BookingStatus, GIG_OFFER_TIMEOUT_MS, type Booking, type Id } from '@sahayo/shared';

import { DEMO_WORKER_ID, mockJobRequests } from '../mocks';
import { startCodeFor, useSessionStore } from '../store/session';
import { useWorkerStore } from '../store/worker';
import type { DeclineReason, DeclineRecord, JobRequest } from '../types';

/**
 * The job feed: offers broadcast to this worker, and accepting or declining
 * them.
 *
 * Reads come in two forms. `getX()` is a snapshot — what Phase 5 turns into a
 * request. `useX()` is what screens call; it re-renders when the data changes.
 * Hooks select raw store slices and derive under useMemo: deriving inside a
 * zustand selector hands useSyncExternalStore a new array on every call, which
 * it reads as a change and can loop on.
 */

/**
 * The offer closest to running out first. The one to answer now stays on top,
 * and offers that arrive later queue underneath instead of pushing it away.
 */
function soonestFirst(requests: JobRequest[]): JobRequest[] {
  return [...requests].sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
}

export function getJobFeed(): JobRequest[] {
  return soonestFirst(useSessionStore.getState().jobRequests);
}

export function useJobFeed(): JobRequest[] {
  const requests = useSessionStore((state) => state.jobRequests);
  return useMemo(() => soonestFirst(requests), [requests]);
}

export function getJobRequest(id: Id): JobRequest | undefined {
  return useSessionStore.getState().jobRequests.find((entry) => entry.id === id);
}

export function useJobRequest(id: Id | undefined): JobRequest | undefined {
  const requests = useSessionStore((state) => state.jobRequests);
  return useMemo(() => requests.find((entry) => entry.id === id), [requests, id]);
}

export type AcceptResult =
  | { ok: true; bookingId: Id }
  | { ok: false; reason: 'not_approved' | 'offline' | 'gone' };

/**
 * Accepts an offer: it leaves the feed and becomes a booking.
 *
 * Refused before approval and while offline, because in Phase 5 the server
 * refuses both, and a prototype that allowed them would demonstrate a flow that
 * cannot exist.
 */
export async function acceptJob(requestId: Id): Promise<AcceptResult> {
  const { isApproved, isAvailable } = useWorkerStore.getState();
  if (!isApproved) return { ok: false, reason: 'not_approved' };
  if (!isAvailable) return { ok: false, reason: 'offline' };

  const request = getJobRequest(requestId);
  // Its thirty seconds are up: the offer has gone to someone else.
  if (!request || new Date(request.expiresAt).getTime() <= Date.now()) return { ok: false, reason: 'gone' };

  const booking: Booking = {
    ...request.booking,
    workerId: DEMO_WORKER_ID,
    status: BookingStatus.ACCEPTED,
    updatedAt: new Date().toISOString(),
  };

  useSessionStore.setState((state) => ({
    jobRequests: state.jobRequests.filter((entry) => entry.id !== requestId),
    bookings: [booking, ...state.bookings],
    // The customer's app shows this code; the worker needs it at the door.
    startCodes: { ...state.startCodes, [booking.id]: startCodeFor(booking.id) },
    timelines: { ...state.timelines, [booking.id]: { [BookingStatus.ACCEPTED]: booking.updatedAt } },
  }));
  return { ok: true, bookingId: booking.id };
}

export type DeclineResult = { ok: true } | { ok: false; reason: 'gone' };

/**
 * Declines an offer, saying why. It leaves this worker's feed, and the reason
 * is recorded for dispatch; nothing else changes.
 */
export async function declineJob(requestId: Id, reason: DeclineReason): Promise<DeclineResult> {
  const request = getJobRequest(requestId);
  if (!request) return { ok: false, reason: 'gone' };

  const record: DeclineRecord = {
    requestId,
    bookingId: request.booking.id,
    reason,
    declinedAt: new Date().toISOString(),
    request,
  };
  useSessionStore.setState((state) => ({
    jobRequests: state.jobRequests.filter((entry) => entry.id !== requestId),
    declines: [record, ...state.declines],
  }));
  return { ok: true };
}

/** How long a worker has to answer an offer. */
export const OFFER_WINDOW_MS = GIG_OFFER_TIMEOUT_MS;
/** At most this many offers are open at once. */
export const MAX_LIVE_OFFERS = 3;
/** The shortest gap between two offers arriving. */
export const OFFER_ARRIVAL_GAP_MS = 8_000;

const time = (iso: string) => new Date(iso).getTime();

/** When this offer's thirty seconds run out, in epoch milliseconds. */
export function getOfferDeadline(requestId: Id): number {
  const request = getJobRequest(requestId);
  return request ? time(request.expiresAt) : Date.now();
}

/**
 * A fresh offer, dealt from the mock templates in turn.
 *
 * It gets its own id, arrives now, and expires in exactly OFFER_WINDOW_MS. A
 * template outside this partner's services is dealt as one of theirs, without
 * notes written about a different kind of job — so a partner who registered
 * as a plumber is offered plumbing work. A booked-ahead time that would be
 * less than half an hour away is dropped rather than shown as nearly due.
 */
function dealOffer(seq: number, now: number, subCategories: Id[]): JobRequest {
  const template = mockJobRequests[seq % mockJobRequests.length];
  const fits = subCategories.length === 0 || subCategories.includes(template.booking.serviceCategoryId);
  const scheduledFor = template.booking.scheduledFor;
  const arrivedAt = new Date(now).toISOString();
  return {
    ...template,
    id: `jreq_${seq + 1}`,
    booking: {
      ...template.booking,
      id: `wjob_${seq + 1}`,
      serviceCategoryId: fits ? template.booking.serviceCategoryId : subCategories[seq % subCategories.length],
      notes: fits ? template.booking.notes : undefined,
      scheduledFor: scheduledFor && time(scheduledFor) > now + 30 * 60_000 ? scheduledFor : undefined,
      createdAt: arrivedAt,
      updatedAt: arrivedAt,
    },
    expiresAt: new Date(now + OFFER_WINDOW_MS).toISOString(),
  };
}

/**
 * One tick of the demo dispatcher — the stand-in for the Phase 5 socket.
 *
 *   - An offer whose thirty seconds have run out is withdrawn.
 *   - While the partner is approved and online, a new offer arrives whenever
 *     fewer than MAX_LIVE_OFFERS are open, at most one every
 *     OFFER_ARRIVAL_GAP_MS.
 *
 * So an unanswered job disappears after thirty seconds and another takes its
 * place, the way a real broadcast behaves. Offline, nothing new arrives. The
 * store is written only when something actually changed.
 */
export function tickOffers(now: number = Date.now()): void {
  const { isApproved, isAvailable, subCategories } = useWorkerStore.getState();
  const { jobRequests, offerSeq, lastOfferAt } = useSessionStore.getState();

  const live = jobRequests.filter((request) => time(request.expiresAt) > now);
  const canDeliver =
    isApproved &&
    isAvailable &&
    live.length < MAX_LIVE_OFFERS &&
    (lastOfferAt === null || now - lastOfferAt >= OFFER_ARRIVAL_GAP_MS);

  if (!canDeliver) {
    if (live.length !== jobRequests.length) useSessionStore.setState({ jobRequests: live });
    return;
  }
  useSessionStore.setState({
    jobRequests: [...live, dealOffer(offerSeq, now, subCategories)],
    offerSeq: offerSeq + 1,
    lastOfferAt: now,
  });
}

/**
 * Runs the dispatcher once a second while mounted. Mounted once, in the tabs
 * layout, which stays mounted under every screen pushed on top of it — so
 * offers keep arriving and expiring while a job is open.
 */
export function useOfferDispatch(): void {
  useEffect(() => {
    tickOffers();
    const timer = setInterval(() => tickOffers(), 1000);
    return () => clearInterval(timer);
  }, []);
}
