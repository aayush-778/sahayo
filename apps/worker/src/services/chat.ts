import { useMemo } from 'react';
import type { Booking, Id, User } from '@sahayo/shared';

import { CUSTOMER_REPLIES, findCustomer } from '../mocks';
import { useSessionStore, type SessionState } from '../store/session';
import { QUICK_REPLIES, type ChatMessage, type ChatThread, type JobRequest, type QuickReplyKey } from '../types';
import { COMPLETED_STATUSES, PENDING_STATUSES } from './bookings';

/**
 * Conversations with customers — always about a booking, never open-ended.
 *
 * A chat is open while its job is: an offer still waiting for an answer, work
 * accepted and not finished, and the 24 hours after completion for "did it
 * work?". A cancelled or rejected job closes it. Closed chats stay readable.
 *
 * Unread counts come from the last time this worker opened a thread, so opening
 * one clears its badge and a new customer message brings it back.
 */

export const CHAT_OPEN_AFTER_COMPLETION_MS = 24 * 60 * 60 * 1000;
/** How long the demo customer "takes" to reply, and when they start typing. */
export const REPLY_DELAY_MS = 2600;
const TYPING_AFTER_MS = 700;

const time = (iso: string) => new Date(iso).getTime();

export type ChatState = 'open' | 'finished' | 'cancelled';

export interface ChatContext {
  booking?: Booking;
  request?: JobRequest;
  state: ChatState;
  serviceId?: Id;
}

type ContextSource = Pick<SessionState, 'bookings' | 'jobRequests' | 'declines' | 'timelines'>;

function contextOf(bookingId: Id, source: ContextSource, now: number): ChatContext {
  const booking = source.bookings.find((entry) => entry.id === bookingId);
  if (booking) {
    const serviceId = booking.serviceCategoryId;
    if (PENDING_STATUSES.has(booking.status)) return { booking, state: 'open', serviceId };
    if (COMPLETED_STATUSES.has(booking.status)) {
      const completedAt = source.timelines[bookingId]?.COMPLETED ?? booking.updatedAt;
      return { booking, serviceId, state: now - time(completedAt) < CHAT_OPEN_AFTER_COMPLETION_MS ? 'open' : 'finished' };
    }
    return { booking, state: 'cancelled', serviceId };
  }
  const request = source.jobRequests.find((entry) => entry.booking.id === bookingId);
  if (request) return { request, state: 'open', serviceId: request.booking.serviceCategoryId };
  const declined = source.declines.find((entry) => entry.bookingId === bookingId);
  return { request: declined?.request, state: 'cancelled', serviceId: declined?.request.booking.serviceCategoryId };
}

export interface ThreadView {
  thread: ChatThread;
  customer?: User;
  lastMessage?: ChatMessage;
  unread: number;
  context: ChatContext;
  /** The customer is "typing" a scripted reply. */
  typing: boolean;
}

function toView(
  thread: ChatThread,
  readUpTo: string | undefined,
  source: ContextSource,
  typing: Record<Id, boolean>,
  now: number,
): ThreadView {
  const lastMessage = thread.messages[thread.messages.length - 1];
  const since = readUpTo ? time(readUpTo) : 0;
  const unread = thread.messages.filter((message) => message.from === 'customer' && time(message.sentAt) > since).length;
  return {
    thread,
    customer: findCustomer(thread.customerId),
    lastMessage,
    unread,
    context: contextOf(thread.bookingId, source, now),
    typing: Boolean(typing[thread.id]),
  };
}

function useSource(): { source: ContextSource; threads: ChatThread[]; readUpTo: Record<Id, string>; typing: Record<Id, boolean> } {
  const threads = useSessionStore((state) => state.threads);
  const readUpTo = useSessionStore((state) => state.readUpTo);
  const typing = useSessionStore((state) => state.typing);
  const bookings = useSessionStore((state) => state.bookings);
  const jobRequests = useSessionStore((state) => state.jobRequests);
  const declines = useSessionStore((state) => state.declines);
  const timelines = useSessionStore((state) => state.timelines);
  const source = useMemo(() => ({ bookings, jobRequests, declines, timelines }), [bookings, jobRequests, declines, timelines]);
  return { source, threads, readUpTo, typing };
}

/** Every conversation, most recent message first; chats with no messages last. */
export function useThreads(): ThreadView[] {
  const { source, threads, readUpTo, typing } = useSource();
  return useMemo(() => {
    const now = Date.now();
    return threads
      .map((thread) => toView(thread, readUpTo[thread.id], source, typing, now))
      .sort((a, b) => time(b.lastMessage?.sentAt ?? '1970-01-01') - time(a.lastMessage?.sentAt ?? '1970-01-01'));
  }, [threads, readUpTo, source, typing]);
}

export function useUnreadTotal(): number {
  const threads = useThreads();
  return useMemo(() => threads.reduce((sum, entry) => sum + entry.unread, 0), [threads]);
}

