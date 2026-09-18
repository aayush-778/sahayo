import assert from 'node:assert/strict';
import { after, afterEach, describe, test } from 'node:test';
import { BookingStatus, ClientEvent, KycStatus, SCHEDULED_LEAD_MS, ServerEvent, type GigOfferPayload } from '@sahayo/shared';
import * as bookings from '../src/repositories/bookings';
import * as workers from '../src/repositories/workers';
import { connectAs, JOB_POINT, next, onlineElectricians, startServer, waitFor, type TestServer } from './helpers';

let server: TestServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});
after(() => setTimeout(() => process.exit(0), 50).unref());

const HOUR = 3_600_000;

/** A booking for a slot `ms` from now, as the customer app books ahead. */
async function createScheduled(url: string, ms: number): Promise<{ id: string; scheduledFor: string }> {
  const scheduledFor = new Date(Date.now() + ms).toISOString();
  const response = await fetch(`${url}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      customerId: 'usr_cust_demo',
      serviceItemId: 'ceiling-fan-installation',
      address: { line1: 'Flat 3B, Shivam Apartment', line2: 'Road No. 4, Rajendra Nagar', city: 'Patna', state: 'Bihar', pincode: '800016', point: JOB_POINT },
      scheduledFor,
    }),
  });
  assert.equal(response.status, 201, `create scheduled booking: ${response.status}`);
  const { record } = (await response.json()) as { record: { booking: { id: string } } };
  return { id: record.booking.id, scheduledFor };
}

describe('scheduled requests', () => {
  test('a booking for later goes to every verified worker nearby, online or not, and stays claimable past the instant window', async () => {
    /* A 200 ms instant window, so "outlasts it" is a fact this test can wait for. */
    server = await startServer(200);
    const [online] = await onlineElectricians(server, 1);
    const worker = await connectAs(server, online!.id, 'WORKER');

    const offered = next(worker, ServerEvent.GIG_OFFER);
    const { id, scheduledFor } = await createScheduled(server.url, 2 * HOUR);
    const offer: GigOfferPayload = await offered;
    assert.equal(offer.kind, 'SCHEDULED');
    assert.equal(offer.scheduledFor, scheduledFor);
    assert.equal(offer.expiresAt, scheduledFor, 'the offer is open until the slot itself, not for thirty seconds');

    const nearbyVerified = workers
      .list()
      .filter((candidate) => candidate.kycStatus === KycStatus.VERIFIED && candidate.serviceCategoryIds.includes('cat_electricians'));
    const round = server.backend.dispatcher.record(id)!.rounds[0]!;
    assert.equal(round.kind, 'SCHEDULED');
    assert.ok(round.candidates.every((candidate) => candidate.offered), 'every candidate is offered it, not just the top five');
    assert.ok(
      round.candidates.some((candidate) => !candidate.connected),
      'including workers whose app is shut, who see it when they next connect',
    );
    assert.ok(round.candidates.length <= nearbyVerified.length);

    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal(bookings.findById(id)!.status, BookingStatus.BROADCAST, 'still open after the instant window would have run out');
    const ack = await worker.emitWithAck(ClientEvent.GIG_ACCEPT, { workerId: online!.id, bookingId: id, offerId: offer.offerId });
    assert.equal(ack.ok, true);
    assert.equal(bookings.findById(id)!.workerId, online!.id);
  });

  test('accepting one that overlaps work already taken is refused until the worker confirms', async () => {
    server = await startServer(1_000);
    const [online] = await onlineElectricians(server, 1);
    const worker = await connectAs(server, online!.id, 'WORKER');

    /* An hour's work taken now; then a slot that starts while it is still running. */
    const instant = next(worker, ServerEvent.GIG_OFFER);
    const taken = await createScheduled(server.url, 0).catch(() => undefined);
    assert.equal(taken, undefined, 'a slot in the past is refused');
    const first = await fetch(`${server.url}/api/v1/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customerId: 'usr_cust_demo',
        serviceItemId: 'ceiling-fan-installation',
        address: { line1: 'Flat 3B, Shivam Apartment', line2: 'Road No. 4, Rajendra Nagar', city: 'Patna', state: 'Bihar', pincode: '800016', point: JOB_POINT },
      }),
    });
    assert.equal(first.status, 201);
    const firstOffer = await instant;
    const firstAck = await worker.emitWithAck(ClientEvent.GIG_ACCEPT, { workerId: online!.id, bookingId: firstOffer.bookingId, offerId: firstOffer.offerId });
    assert.equal(firstAck.ok, true);

    const scheduledOffer = next(worker, ServerEvent.GIG_OFFER);
    const { id } = await createScheduled(server.url, 40 * 60_000);
    const offer = await scheduledOffer;

    const refused = await worker.emitWithAck(ClientEvent.GIG_ACCEPT, { workerId: online!.id, bookingId: id, offerId: offer.offerId });
    assert.equal(refused.ok, false);
    assert.equal(refused.reason, 'CONFLICT');
    assert.equal(refused.conflicts?.length, 1, 'the job it collides with is named');
    assert.equal(refused.conflicts![0]!.bookingId, firstOffer.bookingId);
    assert.ok(refused.conflicts![0]!.overlapMinutes > 0 && refused.conflicts![0]!.serviceName.length > 0);
    assert.equal(bookings.findById(id)!.status, BookingStatus.BROADCAST, 'and nothing was assigned');

    const confirmed = await worker.emitWithAck(ClientEvent.GIG_ACCEPT, { workerId: online!.id, bookingId: id, offerId: offer.offerId, confirmOverlap: true });
    assert.equal(confirmed.ok, true, 'the worker may still take it once they have seen the clash');
    assert.equal(bookings.findById(id)!.workerId, online!.id);
  });

  test('a worker who was offline when it was booked is sent it on connecting; when everyone declines it expires', async () => {
    server = await startServer(1_000);
    const [online] = await onlineElectricians(server, 1);
    const present = await connectAs(server, online!.id, 'WORKER');

    const firstOffer = next(present, ServerEvent.GIG_OFFER);
    const { id } = await createScheduled(server.url, SCHEDULED_LEAD_MS + 5 * 60_000);
    const offer = await firstOffer;
    const round = server.backend.dispatcher.record(id)!.rounds[0]!;
    const absent = round.candidates.find((candidate) => !candidate.connected)!;

    /* That worker opens their app now, well after the request went out. */
    let resent: GigOfferPayload | undefined;
    const late = await connectAs(server, absent.workerId, 'WORKER', (socket) => socket.on(ServerEvent.GIG_OFFER, (payload) => { resent = payload; }));
    await waitFor(() => resent !== undefined);
    assert.equal(resent!.bookingId, id);
    assert.equal(resent!.kind, 'SCHEDULED');

    /* Everyone offered it says no: there is no wider round to fall back on. */
    const customer = await connectAs(server, 'usr_cust_demo', 'CUSTOMER');
    const expired = next(customer, ServerEvent.BOOKING_UPDATED, 8_000);
    for (const candidate of round.candidates) {
      const socket = candidate.workerId === online!.id ? present : candidate.workerId === absent.workerId ? late : await connectAs(server, candidate.workerId, 'WORKER');
      const offerId = candidate.workerId === online!.id ? offer.offerId : `ofr_${id}_s_${candidate.workerId}`;
      socket.emit(ClientEvent.GIG_DECLINE, { workerId: candidate.workerId, bookingId: id, offerId, reason: 'busy' });
    }
    await waitFor(() => bookings.findById(id)!.status === BookingStatus.EXPIRED_NO_ACCEPT, 8_000);
    assert.equal((await expired).status, BookingStatus.EXPIRED_NO_ACCEPT, 'and the customer is told');
  });
});
