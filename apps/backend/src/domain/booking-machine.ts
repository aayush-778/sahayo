import { BookingEventKind, BookingStatus, type BookingActor } from '@sahayo/shared';

/**
 * The booking state machine, enforced on the server.
 *
 *   REQUESTED → BROADCAST → ACCEPTED → EN_ROUTE → ARRIVED → IN_PROGRESS
 *             → COMPLETED → SETTLED
 *   plus CANCELLED_BY_CUSTOMER, CANCELLED_BY_WORKER, EXPIRED_NO_ACCEPT, DISPUTED
 *
 * Every legal move is listed here with the roles allowed to make it. Anything not
 * listed is refused, whatever the client's screen allowed — the apps prevent illegal
 * moves too, but a client is never the thing that keeps the data honest.
 */

type Role = BookingActor['role'];

const { CUSTOMER, WORKER, ADMIN, SYSTEM } = { CUSTOMER: 'CUSTOMER', WORKER: 'WORKER', ADMIN: 'ADMIN', SYSTEM: 'SYSTEM' } as const;
const cancellable = {
  [BookingStatus.CANCELLED_BY_CUSTOMER]: [CUSTOMER, ADMIN],
  [BookingStatus.CANCELLED_BY_WORKER]: [WORKER, ADMIN],
};
const disputable = [CUSTOMER, WORKER, ADMIN];

export const TRANSITIONS: Readonly<Record<BookingStatus, Partial<Record<BookingStatus, readonly Role[]>>>> = {
  [BookingStatus.REQUESTED]: {
    [BookingStatus.BROADCAST]: [SYSTEM],
    /* No worker within even the widened radius: nothing was ever offered. */
    [BookingStatus.EXPIRED_NO_ACCEPT]: [SYSTEM],
    [BookingStatus.CANCELLED_BY_CUSTOMER]: [CUSTOMER, ADMIN],
  },
  [BookingStatus.BROADCAST]: {
    [BookingStatus.ACCEPTED]: [WORKER],
    [BookingStatus.EXPIRED_NO_ACCEPT]: [SYSTEM],
    [BookingStatus.CANCELLED_BY_CUSTOMER]: [CUSTOMER, ADMIN],
  },
  [BookingStatus.ACCEPTED]: { [BookingStatus.EN_ROUTE]: [WORKER], ...cancellable },
  [BookingStatus.EN_ROUTE]: { [BookingStatus.ARRIVED]: [WORKER], ...cancellable },
  [BookingStatus.ARRIVED]: { [BookingStatus.IN_PROGRESS]: [WORKER], ...cancellable },
  [BookingStatus.IN_PROGRESS]: { [BookingStatus.COMPLETED]: [WORKER, ADMIN], [BookingStatus.DISPUTED]: disputable },
  [BookingStatus.COMPLETED]: { [BookingStatus.SETTLED]: [ADMIN, SYSTEM], [BookingStatus.DISPUTED]: disputable },
  [BookingStatus.SETTLED]: { [BookingStatus.DISPUTED]: disputable },
  [BookingStatus.CANCELLED_BY_CUSTOMER]: {},
  [BookingStatus.CANCELLED_BY_WORKER]: {},
  [BookingStatus.EXPIRED_NO_ACCEPT]: {},
  [BookingStatus.DISPUTED]: {},
};

/** Thrown for a move the machine does not allow. The message names both states. */
export class IllegalTransitionError extends Error {
  constructor(
    readonly from: BookingStatus,
    readonly to: BookingStatus,
    readonly role: Role,
    readonly reason: 'NO_SUCH_MOVE' | 'WRONG_ROLE',
  ) {
    super(
      reason === 'NO_SUCH_MOVE'
        ? `A booking cannot move from ${from} to ${to}.`
        : `A ${role.toLowerCase()} cannot move a booking from ${from} to ${to}.`,
    );
    this.name = 'IllegalTransitionError';
  }
}

/** Returns if `role` may move a booking from `from` to `to`; throws IllegalTransitionError otherwise. */
export function assertTransition(from: BookingStatus, to: BookingStatus, role: Role): void {
  const allowed = TRANSITIONS[from][to];
  if (!allowed) throw new IllegalTransitionError(from, to, role, 'NO_SUCH_MOVE');
  if (!allowed.includes(role)) throw new IllegalTransitionError(from, to, role, 'WRONG_ROLE');
}

/** The history event each status is recorded as. */
export const EVENT_KIND_FOR: Readonly<Record<BookingStatus, BookingEventKind>> = {
  [BookingStatus.REQUESTED]: BookingEventKind.REQUESTED,
  [BookingStatus.BROADCAST]: BookingEventKind.BROADCAST,
  [BookingStatus.ACCEPTED]: BookingEventKind.ACCEPTED,
  [BookingStatus.EN_ROUTE]: BookingEventKind.EN_ROUTE,
  [BookingStatus.ARRIVED]: BookingEventKind.ARRIVED,
  [BookingStatus.IN_PROGRESS]: BookingEventKind.STARTED,
  [BookingStatus.COMPLETED]: BookingEventKind.COMPLETED,
  [BookingStatus.SETTLED]: BookingEventKind.PAID,
  [BookingStatus.CANCELLED_BY_CUSTOMER]: BookingEventKind.CANCELLED,
  [BookingStatus.CANCELLED_BY_WORKER]: BookingEventKind.CANCELLED,
  [BookingStatus.EXPIRED_NO_ACCEPT]: BookingEventKind.EXPIRED,
  [BookingStatus.DISPUTED]: BookingEventKind.DISPUTED,
};

/** Statuses in which an assigned worker is out on the job. */
export const ON_JOB_STATUSES: ReadonlySet<BookingStatus> = new Set([
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
]);

/** Statuses a booking can still leave. */
export const OPEN_STATUSES: ReadonlySet<BookingStatus> = new Set(
  (Object.keys(TRANSITIONS) as BookingStatus[]).filter((status) => Object.keys(TRANSITIONS[status]).length > 0),
);
