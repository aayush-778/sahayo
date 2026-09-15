import {
  BookingStatus,
  CustomerSegment,
  CustomerStatus,
  DisputeStatus,
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  type AdminBooking,
  type AdminCustomer,
  type CustomerSummary,
  type CustomerType,
  type Dispute,
  type Paise,
} from '@sahayo/shared';
import { CURRENT_ADMIN } from '@/lib/nav/session';
import { DAY_MS, SEED_NOW, isCompletedBooking } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { compareIso } from '@/lib/dates';
import { respond } from './latency';

/** Booked for the first time within this many days: NEW. */
export const NEW_CUSTOMER_DAYS = 30;
/** No booking for this many days: LAPSED. */
export const LAPSED_AFTER_DAYS = 45;
/** This many bookings in the 90-day window or more: REGULAR. */
export const REGULAR_MIN_BOOKINGS = 8;

const CANCELLED: ReadonlySet<string> = new Set([
  BookingStatus.CANCELLED_BY_CUSTOMER,
  BookingStatus.CANCELLED_BY_WORKER,
  BookingStatus.EXPIRED_NO_ACCEPT,
]);

interface Tally {
  bookingCount: number;
  completedCount: number;
  cancelledCount: number;
  totalSpend: Paise;
  refunded: Paise;
  firstBookingAt?: string;
  lastBookingAt?: string;
  categories: Map<string, number>;
  disputeCount: number;
  openDisputeCount: number;
}

function emptyTally(): Tally {
  return {
    bookingCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    totalSpend: 0,
    refunded: 0,
    categories: new Map(),
    disputeCount: 0,
    openDisputeCount: 0,
  };
}

/**
 * Every customer's figures, from the bookings, disputes and refund rows in one pass each.
 *
 * Nothing here is stored on the customer. A booking, a resolved dispute or a refund
 * anywhere in the portal changes these figures on the next read, which is what keeps a
 * customer's profile in step with the dispute queue and the ledger.
 */
function tallies(): Map<string, Tally> {
  const { bookings, disputes, ledger } = adminState();
  const byCustomer = new Map<string, Tally>();
  const tallyFor = (id: string): Tally => {
    let tally = byCustomer.get(id);
    if (!tally) {
      tally = emptyTally();
      byCustomer.set(id, tally);
    }
    return tally;
  };

  for (const booking of bookings) {
    const tally = tallyFor(booking.customerId);
    tally.bookingCount += 1;
    if (isCompletedBooking(booking)) {
      tally.completedCount += 1;
      tally.totalSpend += booking.amount;
    } else if (CANCELLED.has(booking.status)) {
      tally.cancelledCount += 1;
    }
    if (!tally.firstBookingAt || booking.createdAt < tally.firstBookingAt) tally.firstBookingAt = booking.createdAt;
    if (!tally.lastBookingAt || booking.createdAt > tally.lastBookingAt) tally.lastBookingAt = booking.createdAt;
    tally.categories.set(booking.category, (tally.categories.get(booking.category) ?? 0) + 1);
  }

  for (const dispute of disputes) {
    const tally = tallyFor(dispute.customerId);
    tally.disputeCount += 1;
    if (dispute.status !== DisputeStatus.RESOLVED) tally.openDisputeCount += 1;
  }

  for (const entry of ledger) {
    if (
      entry.type === LedgerEntryType.REFUND &&
      entry.account === LedgerAccount.CUSTOMER &&
      entry.direction === LedgerDirection.CREDIT &&
      entry.subjectId
    ) {
      tallyFor(entry.subjectId).refunded += entry.amount;
    }
  }

  return byCustomer;
}

function daysSince(iso: string | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (SEED_NOW.getTime() - Date.parse(iso)) / DAY_MS;
}

