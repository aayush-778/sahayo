import assert from 'node:assert/strict';
import { after, afterEach, describe, test } from 'node:test';
import {
  BookingEventKind,
  BookingStatus,
  ClientEvent,
  ServerEvent,
  startCodeFor,
  type GigAcceptAck,
  type GigOfferPayload,
} from '@sahayo/shared';
import * as bookings from '../src/repositories/bookings';
import * as ledger from '../src/repositories/ledger';
import {
  connectAs,
  createBooking,
  next,
  onlineElectricians,
  post,
  startServer,
  waitFor,
  type ClientSocket,
  type TestServer,
} from './helpers';

let server: TestServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});
after(() => setTimeout(() => process.exit(0), 50).unref());

describe('dispatch', () => {
  test('RACE: five simultaneous accepts on one booking — exactly one succeeds, the other four are told it is taken', async () => {
    server = await startServer(10_000);
    const five = await onlineElectricians(server, 5);

    const offers = five.map(({ socket }) => next(socket, ServerEvent.GIG_OFFER));
    const { record } = await createBooking(server);
    const received = await Promise.all(offers);
    assert.equal(received.length, 5, 'all five were offered the job at once');
    assert.ok(received.every((offer) => offer.bookingId === record.booking.id));

    const taken = five.map(({ socket }) => next(socket, ServerEvent.GIG_TAKEN, 3_000).then(() => true, () => false));

    /* All five fire in the same tick. */
    const acks: GigAcceptAck[] = await Promise.all(
      five.map(({ id, socket }, index) =>
        socket.emitWithAck(ClientEvent.GIG_ACCEPT, { workerId: id, bookingId: record.booking.id, offerId: received[index]!.offerId }),
      ),
    );

    const winners = acks.filter((ack) => ack.ok);
    const losers = acks.filter((ack) => !ack.ok);
    assert.equal(winners.length, 1, `exactly one accept succeeds, got ${winners.length}`);
    assert.equal(losers.length, 4);
    assert.ok(losers.every((ack) => ack.reason === 'TAKEN'), 'every loser is told TAKEN');

    const winnerIndex = acks.findIndex((ack) => ack.ok);
    const stored = bookings.findById(record.booking.id)!;
    assert.equal(stored.status, BookingStatus.ACCEPTED);
    assert.equal(stored.workerId, five[winnerIndex]!.id, 'the booking went to the worker whose accept won');
    assert.equal(winners[0]!.booking?.workerId, five[winnerIndex]!.id);

    const gotTaken = await Promise.all(taken);
    assert.deepEqual(
      gotTaken.map((value, index) => (index === winnerIndex ? 'winner' : value)),
      gotTaken.map((_, index) => (index === winnerIndex ? 'winner' : true)),
      'each of the four losers received gig:taken',
    );
    assert.equal(bookings.eventsFor(record.booking.id).filter((event) => event.kind === BookingEventKind.ACCEPTED).length, 1, 'one ACCEPTED event, not five');
  });

  test('the offer carries the server clock: issuedAt and expiresAt are exactly the offer window apart', async () => {
    server = await startServer(1_500);
    const [worker] = await onlineElectricians(server, 1);
    const offer = next(worker!.socket, ServerEvent.GIG_OFFER);
    await createBooking(server);
    const payload: GigOfferPayload = await offer;
    assert.equal(Date.parse(payload.expiresAt) - Date.parse(payload.issuedAt), 1_500);
    assert.equal(payload.customerName, 'Neha Sinha');
    assert.equal(payload.booking.status, BookingStatus.BROADCAST);
  });

  test('TIMEOUT: nobody accepts — the radius widens to 8 km, the job is offered once more, then it expires', async () => {
    server = await startServer(300);
    const [worker] = await onlineElectricians(server, 1);

    const first = next(worker!.socket, ServerEvent.GIG_OFFER);
    const { record } = await createBooking(server);
    const round1 = await first;
    const round2 = await next(worker!.socket, ServerEvent.GIG_OFFER, 2_000);
    assert.notEqual(round1.offerId, round2.offerId, 'the second round issues a new offer');

    await next(worker!.socket, ServerEvent.GIG_EXPIRED, 2_000);
    await waitFor(() => bookings.findById(record.booking.id)?.status === BookingStatus.EXPIRED_NO_ACCEPT, 2_000);

    const kinds = bookings.eventsFor(record.booking.id).map((event) => event.kind);
    assert.deepEqual(kinds, [BookingEventKind.REQUESTED, BookingEventKind.BROADCAST, BookingEventKind.PINGED, BookingEventKind.PINGED, BookingEventKind.EXPIRED]);
    assert.match(bookings.eventsFor(record.booking.id)[3]!.detail, /widened to 8 km/);

    const late = await worker!.socket.emitWithAck(ClientEvent.GIG_ACCEPT, { workerId: worker!.id, bookingId: record.booking.id, offerId: round2.offerId });
    assert.deepEqual(late, { ok: false, reason: 'EXPIRED' }, 'an accept after expiry is refused');
  });

  test('DECLINE: when everyone offered declines, the round ends at once and a decliner is not offered it again', async () => {
    server = await startServer(10_000);
    const [worker] = await onlineElectricians(server, 1);
    const offer = next(worker!.socket, ServerEvent.GIG_OFFER);
    const { record } = await createBooking(server);
    const { offerId } = await offer;

    const started = Date.now();
    worker!.socket.emit(ClientEvent.GIG_DECLINE, { workerId: worker!.id, bookingId: record.booking.id, offerId, reason: 'too_far' });
    await waitFor(() => bookings.findById(record.booking.id)?.status === BookingStatus.EXPIRED_NO_ACCEPT, 2_000);
    assert.ok(Date.now() - started < 2_000, 'did not wait out the 10-second window');
  });

  test('ROOM: after accept, customer and worker receive the same booking updates; completion posts the split and moves the fund', async () => {
    server = await startServer(10_000);
    const customer: ClientSocket = await connectAs(server, 'usr_cust_demo', 'CUSTOMER');
    const [worker] = await onlineElectricians(server, 1);

    const offer = next(worker!.socket, ServerEvent.GIG_OFFER);
    const { record } = await createBooking(server);
    const { offerId } = await offer;
    const ack = await worker!.socket.emitWithAck(ClientEvent.GIG_ACCEPT, { workerId: worker!.id, bookingId: record.booking.id, offerId });
    assert.equal(ack.ok, true);
    const id = record.booking.id;
    const actor = { role: 'WORKER' as const, id: worker!.id };

    for (const to of [BookingStatus.EN_ROUTE, BookingStatus.ARRIVED]) {
      const both = Promise.all([next(customer, ServerEvent.BOOKING_UPDATED), next(worker!.socket, ServerEvent.BOOKING_UPDATED)]);
      assert.equal((await post(server, `/bookings/${id}/transitions`, { to, actor })).status, 200);
      const [toCustomer, toWorker] = await both;
      assert.deepEqual(toCustomer, toWorker, `both ends of the room got the identical ${to} update`);
      assert.equal(toCustomer.status, to);
    }

    const wrong = await post(server, `/bookings/${id}/transitions`, { to: BookingStatus.IN_PROGRESS, actor, startCode: startCodeFor(id) === '1234' ? '4321' : '1234' });
    assert.equal(wrong.status, 422);
    assert.equal(wrong.body.error, 'WRONG_START_CODE');

    const impostor = await post(server, `/bookings/${id}/transitions`, { to: BookingStatus.IN_PROGRESS, actor: { role: 'WORKER', id: 'wrk_ramesh' }, startCode: startCodeFor(id) });
    assert.equal(impostor.status, 403, 'another worker cannot move this booking');

    assert.equal((await post(server, `/bookings/${id}/transitions`, { to: BookingStatus.IN_PROGRESS, actor, startCode: startCodeFor(id) })).status, 200);

    const fundBefore = ledger.coopFundTotal();
    const fundEvent = next(worker!.socket, ServerEvent.COOP_FUND_UPDATED);
    const done = await post(server, `/bookings/${id}/transitions`, { to: BookingStatus.COMPLETED, actor });
    assert.equal(done.status, 200);
    const fund = await fundEvent;
    const rows = ledger.entriesForBooking(id);
    assert.deepEqual(rows.map((row) => row.type).sort(), ['COOP_FUND_CONTRIBUTION', 'PLATFORM_FEE', 'WORKER_PAYOUT'], 'three ledger rows, one of each');
    assert.equal(rows.reduce((sum, row) => sum + row.amount, 0), bookings.findById(id)!.amount, 'the three rows sum to the gross exactly');
    assert.equal(ledger.coopFundTotal(), fundBefore + fund.delta, 'the fund moved by exactly its share');

    const again = await post(server, `/bookings/${id}/transitions`, { to: BookingStatus.EN_ROUTE, actor });
    assert.equal(again.status, 409);
    assert.match(again.body.message ?? '', /COMPLETED.*EN_ROUTE/);
  });

  test('HANDSHAKE: a connection without userId and role is refused', async () => {
    server = await startServer();
    await assert.rejects(connectAs(server, '', 'WORKER'), /HANDSHAKE_REJECTED/);
    await assert.rejects(connectAs(server, 'wrk_nobody', 'WORKER'), /HANDSHAKE_REJECTED/);
  });
});
