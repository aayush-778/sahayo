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
  createdAt: IsoDateTime;
}
