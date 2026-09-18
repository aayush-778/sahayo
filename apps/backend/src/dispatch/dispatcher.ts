import {
  BookingEventKind,
  BookingStatus,
  DEFAULT_EQUITY_WEIGHTS,
  DEFAULT_RADIUS_M,
  GIG_OFFER_TIMEOUT_MS,
  ServerEvent,
  WORKER_CATEGORY_BY_CATEGORY_ID,
  WORKER_CATEGORY_LABEL,
  isScheduledDispatch,
  type BroadcastRecord,
  type DispatchResolvedPayload,
  type DispatchRoundPayload,
  type GigAcceptAck,
  type GigAcceptPayload,
  type GigDeclinePayload,
  type GigOfferKind,
  type GigOfferPayload,
  type Id,
} from '@sahayo/shared';
import * as bookings from '../repositories/bookings';
import * as catalogue from '../repositories/catalogue';
import * as workers from '../repositories/workers';
import { emitBookingUpdated, emitToAdmins, emitToWorker, isConnected, joinBookingRoom } from '../sockets/realtime';
import type { StoredBooking } from '../store';
import type { DispatchLogger } from './log';
import { rankCandidates, type RankedCandidate } from './ranking';
import { conflictsFor, jobMinutesFor } from './schedule';

/**
 * The equity dispatcher.
 *
 *   1. A booking arrives in REQUESTED.
 *   2. findCandidates: online, verified, free, taking this worker type, within 5 km.
 *   3. rankCandidates: by equity score — proximity, rating, and fewer jobs this week.
 *   4. gig:offer to the top five at once. The booking moves to BROADCAST.
 *   5. A 30-second timer (GIG_OFFER_TIMEOUT_MS).
 *   6. The first accept wins, under a lock. Everyone else offered it gets gig:taken.
 *   7. No accept in time: widen to 8 km and offer once more, then EXPIRED_NO_ACCEPT.
 *
 * A booking for a slot at least an hour off (SCHEDULED_LEAD_MS) is dispatched as a
 * SCHEDULED request instead: offered at once to every verified worker of the type within
 * 8 km, online or not, and open until the slot itself rather than for thirty seconds.
 * The first accept still wins under the same lock. Accepting one that overlaps work
 * already taken needs `confirmOverlap`. Nobody by the slot, or everybody declined:
 * EXPIRED_NO_ACCEPT.
 */

/** How many past dispatches the Broadcast Inspector can look back at. */
const RECORD_LIMIT = 50;

export const DISPATCH = {
  TOP_N: 5,
  RADIUS_M: DEFAULT_RADIUS_M,
  WIDENED_RADIUS_M: 8_000,
  OFFER_TIMEOUT_MS: GIG_OFFER_TIMEOUT_MS,
  SCHEDULED_RADIUS_M: 8_000,
} as const;

/** setTimeout's longest delay. A slot further off than ~24.8 days is waited for in steps. */
const MAX_TIMER_MS = 2_147_483_647;

interface Offer {
  offerId: Id;
  candidate: RankedCandidate;
  issuedAt: number;
  expiresAt: number;
}

interface Broadcast {
  bookingId: Id;
  kind: GigOfferKind;
  categoryId: Id;
  startedAt: number;
  round: 1 | 2;
  /** The live offers of the current round, by worker. */
  offers: Map<Id, Offer>;
  /** The latest offer id each worker was ever sent for this booking, so all of them can be told it is taken. */
  everOffered: Map<Id, Id>;
  declined: Set<Id>;
  timer?: ReturnType<typeof setTimeout>;
}

export interface DispatcherOptions {
  log: DispatchLogger;
  /** How long a round of offers stays open. GIG_OFFER_TIMEOUT_MS unless a test shortens it. */
  offerTimeoutMs?: number;
}


export class Dispatcher {
  private readonly active = new Map<Id, Broadcast>();
  /**
   * The lock. A booking id goes in the moment an accept starts to be honoured, and
   * every accept that finds it already here is told the job is taken. In-memory and
   * single-process, a Set is the whole of it; across several processes this becomes a
   * Redis SET NX with the same meaning.
   */
  private readonly locked = new Set<Id>();
  private readonly offerTimeoutMs: number;
  /**
   * What each dispatch did, round by round, for the Broadcast Inspector — including
   * after a page reload. The most recent RECORD_LIMIT are kept.
   */
  private readonly records = new Map<Id, BroadcastRecord>();

