import { useEffect, useMemo, useState } from 'react';
import {
  BookingStatus,
  DEFAULT_JOB_MINUTES,
  SCHEDULE_DUE_SOON_MS,
  SCHEDULE_REMINDER_MS,
  overlapsFor,
  type Booking,
  type Id,
  type ScheduleConflict,
} from '@sahayo/shared';

import { DEMO_WORKER_ID } from '../mocks';
import { isLive, liveWorkerId, sendAccept, sendDecline } from '../realtime';
import { startCodeFor, useSessionStore } from '../store/session';
import { useWorkerStore } from '../store/worker';
import { findSubCategory } from './catalogue';
import { PENDING_STATUSES } from './bookings';
import { findCustomer } from './people';
import type { DeclineReason, DeclineRecord, JobRequest } from '../types';

/**
 * Booked-ahead work: the requests waiting for an answer, the clashes they would cause,
 * and the accepted jobs that are still to come.
 *
 * A scheduled request is not an instant offer with a longer fuse. It never interrupts,
 * it has no countdown, and it can collide with work already taken — so it is answered
 * from its own list, and a collision has to be confirmed. The server enforces that too:
 * an accept it thinks overlaps comes back CONFLICT with the jobs it collides with.
 */

const MINUTE = 60_000;
const time = (iso: string) => new Date(iso).getTime();

/** When a job starts: its slot if booked ahead, otherwise when it last moved on. */
function startsAtMs(booking: Booking): number {
  return time(booking.scheduledFor ?? booking.updatedAt);
}

/**
 * How long a job runs. Offers quote it; accepted bookings only carry it if this phone
 * saw the offer, so anything else is planned as an hour — the same fallback the server
 * uses when a booking has no priced item.
 */
function minutesOf(bookingId: Id, jobMinutes: Record<Id, number>): number {
  return jobMinutes[bookingId] ?? DEFAULT_JOB_MINUTES;
}

function serviceNameOf(booking: Booking): string {
  return findSubCategory(booking.serviceCategoryId)?.name ?? booking.serviceCategoryId;
}

function conflictOf(booking: Booking, minutes: number, overlapMinutes: number): ScheduleConflict {
  const start = startsAtMs(booking);
  return {
    bookingId: booking.id,
    serviceName: serviceNameOf(booking),
    locality: booking.address.line2 ?? booking.address.line1,
    location: booking.address.point,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + minutes * MINUTE).toISOString(),
    overlapMinutes,
  };
}

/** The accepted, unfinished work `request` would run into, against a given set of bookings. */
function conflictsAmong(request: JobRequest, bookings: Booking[], jobMinutes: Record<Id, number>): ScheduleConflict[] {
  const slot = { startsAtMs: startsAtMs(request.booking), minutes: request.estimatedMinutes };
  const commitments = bookings
    .filter((booking) => booking.id !== request.booking.id && PENDING_STATUSES.has(booking.status))
    .map((booking) => ({ booking, startsAtMs: startsAtMs(booking), minutes: minutesOf(booking.id, jobMinutes) }));
  return overlapsFor(slot, commitments).map(({ commitment, overlapMinutes }) =>
    conflictOf(commitment.booking, commitment.minutes, overlapMinutes),
  );
}

/** The same, against this session as it stands. */
export function conflictsFor(request: JobRequest): ScheduleConflict[] {
  const { bookings, jobMinutes } = useSessionStore.getState();
  return conflictsAmong(request, bookings, jobMinutes);
}

export interface ScheduledRequestView {
  request: JobRequest;
  startsAtMs: number;
  /** Accepted work this slot would overlap. Empty for most requests. */
  conflicts: ScheduleConflict[];
}

/** One day's worth of requests, for the list's day headings. */
export interface ScheduledDay {
  /** Local calendar day, as YYYY-MM-DD. */
  key: string;
  startsAtMs: number;
  items: ScheduledRequestView[];
}

const dayKey = (ms: number): string => {
  const at = new Date(ms);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
};

