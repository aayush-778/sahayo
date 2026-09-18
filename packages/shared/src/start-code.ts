import type { Id } from './types/common';

/** How many digits a start code has. */
export const START_CODE_LENGTH = 4;

/**
 * A booking's start code: the four digits the customer's app shows and reads out at
 * the door, which the worker must enter before the job can start.
 *
 * Derived from the booking id rather than random, so it is the same on every run of
 * the demo and the same in both apps. The server is the one that checks it: the
 * transition to IN_PROGRESS is refused without it.
 */
export function startCodeFor(bookingId: Id): string {
  let hash = 0;
  for (let i = 0; i < bookingId.length; i += 1) hash = (hash * 31 + bookingId.charCodeAt(i)) >>> 0;
  return String(1000 + (hash % 9000));
}
