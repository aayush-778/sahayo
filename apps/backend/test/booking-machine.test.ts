import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { BookingStatus } from '@sahayo/shared';
import { IllegalTransitionError, TRANSITIONS, assertTransition } from '../src/domain/booking-machine';

describe('booking state machine', () => {
  test('the happy path is legal, each step for the role that takes it', () => {
    const path: Array<[BookingStatus, BookingStatus, 'SYSTEM' | 'WORKER' | 'ADMIN']> = [
      [BookingStatus.REQUESTED, BookingStatus.BROADCAST, 'SYSTEM'],
      [BookingStatus.BROADCAST, BookingStatus.ACCEPTED, 'WORKER'],
      [BookingStatus.ACCEPTED, BookingStatus.EN_ROUTE, 'WORKER'],
      [BookingStatus.EN_ROUTE, BookingStatus.ARRIVED, 'WORKER'],
      [BookingStatus.ARRIVED, BookingStatus.IN_PROGRESS, 'WORKER'],
      [BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, 'WORKER'],
      [BookingStatus.COMPLETED, BookingStatus.SETTLED, 'ADMIN'],
    ];
    for (const [from, to, role] of path) assert.doesNotThrow(() => assertTransition(from, to, role), `${from} → ${to}`);
  });

  test('an illegal move throws, and the message names both states', () => {
    assert.throws(
      () => assertTransition(BookingStatus.REQUESTED, BookingStatus.COMPLETED, 'WORKER'),
      (error: unknown) =>
        error instanceof IllegalTransitionError &&
        error.message.includes('REQUESTED') &&
        error.message.includes('COMPLETED') &&
        error.reason === 'NO_SUCH_MOVE',
    );
  });

  test('a legal move by the wrong role is refused: a customer cannot mark a worker as arrived', () => {
    assert.throws(
      () => assertTransition(BookingStatus.EN_ROUTE, BookingStatus.ARRIVED, 'CUSTOMER'),
      (error: unknown) => error instanceof IllegalTransitionError && error.reason === 'WRONG_ROLE' && /EN_ROUTE.*ARRIVED/.test(error.message),
    );
  });

  test('terminal states have no way out, and nothing goes backwards', () => {
    for (const terminal of [BookingStatus.CANCELLED_BY_CUSTOMER, BookingStatus.CANCELLED_BY_WORKER, BookingStatus.EXPIRED_NO_ACCEPT, BookingStatus.DISPUTED]) {
      assert.deepEqual(Object.keys(TRANSITIONS[terminal]), [], terminal);
    }
    assert.throws(() => assertTransition(BookingStatus.IN_PROGRESS, BookingStatus.EN_ROUTE, 'WORKER'), IllegalTransitionError);
    assert.throws(() => assertTransition(BookingStatus.SETTLED, BookingStatus.COMPLETED, 'ADMIN'), IllegalTransitionError);
  });
});