  constructor(private readonly options: DispatcherOptions) {
    this.offerTimeoutMs = options.offerTimeoutMs ?? DISPATCH.OFFER_TIMEOUT_MS;
  }

  isBroadcasting(bookingId: Id): boolean {
    return this.active.has(bookingId);
  }

  /** How one booking's dispatch went, if it happened since boot. */
  record(bookingId: Id): BroadcastRecord | undefined {
    return this.records.get(bookingId);
  }

  /** Every dispatch since boot that is still remembered, oldest first. */
  allRecords(): BroadcastRecord[] {
    return [...this.records.values()];
  }

  private remember(bookingId: Id, update: (record: BroadcastRecord) => BroadcastRecord): void {
    const record = update(this.records.get(bookingId) ?? { bookingId, rounds: [] });
    this.records.delete(bookingId);
    this.records.set(bookingId, record);
    while (this.records.size > RECORD_LIMIT) this.records.delete(this.records.keys().next().value!);
  }

  /** Tells the admin room how a dispatch ended, and remembers it. */
  private resolve(booking: StoredBooking, outcome: DispatchResolvedPayload['outcome'], winner?: { id: Id; name: string; rank: number; score: number }): void {
    const payload: DispatchResolvedPayload = {
      bookingId: booking.id,
      reference: booking.reference,
      outcome,
      ...(winner ? { workerId: winner.id, workerName: winner.name, rank: winner.rank, score: winner.score } : {}),
      elapsedMs: Date.now() - Date.parse(booking.createdAt),
      at: new Date().toISOString(),
    };
    this.remember(booking.id, (record) => ({ ...record, resolution: payload }));
    emitToAdmins(ServerEvent.DISPATCH_RESOLVED, payload);
  }

  /** Starts dispatching a booking that has just been created. */
  start(bookingId: Id): void {
    const booking = bookings.findById(bookingId);
    if (!booking || booking.status !== BookingStatus.REQUESTED) return;

    const categoryId = catalogue.workerTypeFor(booking.serviceItemId ?? booking.serviceCategoryId);
    const trade = categoryId ? WORKER_CATEGORY_BY_CATEGORY_ID[categoryId] : undefined;
    this.options.log.header({
      reference: booking.reference,
      service: catalogue.findItem(booking.serviceItemId ?? '')?.name ?? catalogue.subCategoryName(booking.serviceCategoryId) ?? booking.category,
      locality: booking.address.line2 ?? booking.address.line1,
      fare: booking.amount,
      at: new Date(),
    });
    if (!categoryId || !trade) {
      this.options.log.line('note', `no worker type is known for ${booking.serviceCategoryId}; nothing can be offered`);
      this.expire(booking.id, 'No worker type matches this service, so nobody could be offered it.');
      return;
    }

    const kind: GigOfferKind = isScheduledDispatch(booking.scheduledFor, Date.now()) ? 'SCHEDULED' : 'INSTANT';
    this.active.set(bookingId, { bookingId, kind, categoryId, startedAt: Date.now(), round: 1, offers: new Map(), everOffered: new Map(), declined: new Set() });
    if (kind === 'SCHEDULED') this.runScheduled(bookingId);
    else this.runRound(bookingId, 1, DISPATCH.RADIUS_M);
  }

  /** The offer a worker is sent, from the booking as it stands now. */
  private offerPayload(broadcast: Broadcast, offer: Offer, booking: StoredBooking): GigOfferPayload {
    return {
      offerId: offer.offerId,
      kind: broadcast.kind,
      ...(booking.scheduledFor ? { scheduledFor: booking.scheduledFor } : {}),
      bookingId: booking.id,
      serviceCategoryId: booking.serviceCategoryId,
      pickup: booking.location,
      distanceM: Math.round(offer.candidate.distanceM),
      estimatedFare: booking.amount,
      expiresAt: new Date(offer.expiresAt).toISOString(),
      issuedAt: new Date(offer.issuedAt).toISOString(),
      booking: bookings.toBooking(booking),
      customerName: booking.customerName,
      estimatedMinutes: jobMinutesFor(booking),
    };
  }

  /** Runs `run` at `atMs`, however far off, keeping the broadcast's timer the one to clear. */
  private armAt(broadcast: Broadcast, atMs: number, run: () => void): void {
    const delay = atMs - Date.now();
    broadcast.timer = delay > MAX_TIMER_MS ? setTimeout(() => this.armAt(broadcast, atMs, run), MAX_TIMER_MS) : setTimeout(run, Math.max(0, delay));
  }

