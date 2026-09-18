import assert from 'node:assert/strict';
import { after, afterEach, describe, test } from 'node:test';
import { BookingStatus, ClientEvent, KycStatus, LedgerEntryType, ServerEvent, startCodeFor } from '@sahayo/shared';
import * as bookings from '../src/repositories/bookings';
import * as ledger from '../src/repositories/ledger';
import * as workers from '../src/repositories/workers';
import { connectAs, createBooking, next, onlineElectricians, post, startServer, type TestServer } from './helpers';

let server: TestServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});
after(() => setTimeout(() => process.exit(0), 50).unref());

describe('live admin view, payment and verification', () => {
  test('ADMIN ROOM: a dispatch round and its resolution arrive with every equity component and the elapsed time', async () => {
    server = await startServer(10_000);
    const admin = await connectAs(server, 'admin-anjali-verma', 'ADMIN');
    const [worker] = await onlineElectricians(server, 1);

    const round = next(admin, ServerEvent.DISPATCH_ROUND);
    const offer = next(worker!.socket, ServerEvent.GIG_OFFER);
    const { record } = await createBooking(server);
    const payload = await round;
    assert.equal(payload.bookingId, record.booking.id);
    assert.equal(payload.round, 1);
    const mine = payload.candidates.find((candidate) => candidate.workerId === worker!.id)!;
    assert.ok(mine.offered && mine.connected, 'the connected worker is marked offered and connected');
    assert.deepEqual(Object.keys(mine.inputs).sort(), ['inverseAllocation', 'proximity', 'rating']);
    assert.equal(mine.score, Math.round((mine.inputs.proximity * payload.weights.proximity + mine.inputs.rating * payload.weights.rating + mine.inputs.inverseAllocation * payload.weights.inverseAllocation) * 1000) / 1000);

    const resolved = next(admin, ServerEvent.DISPATCH_RESOLVED);
    const { offerId } = await offer;
    await worker!.socket.emitWithAck(ClientEvent.GIG_ACCEPT, { workerId: worker!.id, bookingId: record.booking.id, offerId });
    const resolution = await resolved;
    assert.equal(resolution.outcome, 'ACCEPTED');
    assert.equal(resolution.workerId, worker!.id);
    assert.ok(resolution.elapsedMs >= 0 && resolution.elapsedMs < 5_000);

    const snapshot = (await (await fetch(`${server.url}/api/v1/admin/live`)).json()) as { bookings: Array<{ id: string; status: string }>; broadcasts: Array<{ bookingId: string; resolution?: unknown }> };
    assert.ok(snapshot.bookings.some((booking) => booking.id === record.booking.id && booking.status === 'ACCEPTED'), 'the snapshot carries the booking in the portal shape');
    assert.ok(snapshot.broadcasts.some((broadcast) => broadcast.bookingId === record.booking.id && broadcast.resolution), 'and its dispatch record');
  });

  test('FINALE: completion sends the three ledger rows and the new fund balance to the admin room; payment is recorded once, status unchanged', async () => {
    server = await startServer(10_000);
    const admin = await connectAs(server, 'admin-anjali-verma', 'ADMIN');
    const customer = await connectAs(server, 'usr_cust_demo', 'CUSTOMER');
    const [worker] = await onlineElectricians(server, 1);

    const offer = next(worker!.socket, ServerEvent.GIG_OFFER);
    const { record } = await createBooking(server);
    const id = record.booking.id;
    const accepted = next(customer, ServerEvent.BOOKING_UPDATED);
    await worker!.socket.emitWithAck(ClientEvent.GIG_ACCEPT, { workerId: worker!.id, bookingId: id, offerId: (await offer).offerId });
    const update = await accepted;
    assert.equal(update.status, BookingStatus.ACCEPTED);
    assert.equal(update.worker?.id, worker!.id, 'the customer is told who is coming in the same event');
    assert.ok(update.worker?.name && update.worker.avatarUrl && update.worker.rating > 0);

    const actor = { role: 'WORKER' as const, id: worker!.id };
    for (const to of [BookingStatus.EN_ROUTE, BookingStatus.ARRIVED]) await post(server, `/bookings/${id}/transitions`, { to, actor });
    await post(server, `/bookings/${id}/transitions`, { to: BookingStatus.IN_PROGRESS, actor, startCode: startCodeFor(id) });

    const early = await post(server, `/bookings/${id}/payment`, { customerId: 'usr_cust_demo', method: 'upi' });
    assert.equal(early.status, 409, 'nothing is paid for before completion');

    const fundBefore = ledger.coopFundTotal();
    const appended = next(admin, ServerEvent.LEDGER_APPENDED);
    await post(server, `/bookings/${id}/transitions`, { to: BookingStatus.COMPLETED, actor });
    const finale = await appended;
    assert.equal(finale.bookingId, id);
    assert.deepEqual(finale.entries.map((entry) => entry.type).sort(), [LedgerEntryType.COOP_FUND_CONTRIBUTION, LedgerEntryType.PLATFORM_FEE, LedgerEntryType.WORKER_PAYOUT].sort());
    const fundShare = finale.entries.find((entry) => entry.type === LedgerEntryType.COOP_FUND_CONTRIBUTION)!.amount;
    assert.equal(finale.fundBalance, fundBefore + fundShare, 'the balance sent is the balance after the share');

    const paid = await post(server, `/bookings/${id}/payment`, { customerId: 'usr_cust_demo', method: 'upi', transactionId: 'UPI123' });
    assert.equal(paid.status, 200);
    assert.equal(bookings.findById(id)!.status, BookingStatus.COMPLETED, 'paying does not move the status');
    assert.equal(bookings.findById(id)!.payment?.method, 'upi');
    assert.equal(ledger.coopFundTotal(), fundBefore + fundShare, 'paying posts nothing more to the ledger');
    const twice = await post(server, `/bookings/${id}/payment`, { customerId: 'usr_cust_demo', method: 'upi' });
    assert.equal(twice.status, 409);
  });

  test('KYC: approving a member reaches their app at once and puts them among verified workers', async () => {
    server = await startServer();
    const queue = (await (await fetch(`${server.url}/api/v1/admin/kyc/queue`)).json()) as Array<{ workerId: string }>;
    assert.ok(queue.length > 0, 'the verification queue is served');
    const pending = queue[0]!.workerId;
    const app = await connectAs(server, pending, 'WORKER');

    const pushed = next(app, ServerEvent.WORKER_KYC_UPDATED);
    const started = Date.now();
    const decided = await post(server, `/admin/workers/${pending}/kyc`, { status: 'VERIFIED', adminId: 'admin-anjali-verma' });
    assert.equal(decided.status, 200);
    const event = await pushed;
    assert.equal(event.kycStatus, KycStatus.VERIFIED);
    assert.ok(Date.now() - started < 1_000, 'within a second');
    assert.equal(workers.findById(pending)!.kycStatus, KycStatus.VERIFIED);
  });
});