function segmentOf(tally: Tally): CustomerSegment {
  if (daysSince(tally.firstBookingAt) <= NEW_CUSTOMER_DAYS) return CustomerSegment.NEW;
  if (daysSince(tally.lastBookingAt) > LAPSED_AFTER_DAYS) return CustomerSegment.LAPSED;
  if (tally.bookingCount >= REGULAR_MIN_BOOKINGS) return CustomerSegment.REGULAR;
  return CustomerSegment.OCCASIONAL;
}

function summarise(customer: AdminCustomer, tally: Tally = emptyTally()): CustomerSummary {
  const favourite = [...tally.categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    ...customer,
    segment: segmentOf(tally),
    bookingCount: tally.bookingCount,
    completedCount: tally.completedCount,
    cancelledCount: tally.cancelledCount,
    totalSpend: tally.totalSpend,
    refunded: tally.refunded,
    ...(tally.firstBookingAt ? { firstBookingAt: tally.firstBookingAt } : {}),
    ...(tally.lastBookingAt ? { lastBookingAt: tally.lastBookingAt } : {}),
    ...(favourite ? { favouriteCategory: favourite } : {}),
    disputeCount: tally.disputeCount,
    openDisputeCount: tally.openDisputeCount,
  };
}

export interface CustomerFilter {
  /** Matches name, business name, phone or email. */
  search?: string;
  zoneId?: string;
  segment?: CustomerSegment;
  type?: CustomerType;
  status?: CustomerStatus;
}

/** The customer directory, most recently active first. */
export async function listCustomers(filter: CustomerFilter = {}): Promise<CustomerSummary[]> {
  const byCustomer = tallies();
  const needle = filter.search?.trim().toLowerCase();
  const digits = needle?.replace(/\D/g, '');

  const rows = adminState()
    .customers.map((customer) => summarise(customer, byCustomer.get(customer.id)))
    .filter((customer) => {
      if (filter.zoneId && customer.zoneId !== filter.zoneId) return false;
      if (filter.segment && customer.segment !== filter.segment) return false;
      if (filter.type && customer.type !== filter.type) return false;
      if (filter.status && customer.status !== filter.status) return false;
      if (needle) {
        const text = `${customer.name} ${customer.businessName ?? ''} ${customer.email ?? ''}`.toLowerCase();
        const phoneMatch = digits && digits.length >= 3 && customer.phone.replace(/\D/g, '').includes(digits);
        if (!text.includes(needle) && !phoneMatch) return false;
      }
      return true;
    })
    .sort((a, b) => compareIso(b.lastBookingAt ?? '', a.lastBookingAt ?? ''));

  return respond(rows);
}

export interface CustomerOverview {
  total: number;
  /** Customers who booked in the last 30 days. */
  activeLast30: number;
  /** Share of customers with more than one booking. */
  repeatShare: number;
  newLast30: number;
  lapsed: number;
  regulars: number;
  suspended: number;
  businesses: number;
  /** Average completed spend across customers who completed at least one job. */
  averageSpend: Paise;
}

/** The figures above the directory. */
export async function getCustomerOverview(): Promise<CustomerOverview> {
  const byCustomer = tallies();
  const summaries = adminState().customers.map((customer) => summarise(customer, byCustomer.get(customer.id)));
  const spenders = summaries.filter((customer) => customer.completedCount > 0);

  return respond({
    total: summaries.length,
    activeLast30: summaries.filter((customer) => daysSince(customer.lastBookingAt) <= 30).length,
    repeatShare: summaries.length
      ? summaries.filter((customer) => customer.bookingCount > 1).length / summaries.length
      : 0,
    newLast30: summaries.filter((customer) => customer.segment === CustomerSegment.NEW).length,
    lapsed: summaries.filter((customer) => customer.segment === CustomerSegment.LAPSED).length,
    regulars: summaries.filter((customer) => customer.segment === CustomerSegment.REGULAR).length,
    suspended: summaries.filter((customer) => customer.status === CustomerStatus.SUSPENDED).length,
    businesses: summaries.filter((customer) => customer.type === 'BUSINESS').length,
    averageSpend: spenders.length
      ? Math.round(spenders.reduce((sum, customer) => sum + customer.totalSpend, 0) / spenders.length)
      : 0,
  });
}