  /** A booked-ahead request: every verified worker of the type nearby, open until the slot. */
  private runScheduled(bookingId: Id): void {
    const broadcast = this.active.get(bookingId);
    const booking = bookings.findById(bookingId);
    if (!broadcast || !booking?.scheduledFor) return;
    const slotAtMs = Date.parse(booking.scheduledFor);
    const radiusM = DISPATCH.SCHEDULED_RADIUS_M;
    const trade = WORKER_CATEGORY_LABEL[WORKER_CATEGORY_BY_CATEGORY_ID[broadcast.categoryId]!];
    const when = new Date(slotAtMs).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

    const ranked = rankCandidates(workers.findScheduleCandidates(booking.location.lat, booking.location.lng, radiusM, broadcast.categoryId), {
      radiusM,
      maxJobsThisWeek: workers.maxJobsThisWeek(),
    });
    const issuedAtMs = Date.now();
    for (const candidate of ranked) {
      broadcast.offers.set(candidate.worker.id, { offerId: `ofr_${bookingId}_s_${candidate.worker.id}`, candidate, issuedAt: issuedAtMs, expiresAt: slotAtMs });
    }
    this.options.log.round({ round: 1, radiusM, trade, ranked, offeredIds: new Set(broadcast.offers.keys()), connected: isConnected, timeoutMs: slotAtMs - issuedAtMs, slotAt: new Date(slotAtMs) });

    if (ranked.length === 0) {
      this.expire(bookingId, `No verified ${trade.toLowerCase()} within ${radiusM / 1000} km to offer a booking for ${when}.`);
      return;
    }

    const roundPayload: DispatchRoundPayload = {
      bookingId,
      reference: booking.reference,
      round: 1,
      kind: 'SCHEDULED',
      radiusM,
      weights: DEFAULT_EQUITY_WEIGHTS,
      candidates: ranked.map((candidate) => ({
        workerId: candidate.worker.id,
        name: candidate.worker.name,
        distanceM: Math.round(candidate.distanceM),
        rating: candidate.worker.rating,
        jobsThisWeek: candidate.worker.jobsThisWeek,
        inputs: candidate.inputs,
        score: candidate.score,
        rank: candidate.rank,
        offered: true,
        connected: isConnected(candidate.worker.id),
      })),
      requestedAt: booking.createdAt,
      offeredAt: new Date(issuedAtMs).toISOString(),
      expiresAt: booking.scheduledFor,
    };
    this.remember(bookingId, (record) => ({ ...record, rounds: [...record.rounds, roundPayload] }));
    emitToAdmins(ServerEvent.DISPATCH_ROUND, roundPayload);

    const current = bookings.transition(bookingId, BookingStatus.BROADCAST, { role: 'SYSTEM' }, { detail: `Booked ahead for ${when}; sent to matching workers nearby.` });
    bookings.appendEvent(bookingId, {
      kind: BookingEventKind.PINGED,
      detail: `Offered to ${ranked.length} ${ranked.length === 1 ? 'worker' : 'workers'} within ${radiusM / 1000} km, open until the slot at ${when}.`,
      workersPinged: ranked.length,
      actor: { role: 'SYSTEM' },
    });
    emitBookingUpdated(current);

    for (const offer of broadcast.offers.values()) {
      broadcast.everOffered.set(offer.candidate.worker.id, offer.offerId);
      emitToWorker(offer.candidate.worker.id, ServerEvent.GIG_OFFER, this.offerPayload(broadcast, offer, current));
    }
    this.armAt(broadcast, slotAtMs, () => {
      if (!this.active.has(bookingId) || this.locked.has(bookingId)) return;
      this.options.log.line('timeout', `nobody took ${booking.reference} before its slot`);
      this.expire(bookingId, `Nobody took it before the slot at ${when}.`);
    });
  }

  /**
   * The scheduled requests still open to this worker, sent again when their app connects:
   * a worker who was offline when a job for tomorrow was booked still sees it.
   * Instant offers are not resent — their thirty seconds would start over.
   */
  resendOpenOffers(workerId: Id): number {
    let sent = 0;
    for (const broadcast of this.active.values()) {
      const offer = broadcast.offers.get(workerId);
      const booking = bookings.findById(broadcast.bookingId);
      if (broadcast.kind !== 'SCHEDULED' || !offer || !booking || this.locked.has(broadcast.bookingId)) continue;
      emitToWorker(workerId, ServerEvent.GIG_OFFER, this.offerPayload(broadcast, offer, booking));
      sent += 1;
    }
    return sent;
  }