function groupByDay(views: ScheduledRequestView[]): ScheduledDay[] {
  const days = new Map<string, ScheduledDay>();
  for (const view of [...views].sort((a, b) => a.startsAtMs - b.startsAtMs)) {
    const key = dayKey(view.startsAtMs);
    const day = days.get(key);
    if (day) day.items.push(view);
    else days.set(key, { key, startsAtMs: view.startsAtMs, items: [view] });
  }
  return [...days.values()];
}

/** Every open scheduled request, soonest slot first, grouped by the day it falls on. */
export function useScheduledDays(): ScheduledDay[] {
  const requests = useSessionStore((state) => state.scheduledRequests);
  const bookings = useSessionStore((state) => state.bookings);
  const jobMinutes = useSessionStore((state) => state.jobMinutes);
  return useMemo(
    () =>
      groupByDay(
        requests.map((request) => ({
          request,
          startsAtMs: startsAtMs(request.booking),
          conflicts: conflictsAmong(request, bookings, jobMinutes),
        })),
      ),
    [requests, bookings, jobMinutes],
  );
}

export function useScheduledRequests(): JobRequest[] {
  const requests = useSessionStore((state) => state.scheduledRequests);
  return useMemo(() => [...requests].sort((a, b) => startsAtMs(a.booking) - startsAtMs(b.booking)), [requests]);
}

export function useScheduledRequest(id: Id | undefined): JobRequest | undefined {
  const requests = useSessionStore((state) => state.scheduledRequests);
  return useMemo(() => requests.find((request) => request.id === id), [requests, id]);
}

/** What the dashboard's Scheduled requests row shows: how many, and when the first one is. */
export function useScheduledSummary(): { count: number; nextSlot?: string } {
  const requests = useScheduledRequests();
  return { count: requests.length, ...(requests[0]?.booking.scheduledFor ? { nextSlot: requests[0].booking.scheduledFor } : {}) };
}

export type ScheduledAcceptResult =
  | { ok: true; bookingId: Id }
  | { ok: false; reason: 'conflict'; conflicts: ScheduleConflict[] }
  | { ok: false; reason: 'not_approved' | 'gone' | 'offline' };

/**
 * Takes a booked-ahead job. Without `confirmOverlap` the server refuses one that
 * overlaps work already taken and says what it collides with, so the worker decides
 * with the clash in front of them rather than after the fact.
 */
export async function acceptScheduled(requestId: Id, options: { confirmOverlap?: boolean } = {}): Promise<ScheduledAcceptResult> {
  const { isApproved } = useWorkerStore.getState();
  if (!isApproved) return { ok: false, reason: 'not_approved' };

  const request = useSessionStore.getState().scheduledRequests.find((entry) => entry.id === requestId);
  if (!request) return { ok: false, reason: 'gone' };
  if (time(request.expiresAt) <= Date.now()) return { ok: false, reason: 'gone' };

  if (!options.confirmOverlap) {
    const conflicts = conflictsFor(request);
    if (conflicts.length > 0) return { ok: false, reason: 'conflict', conflicts };
  }

  const workerId = liveWorkerId();
  if (request.source === 'live') {
    if (!isLive() || !workerId) return { ok: false, reason: 'offline' };
    const ack = await sendAccept({
      workerId,
      bookingId: request.booking.id,
      offerId: request.id,
      ...(options.confirmOverlap ? { confirmOverlap: true } : {}),
    });
    if (!ack) return { ok: false, reason: 'offline' };
    /* The server knows every job this worker has, including ones taken on another device. */
    if (!ack.ok && ack.reason === 'CONFLICT') return { ok: false, reason: 'conflict', conflicts: ack.conflicts ?? [] };
    if (!ack.ok || !ack.booking) {
      useSessionStore.setState((state) => ({ scheduledRequests: state.scheduledRequests.filter((entry) => entry.id !== requestId) }));
      return { ok: false, reason: 'gone' };
    }
    takeIntoSession(ack.booking, request);
    return { ok: true, bookingId: ack.booking.id };
  }

  const booking: Booking = {
    ...request.booking,
    workerId: DEMO_WORKER_ID,
    status: BookingStatus.ACCEPTED,
    updatedAt: new Date().toISOString(),
  };
  takeIntoSession(booking, request);
  return { ok: true, bookingId: booking.id };
}

