import type { Id, IsoDateTime, Paise } from './common';

/** What kind of movement this row records. */
export const LedgerEntryType = {
  BOOKING_CHARGE: 'BOOKING_CHARGE',
  WORKER_PAYOUT: 'WORKER_PAYOUT',
  PLATFORM_FEE: 'PLATFORM_FEE',
  COOP_FUND_CONTRIBUTION: 'COOP_FUND_CONTRIBUTION',
  COOP_FUND_DISBURSEMENT: 'COOP_FUND_DISBURSEMENT',
  REFUND: 'REFUND',
  ADJUSTMENT: 'ADJUSTMENT',
  /**
   * Money leaving a worker's platform balance for their bank account.
   *
   * A separate row rather than a status on the WORKER_PAYOUT it settles, because
   * the ledger is append-only: "pending" and "released" are derived from whether a
   * release row exists, never stored by changing the payout row.
   */
  PAYOUT_RELEASE: 'PAYOUT_RELEASE',
} as const;
export type LedgerEntryType = (typeof LedgerEntryType)[keyof typeof LedgerEntryType];

/** Which book the row lands in. */
export const LedgerAccount = {
  CUSTOMER: 'CUSTOMER',
  WORKER: 'WORKER',
  PLATFORM: 'PLATFORM',
  COOP_FUND: 'COOP_FUND',
} as const;
export type LedgerAccount = (typeof LedgerAccount)[keyof typeof LedgerAccount];

export const LedgerDirection = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
} as const;
export type LedgerDirection = (typeof LedgerDirection)[keyof typeof LedgerDirection];

export interface LedgerEntry {
  id: Id;
  type: LedgerEntryType;
  account: LedgerAccount;
  direction: LedgerDirection;
  /** Always positive; `direction` carries the sign. */
  amount: Paise;
  /** Owner of the account this row touches, when the account is per-party. */
  subjectId?: Id;
  bookingId?: Id;
  cooperativeId?: Id;
  description?: string;
  /** Idempotency key so a retried settlement cannot double-post. */
  referenceKey?: string;
  /**
   * Payment-processor trace, the handle support quotes when investigating a
   * delayed payout. Stripe-shaped (`tr_…`) because that is what the reader will
   * be comparing against in the processor's own dashboard.
   */
  traceId?: string;
  /**
   * Set when this row exists to reverse an earlier one, and holds that row's id.
   *
   * THE LEDGER IS APPEND-ONLY. A mistake is corrected by appending a new
   * compensating entry that points back here — never by editing or deleting the
   * original, which stays byte-identical forever. There is no edit action and no
   * delete action on a ledger row anywhere in the product: not disabled, not
   * permission-gated, simply absent. The immutability is the feature.
   */
  reversalOf?: Id;
  /**
   * Set on a PAYOUT_RELEASE row, and holds the id of the WORKER_PAYOUT it sends to
   * the bank. The same append-only pattern as `reversalOf`: the payout row is never
   * changed to say it was released; a new row points back at it.
   */
  releaseOf?: Id;
  createdAt: IsoDateTime;
}

/** Human-facing name of the party an entry touches. */
export interface LedgerParty {
  account: LedgerAccount;
  /** Set when the account is per-party, e.g. a worker's name. */
  name?: string;
}

/**
 * The three-way split of a period's gross, derived from the ledger.
 *
 * The three parts sum to `gross` exactly, to the paisa. Shares come from
 * WORKER_SHARE / PLATFORM_SHARE / COOP_FUND_SHARE in constants.ts and are never
 * written as literals — so a change to the split is a one-line change, and the
 * portal cannot drift from what the mobile apps tell workers.
 */
export interface SplitSummary {
  gross: Paise;
  worker: Paise;
  platform: Paise;
  coopFund: Paise;
  bookingCount: number;
}