  private runRound(bookingId: Id, round: 1 | 2, radiusM: number): void {
    const broadcast = this.active.get(bookingId);
    const booking = bookings.findById(bookingId);
    if (!broadcast || !booking) return;
    broadcast.round = round;

    const ranked = rankCandidates(
      workers
        .findCandidates(booking.location.lat, booking.location.lng, radiusM, broadcast.categoryId)
        .filter((candidate) => !broadcast.declined.has(candidate.worker.id)),
      { radiusM, maxJobsThisWeek: workers.maxJobsThisWeek() },
    );
    const top = ranked.slice(0, DISPATCH.TOP_N);
    const trade = WORKER_CATEGORY_LABEL[WORKER_CATEGORY_BY_CATEGORY_ID[broadcast.categoryId]!];

    const previous = broadcast.offers;
    broadcast.offers = new Map();
    /* One clock read for both ends of the window, so a phone counting down expiresAt − issuedAt gets exactly the window. */
    const issuedAtMs = Date.now();
    const expiresAt = issuedAtMs + this.offerTimeoutMs;
    for (const candidate of top) {
      broadcast.offers.set(candidate.worker.id, { offerId: `ofr_${bookingId}_r${round}_${candidate.worker.id}`, candidate, issuedAt: issuedAtMs, expiresAt });
    }

    this.options.log.round({
      round,
      radiusM,
      trade,
      ranked,
      offeredIds: new Set(broadcast.offers.keys()),
      connected: isConnected,
      timeoutMs: this.offerTimeoutMs,
    });

    /* Offers from the first round that the second does not renew are withdrawn. */
    for (const [workerId, offer] of previous) {
      if (!broadcast.offers.has(workerId)) emitToWorker(workerId, ServerEvent.GIG_EXPIRED, { offerId: offer.offerId, bookingId });
    }

    if (top.length === 0) {
      if (round === 1) {
        this.options.log.line('note', `nobody available within ${DISPATCH.RADIUS_M / 1000} km — widening to ${DISPATCH.WIDENED_RADIUS_M / 1000} km`);
        this.runRound(bookingId, 2, DISPATCH.WIDENED_RADIUS_M);
      } else {
        this.expire(bookingId, `No available ${trade.toLowerCase()} within ${DISPATCH.WIDENED_RADIUS_M / 1000} km.`);
      }
      return;
    }

    let current = booking;
    const roundPayload: DispatchRoundPayload = {
      bookingId,
      reference: booking.reference,
      round,
      kind: 'INSTANT',
      radiusM,
      weights: DEFAULT_EQUITY_WEIGHTS,
      candidates: ranked.map((candidate) => ({
        workerId: candidate.worker.id,
        name: candidate.worker.name,
        distanceM: Math.round(candidate.distanceM),
        rating: candidate.worker.rating,
        jobsThisWeek: candidate.worker.jobsThisWeek,
        inputs: candidate.inputs,
        score: candidate.score,
        rank: candidate.rank,
        offered: broadcast.offers.has(candidate.worker.id),
        connected: isConnected(candidate.worker.id),
      })),
      requestedAt: booking.createdAt,
      offeredAt: new Date(issuedAtMs).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
    };
    this.remember(bookingId, (record) => ({ ...record, rounds: [...record.rounds, roundPayload] }));
    emitToAdmins(ServerEvent.DISPATCH_ROUND, roundPayload);
    if (current.status === BookingStatus.REQUESTED) {
      current = bookings.transition(bookingId, BookingStatus.BROADCAST, { role: 'SYSTEM' }, { detail: 'Request sent out to available workers nearby.' });
    }
    bookings.appendEvent(bookingId, {
      kind: BookingEventKind.PINGED,
      detail:
        round === 1
          ? `Offered to ${top.length} ${top.length === 1 ? 'worker' : 'workers'} within ${radiusM / 1000} km, ranked by equity score.`
          : `Nobody accepted, so the radius was widened to ${radiusM / 1000} km and the job offered to ${top.length} ${top.length === 1 ? 'worker' : 'workers'}.`,
      workersPinged: top.length,
      actor: { role: 'SYSTEM' },
    });
    emitBookingUpdated(current);

    for (const offer of broadcast.offers.values()) {
      broadcast.everOffered.set(offer.candidate.worker.id, offer.offerId);
      emitToWorker(offer.candidate.worker.id, ServerEvent.GIG_OFFER, this.offerPayload(broadcast, offer, current));
    }

    this.options.log.line('note', `offers sent ${Date.now() - Date.parse(booking.createdAt)} ms after the booking was made`);
    broadcast.timer = setTimeout(() => this.roundTimedOut(bookingId, round), this.offerTimeoutMs);
  }

