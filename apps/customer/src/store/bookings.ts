import { useMemo } from 'react';
import { create } from 'zustand';
import {
  BookingStatus,
  type Booking,
  type BookingFare,
  type Id,
  type Paise,
} from '@sahayo/shared';

import {
  CUSTOMER_ID,
  RAJENDRA_NAGAR,
  etaMinutesByBookingId,
  mockBookings,
  paymentByBookingId,
  type BookingPayment,
} from '../mocks/bookings';
import {
  findParentCategory,
  findServiceItem,
  findServiceSkuById,
  findSubCategoryIdForSku,
  findWorkerById,
  workersNear,
} from '../mocks';
import type { MockWorker } from '../mocks';
import { nextStatus } from '../lib/bookingStatus';
import type { PaymentMethod } from '../lib/payment';
import type { FareBreakdown } from '../lib/fare';

/**
 * Every booking the app knows about, and the changes made to them in this
 * session.
 *
 * There are two sources. `mocks/bookings.ts` is seeded history that already
 * existed; the `created` list is what the customer booked just now. Screens
 * never see the seam — `useBookingViews` merges both and applies whatever has
 * happened since: a status advanced by the tracker, a worker assigned on
 * acceptance, a cash bill settled.
 *
 * OVERRIDES RATHER THAN MUTATION. The seeded bookings are `const` literals
 * guarded by `satisfies Booking[]`, and editing them in place would mean
 * giving that up. Keeping the deltas in their own maps means the mock data
 * stays exactly as written and a restart returns to a known state — which is
 * what you want when the same demo is given twice.
 *
 * IN MEMORY, deliberately. Phase 5 replaces the whole store with what the
 * backend returns over the socket.
 */

export interface CreatedBooking {
  booking: Booking;
  method: PaymentMethod;
  paid: boolean;
  transactionId?: string;
  /**
   * What the customer is charged, in integer paise.
   *
   * NOT `booking.fare.total`. `BookingFare` is the splittable revenue — the
   * item total the worker, platform and fund shares come out of, summing to
   * it exactly. GST sits outside that split because it is collected and
   * remitted rather than divided, so the charged amount is the fare total
   * plus tax.
   */
  amountChargedPaise: Paise;
}

interface BookingsState {
  created: CreatedBooking[];
  statusOverrides: Record<Id, BookingStatus>;
  workerOverrides: Record<Id, Id>;
  paymentOverrides: Record<Id, BookingPayment>;

  add: (entry: CreatedBooking) => void;
  setStatus: (bookingId: Id, status: BookingStatus) => void;
  assignWorker: (bookingId: Id, workerId: Id) => void;
  setPayment: (bookingId: Id, payment: BookingPayment) => void;
  reset: () => void;
}

export const useBookingsStore = create<BookingsState>((set) => ({
  created: [],
  statusOverrides: {},
  workerOverrides: {},
  paymentOverrides: {},

  add: (entry) => set((state) => ({ created: [entry, ...state.created] })),
  setStatus: (bookingId, status) =>
    set((state) => ({ statusOverrides: { ...state.statusOverrides, [bookingId]: status } })),
  assignWorker: (bookingId, workerId) =>
    set((state) => ({ workerOverrides: { ...state.workerOverrides, [bookingId]: workerId } })),
  setPayment: (bookingId, payment) =>
    set((state) => ({ paymentOverrides: { ...state.paymentOverrides, [bookingId]: payment } })),
  reset: () => set({ created: [], statusOverrides: {}, workerOverrides: {}, paymentOverrides: {} }),
}));

let sequence = 0;

/** A booking id that cannot collide with the seeded `bkg_*` ids. */
function nextBookingId(): Id {
  sequence += 1;
  return `bkg_new_${Date.now().toString(36)}_${sequence}`;
}

export interface CreateBookingInput {
  serviceItemId: Id;
  fare: FareBreakdown;
  method: PaymentMethod;
  paid: boolean;
  transactionId?: string;
  scheduledFor?: string;
}

/**
 * Records a paid (or promised) booking and returns its id.
 *
 * Status is REQUESTED, not ACCEPTED: paying broadcasts the job, it does not
 * conjure a worker who has agreed to it. `workerId` stays unset until
 * `acceptBooking` runs.
 */
export function createBooking(input: CreateBookingInput): Id {
  const id = nextBookingId();
  const now = new Date().toISOString();

  const booking: Booking = {
    id,
    customerId: CUSTOMER_ID,
    serviceCategoryId: input.serviceItemId,
    status: BookingStatus.REQUESTED,
    address: RAJENDRA_NAGAR,
    scheduledFor: input.scheduledFor,
    fare: {
      total: input.fare.itemTotal,
      workerShare: input.fare.workerEarns,
      platformShare: input.fare.platformFee,
      coopFundShare: input.fare.coopFund,
    },
    createdAt: now,
    updatedAt: now,
  };

  useBookingsStore.getState().add({
    booking,
    method: input.method,
    paid: input.paid,
    transactionId: input.transactionId,
    amountChargedPaise: input.fare.total,
  });

  return id;
}

/**
 * A worker accepts the broadcast.
 *
 * Picks the nearest available member of the right worker type rather than a
 * fixed name, so the person who accepts is one of the pins the customer just
 * watched on the booking map. Phase 5 replaces this with whoever actually
 * taps accept in the worker app.
 */
