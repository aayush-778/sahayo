import type { Id, IsoDateTime, Paise } from './common';

export const CustomerType = {
  HOUSEHOLD: 'HOUSEHOLD',
  BUSINESS: 'BUSINESS',
} as const;
export type CustomerType = (typeof CustomerType)[keyof typeof CustomerType];

export const CustomerStatus = {
  ACTIVE: 'ACTIVE',
  /** May not book new jobs. Jobs already in progress are unaffected. */
  SUSPENDED: 'SUSPENDED',
} as const;
export type CustomerStatus = (typeof CustomerStatus)[keyof typeof CustomerStatus];

/**
 * How a customer has been booking lately, derived from their bookings, never stored.
 *
 * NEW booked for the first time in the last 30 days; REGULAR booked eight or more times in
 * the 90-day window; LAPSED has not booked for 45 days; OCCASIONAL is everyone else.
 */
export const CustomerSegment = {
  NEW: 'NEW',
  REGULAR: 'REGULAR',
  OCCASIONAL: 'OCCASIONAL',
  LAPSED: 'LAPSED',
} as const;
export type CustomerSegment = (typeof CustomerSegment)[keyof typeof CustomerSegment];

export interface CustomerSuspension {
  reason: string;
  suspendedAt: IsoDateTime;
  adminId: Id;
  adminName: string;
}

/** A household or business that books work, as the admin portal stores it. */
export interface AdminCustomer {
  id: Id;
  /** The person who books. For a business, its contact. */
  name: string;
  phone: string;
  email?: string;
  type: CustomerType;
  /** Set only for BUSINESS customers. */
  businessName?: string;
  /** The zone they book in most often. */
  zoneId: Id;
  /** A locality line, e.g. "Road No. 4, Rajendra Nagar". */
  address: string;
  joinedAt: IsoDateTime;
  status: CustomerStatus;
  suspension?: CustomerSuspension;
}

/** A customer with the figures derived from their bookings, disputes and refunds. */
export interface CustomerSummary extends AdminCustomer {
  segment: CustomerSegment;
  bookingCount: number;
  completedCount: number;
  cancelledCount: number;
  /** What they paid for completed jobs. */
  totalSpend: Paise;
  /** Refunds they received from resolved disputes. */
  refunded: Paise;
  firstBookingAt?: IsoDateTime;
  lastBookingAt?: IsoDateTime;
  /** The trade they book most, e.g. "Plumber". */
  favouriteCategory?: string;
  disputeCount: number;
  openDisputeCount: number;
}