  private roundTimedOut(bookingId: Id, round: 1 | 2): void {
    const broadcast = this.active.get(bookingId);
    if (!broadcast || broadcast.round !== round || this.locked.has(bookingId)) return;
    if (round === 1) {
      this.options.log.line('timeout', `nobody accepted round 1 in ${Math.round(this.offerTimeoutMs / 1000)} s — widening to ${DISPATCH.WIDENED_RADIUS_M / 1000} km and offering once more`);
      this.runRound(bookingId, 2, DISPATCH.WIDENED_RADIUS_M);
    } else {
      this.options.log.line('timeout', `nobody accepted round 2 either`);
      this.expire(bookingId, `No worker accepted within ${Math.round(this.offerTimeoutMs / 1000)} seconds at ${DISPATCH.RADIUS_M / 1000} km or ${DISPATCH.WIDENED_RADIUS_M / 1000} km.`);
    }
  }

  private expire(bookingId: Id, detail: string): void {
    const broadcast = this.active.get(bookingId);
    if (broadcast?.timer) clearTimeout(broadcast.timer);
    for (const [workerId, offer] of broadcast?.offers ?? []) {
      emitToWorker(workerId, ServerEvent.GIG_EXPIRED, { offerId: offer.offerId, bookingId });
    }
    this.active.delete(bookingId);

    const booking = bookings.findById(bookingId);
    if (!booking) return;
    const expired = bookings.transition(bookingId, BookingStatus.EXPIRED_NO_ACCEPT, { role: 'SYSTEM' }, { detail });
    emitBookingUpdated(expired);
    this.resolve(expired, 'EXPIRED');
    this.options.log.line('expired', `${booking.reference} · ${detail} · after ${this.elapsed(broadcast)} ms`);
  }

  /**
   * A worker's accept. Exactly one accept per booking can succeed: the first to take
   * the lock. Everything that follows the lock is synchronous, so no second accept can
   * be honoured between the check and the assignment.
   */
  accept(payload: GigAcceptPayload): GigAcceptAck {
    const { bookingId, workerId, offerId } = payload;
    const worker = workers.findById(workerId);

    if (this.locked.has(bookingId)) {
      this.options.log.line('refused', `${worker?.name ?? workerId} tried to accept ${bookingId} — already taken`);
      return { ok: false, reason: 'TAKEN' };
    }
    const broadcast = this.active.get(bookingId);
    if (!broadcast) {
      const status = bookings.findById(bookingId)?.status;
      const reason = status === BookingStatus.EXPIRED_NO_ACCEPT ? 'EXPIRED' : status ? 'TAKEN' : 'UNKNOWN_OFFER';
      this.options.log.line('refused', `${worker?.name ?? workerId} tried to accept ${bookingId} — ${reason.toLowerCase().replace('_', ' ')}`);
      return { ok: false, reason };
    }
    const offer = broadcast.offers.get(workerId);
    if (!offer || offer.offerId !== offerId || !worker) {
      this.options.log.line('refused', `${worker?.name ?? workerId} sent an offer id this round did not issue`);
      return { ok: false, reason: 'UNKNOWN_OFFER' };
    }
    if (Date.now() > offer.expiresAt) {
      this.options.log.line('refused', `${worker.name} accepted after the offer ran out`);
      return { ok: false, reason: 'EXPIRED' };
    }
    if (broadcast.kind === 'SCHEDULED' && !payload.confirmOverlap) {
      const booking = bookings.findById(bookingId);
      const conflicts = booking ? conflictsFor(workerId, booking) : [];
      if (conflicts.length > 0) {
        this.options.log.line('refused', `${worker.name} would overlap ${conflicts.length} job${conflicts.length === 1 ? '' : 's'} already taken · asked to confirm`);
        return { ok: false, reason: 'CONFLICT', conflicts };
      }
    }

    this.locked.add(bookingId);
    try {
      if (broadcast.timer) clearTimeout(broadcast.timer);
      const accepted = bookings.transition(
        bookingId,
        BookingStatus.ACCEPTED,
        { role: 'WORKER', id: workerId },
        {
          worker: { id: worker.id, name: worker.name },
          equityRank: offer.candidate.rank,
          detail: `${worker.name} accepted, ranked ${offer.candidate.rank} of ${broadcast.offers.size} on equity score.`,
        },
      );
      workers.recordJobTaken(workerId);
      this.active.delete(bookingId);

      let told = 0;
      for (const [otherId, otherOfferId] of broadcast.everOffered) {
        if (otherId === workerId) continue;
        emitToWorker(otherId, ServerEvent.GIG_TAKEN, { offerId: otherOfferId, bookingId });
        told += 1;
      }
      const acceptedAt = Date.now();
      joinBookingRoom([workerId, accepted.customerId], bookingId);
      emitBookingUpdated(accepted);
      this.resolve(accepted, 'ACCEPTED', { id: worker.id, name: worker.name, rank: offer.candidate.rank, score: offer.candidate.score });
      this.options.log.line(
        'accepted',
        `${bold(worker.name)} (rank ${offer.candidate.rank}, score ${offer.candidate.score.toFixed(2)}) after ${this.elapsed(broadcast).toLocaleString('en-IN')} ms · ${told} other${told === 1 ? '' : 's'} told it is taken`,
      );
      this.options.log.line('note', `customer's room told ${Date.now() - acceptedAt} ms after the accept`);
      return { ok: true, booking: bookings.toBooking(accepted) };
    } catch (error) {
      this.locked.delete(bookingId);
      throw error;
    }
  }

