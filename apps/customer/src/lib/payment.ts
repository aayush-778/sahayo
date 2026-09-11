/**
 * The payment boundary.
 *
 * Phase 5 replaces `createMockPaymentProvider` with a Razorpay-backed one and
 * changes nothing else: the screen depends on `PaymentProvider`, never on the
 * implementation, and picks it up from the single `paymentProvider` constant
 * at the bottom of this file. That constant is the whole swap.
 *
 * Nothing here touches card data. The card fields on the payment screen are
 * component state that never leaves the component — no card number is passed
 * into `pay`, stored, or logged, because a mock that gets careless about card
 * handling teaches the real integration the same habit.
 */

/** The four ways to pay. `cash` is the odd one — see `payNow` below. */
export const PAYMENT_METHODS = ['upi', 'card', 'wallet', 'cash'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentRequest {
  /** Integer paise. */
  amountPaise: number;
  method: PaymentMethod;
  /** Our own idempotency handle for the attempt — a booking reference. */
  reference: string;
}

export type PaymentResult =
  | { status: 'SUCCEEDED'; transactionId: string }
  | { status: 'FAILED'; reason: string };

export interface PaymentProvider {
  readonly id: string;
  pay(request: PaymentRequest): Promise<PaymentResult>;
}

/**
 * Force the next attempt to fail.
 *
 * OFF, and it stays off. A provider that fails at random would eventually
 * fail on stage; a provider that can only ever succeed means the failure path
 * has no UI and nobody notices until it matters. This switch gives us a
 * handled failure to demonstrate on purpose, and never by accident.
 */
export const FAIL_NEXT_PAYMENT = false;

/** How long the mock pretends to be talking to a bank. */
const MOCK_LATENCY_MS = 1500;

function mockTransactionId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const noise = Math.floor(Math.random() * 46_656)
    .toString(36)
    .toUpperCase()
    .padStart(3, '0');
  return `SHY${stamp}${noise}`;
}

export function createMockPaymentProvider(): PaymentProvider {
  return {
    id: 'mock',
    async pay(request: PaymentRequest): Promise<PaymentResult> {
      await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

      if (FAIL_NEXT_PAYMENT) {
        return { status: 'FAILED', reason: 'declined' };
      }
      if (request.amountPaise <= 0) {
        // Not reachable from the UI — quote items never reach checkout — but
        // a provider that would happily charge nothing is a provider that
        // will happily charge nothing later.
        return { status: 'FAILED', reason: 'invalid_amount' };
      }

      return { status: 'SUCCEEDED', transactionId: mockTransactionId() };
    },
  };
}

/** The one line Phase 5 changes. */
export const paymentProvider: PaymentProvider = createMockPaymentProvider();

/**
 * Whether choosing this method moves money now.
 *
 * Cash does not go through the provider at all. It is a promise to pay on
 * completion, not a payment, and running it through a payment gateway — even
 * a fake one — would produce a transaction id for money that has not moved
 * and a "paid" state that is not true.
 */
export function settlesImmediately(method: PaymentMethod): boolean {
  return method !== 'cash';
}