export function useThread(id: Id | undefined): ThreadView | undefined {
  const { source, threads, readUpTo, typing } = useSource();
  return useMemo(() => {
    const thread = threads.find((entry) => entry.id === id);
    return thread ? toView(thread, readUpTo[thread.id], source, typing, Date.now()) : undefined;
  }, [threads, readUpTo, source, typing, id]);
}

/**
 * The conversation for a booking — found, or started if there is none yet.
 * Returns null only when the booking is unknown, which is what keeps chat
 * scoped to bookings: there is no way to start one without a job.
 */
export function openThreadForBooking(bookingId: Id): Id | null {
  const state = useSessionStore.getState();
  const existing = state.threads.find((entry) => entry.bookingId === bookingId);
  if (existing) return existing.id;

  const customerId =
    state.bookings.find((entry) => entry.id === bookingId)?.customerId ??
    state.jobRequests.find((entry) => entry.booking.id === bookingId)?.customer.id;
  if (!customerId) return null;

  const thread: ChatThread = { id: `thr_${bookingId}`, bookingId, customerId, messages: [] };
  useSessionStore.setState((current) => ({ threads: [...current.threads, thread] }));
  return thread.id;
}

export async function markThreadRead(threadId: Id): Promise<void> {
  useSessionStore.setState((state) => ({
    readUpTo: { ...state.readUpTo, [threadId]: new Date().toISOString() },
  }));
}

/** Quick replies for a job's stage, the likeliest first; the rest follow. */
export function quickRepliesFor(context: ChatContext): QuickReplyKey[] {
  const status = context.booking?.status;
  const suggested: QuickReplyKey[] =
    context.request && !context.booking
      ? ['send_photo', 'call_you']
      : status === 'ACCEPTED'
        ? ['on_my_way', 'call_you', 'late_10']
        : status === 'EN_ROUTE'
          ? ['on_my_way', 'late_10', 'reached']
          : status === 'ARRIVED'
            ? ['reached', 'call_you']
            : status === 'IN_PROGRESS'
              ? ['send_photo', 'work_done', 'call_you']
              : ['work_done'];
  return [...suggested, ...QUICK_REPLIES.filter((key) => !suggested.includes(key))];
}

export type SendResult = { ok: true } | { ok: false; reason: 'empty' | 'not_found' | 'closed' };

function setTyping(threadId: Id, value: boolean): void {
  useSessionStore.setState((state) => ({ typing: { ...state.typing, [threadId]: value } }));
}

const pendingReplies = new Set<Id>();

/**
 * The demo customer writes back: typing after a moment, the reply a couple of
 * seconds later, in the customer's own language. One pending reply per thread,
 * so three quick messages get one answer, as a person would give.
 */
function scheduleReply(threadId: Id, key: QuickReplyKey | undefined): void {
  if (pendingReplies.has(threadId)) return;
  pendingReplies.add(threadId);
  setTimeout(() => setTyping(threadId, true), TYPING_AFTER_MS);
  setTimeout(() => {
    pendingReplies.delete(threadId);
    setTyping(threadId, false);
    const thread = useSessionStore.getState().threads.find((entry) => entry.id === threadId);
    if (!thread) return;
    const locale = findCustomer(thread.customerId)?.locale ?? 'en-IN';
    const script = CUSTOMER_REPLIES[key ?? 'free'];
    const message: ChatMessage = {
      id: `m_${threadId}_${Date.now().toString(36)}_c`,
      from: 'customer',
      text: locale.startsWith('hi') ? script.hi : script.en,
      sentAt: new Date().toISOString(),
    };
    useSessionStore.setState((state) => ({
      threads: state.threads.map((entry) =>
        entry.id === threadId ? { ...entry, messages: [...entry.messages, message] } : entry,
      ),
    }));
  }, REPLY_DELAY_MS);
}

/**
 * Sends a message. It appears at once; the customer's reply follows.
 * Refused on a closed chat — a finished or cancelled job is not a channel.
 */
export async function sendMessage(threadId: Id, text: string, quickReply?: QuickReplyKey): Promise<SendResult> {
  const body = text.trim();
  if (!body) return { ok: false, reason: 'empty' };
  const state = useSessionStore.getState();
  const thread = state.threads.find((entry) => entry.id === threadId);
  if (!thread) return { ok: false, reason: 'not_found' };
  if (contextOf(thread.bookingId, state, Date.now()).state !== 'open') return { ok: false, reason: 'closed' };

  const now = new Date().toISOString();
  const message: ChatMessage = {
    id: `m_${threadId}_${Date.now().toString(36)}`,
    from: 'worker',
    text: body,
    sentAt: now,
    ...(quickReply ? { quickReply } : {}),
  };
  useSessionStore.setState((current) => ({
    threads: current.threads.map((entry) =>
      entry.id === threadId ? { ...entry, messages: [...entry.messages, message] } : entry,
    ),
    readUpTo: { ...current.readUpTo, [threadId]: now },
  }));
  scheduleReply(threadId, quickReply);
  return { ok: true };
}