export function acceptBooking(bookingId: Id): void {
  const store = useBookingsStore.getState();
  const view = resolveBooking(bookingId, store);
  if (!view) return;

  store.setStatus(bookingId, BookingStatus.ACCEPTED);

  if (!view.worker) {
    const item = findServiceItem(view.booking.serviceCategoryId);
    const category = item ? findParentCategory(item.subCategoryId) : undefined;
    const nearest = category ? workersNear(category.id)[0] : undefined;
    if (nearest) store.assignWorker(bookingId, nearest.profile.id);
  }
}

/** Moves one step along the tracker. Used by the tracker's manual advance. */
export function advanceBooking(bookingId: Id, from: BookingStatus): void {
  const next = nextStatus(from);
  if (next) useBookingsStore.getState().setStatus(bookingId, next);
}

/** Settles a bill that was left open — a cash job that has now been paid. */
export function settleBooking(bookingId: Id, method: PaymentMethod, transactionId: string): void {
  const store = useBookingsStore.getState();
  store.setPayment(bookingId, { method, paid: true, transactionId });
  store.setStatus(bookingId, BookingStatus.SETTLED);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** The slice of store state a view is derived from. */
type BookingSources = Pick<
  BookingsState,
  'created' | 'statusOverrides' | 'workerOverrides' | 'paymentOverrides'
>;

export interface BookingView {
  booking: Booking;
  /** The status after any session change — always use this, not booking.status. */
  status: BookingStatus;
  worker?: MockWorker;
  /** Resolved from whichever catalogue the booking's id belongs to. */
  serviceName: string;
  /** Where "book again" routes to. Undefined if the item no longer resolves. */
  subCategoryId?: Id;
  fare?: BookingFare;
  payment?: BookingPayment;
  etaMinutes?: number;
  amountChargedPaise?: Paise;
}

/**
 * A booking's service name.
 *
 * Seeded bookings point at the legacy SKU catalogue and session bookings at
 * the seed item catalogue, because the two were written a sub-phase apart.
 * Trying both here is what keeps every other screen from having to know that.
 */
function serviceNameOf(serviceCategoryId: Id): string {
  return (
    findServiceItem(serviceCategoryId)?.name ??
    findServiceSkuById(serviceCategoryId)?.name ??
    serviceCategoryId
  );
}

function resolveBooking(
  bookingId: Id,
  state: BookingSources,
): BookingView | undefined {
  const created = state.created.find((entry) => entry.booking.id === bookingId);
  const seeded = created ? undefined : mockBookings.find((entry) => entry.id === bookingId);
  const booking: Booking | undefined = created?.booking ?? seeded;
  if (!booking) return undefined;

  return toView(booking, created, state);
}

function toView(
  booking: Booking,
  created: CreatedBooking | undefined,
  state: BookingSources,
): BookingView {
  const workerId = state.workerOverrides[booking.id] ?? booking.workerId;

  return {
    booking,
    status: state.statusOverrides[booking.id] ?? booking.status,
    worker: workerId ? findWorkerById(workerId) : undefined,
    serviceName: serviceNameOf(booking.serviceCategoryId),
    subCategoryId:
      findServiceItem(booking.serviceCategoryId)?.subCategoryId ??
      findSubCategoryIdForSku(booking.serviceCategoryId),
    fare: booking.fare,
    payment:
      state.paymentOverrides[booking.id] ??
      (created
        ? { method: created.method, paid: created.paid, transactionId: created.transactionId }
        : paymentByBookingId[booking.id]),
    etaMinutes: etaMinutesByBookingId[booking.id],
    amountChargedPaise: created?.amountChargedPaise,
  };
}

/**
 * The four pieces of state a view is derived from.
 *
 * Selected individually because each one is a stable reference that only
 * changes when it is actually written to. Building the derived list INSIDE a
 * zustand selector would hand `useSyncExternalStore` a freshly allocated
 * array on every call, which it reads as the store having changed again —
 * React warns about an uncached getSnapshot and can spin. Deriving outside,
 * under `useMemo`, keeps the snapshot stable.
 */
function useBookingSources() {
  const created = useBookingsStore((state) => state.created);
  const statusOverrides = useBookingsStore((state) => state.statusOverrides);
  const workerOverrides = useBookingsStore((state) => state.workerOverrides);
  const paymentOverrides = useBookingsStore((state) => state.paymentOverrides);
  return { created, statusOverrides, workerOverrides, paymentOverrides };
}

/** Every booking, newest first. Session bookings lead the seeded history. */
export function useBookingViews(): BookingView[] {
  const sources = useBookingSources();

  const { created, statusOverrides, workerOverrides, paymentOverrides } = sources;

  return useMemo(() => {
    const state = { created, statusOverrides, workerOverrides, paymentOverrides };
    const views = [
      ...created.map((entry) => toView(entry.booking, entry, state)),
      ...mockBookings.map((booking) => toView(booking, undefined, state)),
    ];
    return views.sort(
      (a, b) => new Date(b.booking.createdAt).getTime() - new Date(a.booking.createdAt).getTime(),
    );
  }, [created, statusOverrides, workerOverrides, paymentOverrides]);
}

export function useBookingView(bookingId: string | undefined): BookingView | undefined {
  const sources = useBookingSources();

  const { created, statusOverrides, workerOverrides, paymentOverrides } = sources;

  return useMemo(() => {
    if (!bookingId) return undefined;
    return resolveBooking(bookingId, {
      created,
      statusOverrides,
      workerOverrides,
      paymentOverrides,
    });
  }, [bookingId, created, statusOverrides, workerOverrides, paymentOverrides]);
}