  /** A worker turning an offer down. When everyone in the round has, the round ends now rather than in 30 seconds. */
  decline(payload: GigDeclinePayload): void {
    const broadcast = this.active.get(payload.bookingId);
    const offer = broadcast?.offers.get(payload.workerId);
    if (!broadcast || !offer || offer.offerId !== payload.offerId) return;
    broadcast.offers.delete(payload.workerId);
    broadcast.declined.add(payload.workerId);
    this.options.log.line('declined', `${offer.candidate.worker.name}${payload.reason ? ` (${payload.reason.replace(/_/g, ' ')})` : ''} · ${broadcast.offers.size} still to answer`);
    if (broadcast.offers.size === 0) {
      if (broadcast.timer) clearTimeout(broadcast.timer);
      /* A scheduled request has no wider round to fall back on: everyone who could take it has said no. */
      if (broadcast.kind === 'SCHEDULED') this.expire(payload.bookingId, 'Every worker it was offered to declined.');
      else this.roundTimedOut(payload.bookingId, broadcast.round);
    }
  }

  /** The customer cancelled while the job was still being offered: withdraw every offer. */
  withdraw(bookingId: Id): void {
    const broadcast = this.active.get(bookingId);
    if (!broadcast) return;
    if (broadcast.timer) clearTimeout(broadcast.timer);
    for (const [workerId, offer] of broadcast.offers) emitToWorker(workerId, ServerEvent.GIG_EXPIRED, { offerId: offer.offerId, bookingId });
    this.active.delete(bookingId);
    const booking = bookings.findById(bookingId);
    if (booking) this.resolve(booking, 'WITHDRAWN');
    this.options.log.line('cancelled', `${bookingId} was cancelled while it was being offered · offers withdrawn`);
  }

  /** Stops every timer. For shutting the server down, and between tests. */
  shutdown(): void {
    for (const broadcast of this.active.values()) if (broadcast.timer) clearTimeout(broadcast.timer);
    this.active.clear();
    this.locked.clear();
  }

  /**
   * As shutdown, and forgets what past dispatches did. For the demo reset: the Broadcast
   * Inspector should open the next run's first request, not the last run's.
   */
  reset(): void {
    this.shutdown();
    this.records.clear();
  }

  private elapsed(broadcast: Broadcast | undefined): number {
    return broadcast ? Date.now() - broadcast.startedAt : 0;
  }
}

const bold = (text: string): string => (process.stdout.isTTY && !process.env.NO_COLOR ? `\x1b[1m${text}\x1b[0m` : text);