export interface CategorySpend {
  category: string;
  bookings: number;
  spend: Paise;
}

export interface CustomerProfile {
  customer: CustomerSummary;
  /** Every booking in the 90-day window, newest first. */
  bookings: AdminBooking[];
  disputes: Dispute[];
  spendByCategory: CategorySpend[];
  /** Bookings per week for the last 13 weeks, oldest first. */
  weeklyBookings: number[];
}

/** One customer's full record. Undefined when no customer has that id. */
export async function getCustomerProfile(customerId: string): Promise<CustomerProfile | undefined> {
  const state = adminState();
  const customer = state.customers.find((candidate) => candidate.id === customerId);
  if (!customer) return respond(undefined);

  const bookings = state.bookings
    .filter((booking) => booking.customerId === customerId)
    .sort((a, b) => compareIso(b.createdAt, a.createdAt));
  const disputes = state.disputes
    .filter((dispute) => dispute.customerId === customerId)
    .sort((a, b) => compareIso(b.createdAt, a.createdAt));

  const categories = new Map<string, CategorySpend>();
  for (const booking of bookings) {
    const row = categories.get(booking.category) ?? { category: booking.category, bookings: 0, spend: 0 };
    row.bookings += 1;
    if (isCompletedBooking(booking)) row.spend += booking.amount;
    categories.set(booking.category, row);
  }

  const weeklyBookings = Array.from({ length: 13 }, () => 0);
  for (const booking of bookings) {
    const weeksAgo = Math.floor(daysSince(booking.createdAt) / 7);
    if (weeksAgo >= 0 && weeksAgo < 13) weeklyBookings[12 - weeksAgo] = (weeklyBookings[12 - weeksAgo] ?? 0) + 1;
  }

  return respond({
    customer: summarise(customer, tallies().get(customerId)),
    bookings,
    disputes,
    spendByCategory: [...categories.values()].sort((a, b) => b.spend - a.spend || b.bookings - a.bookings),
    weeklyBookings,
  });
}

/**
 * Stops a customer booking new jobs. The reason is required: it is shown on their
 * profile, carried in the CRCS audit log, and is what support reads to the customer.
 */
export async function suspendCustomer(customerId: string, reason: string): Promise<AdminCustomer> {
  const state = adminState();
  const customer = state.customers.find((candidate) => candidate.id === customerId);
  if (!customer) throw new Error('This customer no longer exists. Go back to the directory and search again.');
  const trimmed = reason.trim();
  if (trimmed.length < 10) {
    throw new Error('Write a reason of at least a sentence. It is shown to support and kept in the audit log.');
  }
  if (customer.status === CustomerStatus.SUSPENDED) return respond(customer);

  state.updateCustomer(customerId, {
    status: CustomerStatus.SUSPENDED,
    suspension: {
      reason: trimmed,
      suspendedAt: SEED_NOW.toISOString(),
      adminId: CURRENT_ADMIN.id,
      adminName: CURRENT_ADMIN.name,
    },
  });
  return respond(adminState().customers.find((candidate) => candidate.id === customerId) as AdminCustomer);
}

/** Lets a suspended customer book again. */
export async function reinstateCustomer(customerId: string): Promise<AdminCustomer> {
  const state = adminState();
  const customer = state.customers.find((candidate) => candidate.id === customerId);
  if (!customer) throw new Error('This customer no longer exists. Go back to the directory and search again.');
  if (customer.status === CustomerStatus.ACTIVE) return respond(customer);

  state.updateCustomer(customerId, { status: CustomerStatus.ACTIVE, suspension: undefined });
  return respond(adminState().customers.find((candidate) => candidate.id === customerId) as AdminCustomer);
}