/** An accepted scheduled job joins this worker's bookings, and leaves the list. */
function takeIntoSession(booking: Booking, request: JobRequest): void {
  useSessionStore.setState((state) => ({
    scheduledRequests: state.scheduledRequests.filter((entry) => entry.id !== request.id),
    bookings: [booking, ...state.bookings.filter((entry) => entry.id !== booking.id)],
    customers: { ...state.customers, [request.customer.id]: state.customers[request.customer.id] ?? request.customer },
    jobMinutes: { ...state.jobMinutes, [booking.id]: request.estimatedMinutes },
    startCodes: { ...state.startCodes, [booking.id]: startCodeFor(booking.id) },
    timelines: { ...state.timelines, [booking.id]: { [BookingStatus.ACCEPTED]: booking.updatedAt } },
  }));
}

export async function declineScheduled(requestId: Id, reason: DeclineReason): Promise<{ ok: boolean }> {
  const request = useSessionStore.getState().scheduledRequests.find((entry) => entry.id === requestId);
  if (!request) return { ok: false };

  const workerId = liveWorkerId();
  if (request.source === 'live' && workerId) {
    sendDecline({ workerId, bookingId: request.booking.id, offerId: request.id, reason });
  }
  const record: DeclineRecord = { requestId, bookingId: request.booking.id, reason, declinedAt: new Date().toISOString(), request };
  useSessionStore.setState((state) => ({
    scheduledRequests: state.scheduledRequests.filter((entry) => entry.id !== requestId),
    declines: [record, ...state.declines],
  }));
  return { ok: true };
}

// --- accepted work still to come -------------------------------------------------

export interface UpcomingJob {
  booking: Booking;
  startsAtMs: number;
  customerName?: string;
}

/**
 * Accepted work, split into what is happening today and what is booked for another day.
 * A job for Saturday does not belong in the same list as the one at half past four.
 */
export function useAcceptedSchedule(): { today: UpcomingJob[]; upcoming: UpcomingJob[] } {
  const bookings = useSessionStore((state) => state.bookings);
  return useMemo(() => {
    const today = dayKey(Date.now());
    const jobs = bookings
      .filter((booking) => PENDING_STATUSES.has(booking.status))
      .map((booking) => ({ booking, startsAtMs: startsAtMs(booking), customerName: findCustomer(booking.customerId)?.name }))
      .sort((a, b) => a.startsAtMs - b.startsAtMs);
    return {
      today: jobs.filter((job) => dayKey(job.startsAtMs) <= today),
      upcoming: jobs.filter((job) => dayKey(job.startsAtMs) > today),
    };
  }, [bookings]);
}

export interface ScheduleReminder {
  booking: Booking;
  customerName?: string;
  startsAtMs: number;
  minutesAway: number;
  /** Close enough that leaving now matters. */
  dueSoon: boolean;
}

/**
 * The accepted slot coming up, from an hour before it until it starts. A prototype's
 * stand-in for a push notification: a banner the worker sees while the app is open.
 */
export function useScheduleReminder(): ScheduleReminder | undefined {
  const bookings = useSessionStore((state) => state.bookings);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    const next = bookings
      .filter((booking) => booking.status === BookingStatus.ACCEPTED && booking.scheduledFor)
      .map((booking) => ({ booking, startsAtMs: time(booking.scheduledFor!) }))
      .filter((job) => job.startsAtMs - now <= SCHEDULE_REMINDER_MS && job.startsAtMs - now > -SCHEDULE_REMINDER_MS)
      .sort((a, b) => a.startsAtMs - b.startsAtMs)[0];
    if (!next) return undefined;
    const away = next.startsAtMs - now;
    return {
      booking: next.booking,
      customerName: findCustomer(next.booking.customerId)?.name,
      startsAtMs: next.startsAtMs,
      minutesAway: Math.max(0, Math.round(away / MINUTE)),
      dueSoon: away <= SCHEDULE_DUE_SOON_MS,
    };
  }, [bookings, now]);
}
