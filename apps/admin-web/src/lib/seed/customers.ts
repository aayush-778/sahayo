import {
  CustomerStatus,
  CustomerType,
  DisputeOrigin,
  type AdminBooking,
  type AdminCustomer,
  type Dispute,
} from '@sahayo/shared';
import { phoneNumber } from './names';
import { DAY_MS, SEED_NOW, SEEDS, createRng, isoAgo } from './rng';
import { zoneName } from './zones';

/** The oldest account on the platform, in days. Matches the earliest worker joining. */
const OLDEST_ACCOUNT_DAYS = 700;

/** Share of customers who book on behalf of a business rather than a household. */
const BUSINESS_SHARE = 0.1;

/** Share of customers who gave an email address as well as a phone number. */
const EMAIL_SHARE = 0.55;

const BUSINESS_KINDS = [
  'Sweets',
  'Guest House',
  'Clinic',
  'Coaching Centre',
  'General Store',
  'Tiffin Service',
  'Printing Press',
  'Dairy',
  'Hardware',
  'Boutique',
] as const;

/**
 * Accounts suspended outside the dispute queue, with the reason on record. The rest of
 * the seeded suspensions come from workers' own "refused to pay" tickets.
 */
const OTHER_SUSPENSIONS = [
  'Cancelled after the worker arrived four times in one month. Suspended until the customer confirms they will be home.',
  'Asked two workers to do unlisted electrical work off the platform for cash.',
] as const;

/**
 * The households and businesses that book work.
 *
 * Derived from the bookings rather than invented beside them: every customer here is
 * someone who appears on at least one booking, under the same id and name, so a
 * customer's profile and the jobs, disputes and refunds that mention them always agree.
 * Only the details a booking does not carry — phone, email, address, account age,
 * whether it is a business — are drawn here, from the seed's own stream.
 *
 * A few accounts start suspended, and for a reason the data already shows: customers
 * whose workers raised a "refused to pay" dispute against them.
 */
export function buildCustomers(bookings: AdminBooking[], disputes: Dispute[]): AdminCustomer[] {
  const rng = createRng(SEEDS.customers);

  /* First appearance order, so the list is stable, plus each customer's zone counts. */
  const seen = new Map<string, { name: string; first: string; zones: Map<string, number> }>();
  for (const booking of bookings) {
    let entry = seen.get(booking.customerId);
    if (!entry) {
      entry = { name: booking.customerName, first: booking.createdAt, zones: new Map() };
      seen.set(booking.customerId, entry);
    }
    if (booking.createdAt < entry.first) entry.first = booking.createdAt;
    entry.zones.set(booking.zoneId, (entry.zones.get(booking.zoneId) ?? 0) + 1);
  }

  const refusedToPay = new Map<string, Dispute>();
  for (const dispute of disputes) {
    if (dispute.raisedBy === DisputeOrigin.WORKER && /refused to pay/i.test(dispute.subject)) {
      refusedToPay.set(dispute.customerId, dispute);
    }
  }

  const customers: AdminCustomer[] = [];
  for (const [id, entry] of seen) {
    /* The zone they book in most; ties go to the zone they booked in first. */
    const zoneId = [...entry.zones.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as string;
    const isBusiness = rng.chance(BUSINESS_SHARE);
    const [given = 'customer', surname = ''] = entry.name.split(' ');

    /* An account opens on or before its first booking, and never before the platform. */
    const oldest = SEED_NOW.getTime() - OLDEST_ACCOUNT_DAYS * DAY_MS;
    const joinedAt = new Date(
      Math.max(oldest, Date.parse(entry.first) - rng.int(0, 420) * DAY_MS - rng.int(10, 600) * 60_000),
    ).toISOString();

    const locality = zoneName(zoneId);
    const address = isBusiness
      ? `Shop ${rng.int(1, 60)}, Main Road, ${locality}`
      : `House ${rng.int(1, 480)}, Road No. ${rng.int(1, 14)}, ${locality}`;

    customers.push({
      id,
      name: entry.name,
      phone: phoneNumber(rng),
      ...(rng.chance(EMAIL_SHARE)
        ? { email: `${given}.${surname}${rng.int(1, 99)}@example.in`.toLowerCase() }
        : {}),
      type: isBusiness ? CustomerType.BUSINESS : CustomerType.HOUSEHOLD,
      ...(isBusiness ? { businessName: `${surname} ${rng.pick(BUSINESS_KINDS)}` } : {}),
      zoneId,
      address,
      joinedAt,
      status: CustomerStatus.ACTIVE,
    });
  }

  /* Suspensions: every refused-to-pay customer, and a couple of others. */
  for (const customer of customers) {
    const dispute = refusedToPay.get(customer.id);
    if (!dispute) continue;
    customer.status = CustomerStatus.SUSPENDED;
    customer.suspension = {
      reason: `${dispute.workerName} reported that the customer would not pay for ${dispute.reference}. Suspended while the dispute is settled.`,
      suspendedAt: dispute.createdAt,
      adminId: 'admin-anjali-verma',
      adminName: 'Anjali Verma',
    };
  }
  const others = rng.sample(
    customers.filter((customer) => customer.status === CustomerStatus.ACTIVE),
    OTHER_SUSPENSIONS.length,
  );
  others.forEach((customer, index) => {
    customer.status = CustomerStatus.SUSPENDED;
    customer.suspension = {
      reason: OTHER_SUSPENSIONS[index] as string,
      suspendedAt: isoAgo(rng.int(3, 20)),
      adminId: 'admin-anjali-verma',
      adminName: 'Anjali Verma',
    };
  });

  return customers;
}
