import { workerCategoryLabel } from '@sahayo/shared';
import { NAV_ITEMS } from '@/lib/nav/routes';
import { adminState } from '@/lib/store';
import { respond } from './latency';

export type SearchGroupKind = 'PAGE' | 'WORKER' | 'CUSTOMER' | 'BOOKING' | 'DISPUTE';

export interface SearchResult {
  id: string;
  title: string;
  detail: string;
  href: string;
}

export interface SearchGroup {
  kind: SearchGroupKind;
  label: string;
  results: SearchResult[];
  /** How many matched in total, which may be more than are listed. */
  total: number;
}

/** Shortest query that searches. One character matches half the portal. */
export const SEARCH_MIN_LENGTH = 2;

const PER_GROUP = 5;

/**
 * Places inside pages that people look for by name rather than by the page they sit on.
 */
const DESTINATIONS: ReadonlyArray<SearchResult & { keywords: string }> = [
  { id: 'dest-split', title: 'Revenue split', detail: 'Settings › Payments', href: '/settings?tab=payments', keywords: 'split share worker platform fee percent payments' },
  { id: 'dest-dispatch-rules', title: 'Dispatch rules', detail: 'Settings › Dispatch', href: '/settings?tab=dispatch', keywords: 'radius weights equity ranking timeout' },
  { id: 'dest-crcs', title: 'CRCS returns export', detail: 'Settings › Compliance', href: '/settings?tab=compliance', keywords: 'crcs registrar annual return export audit compliance ombudsman' },
  { id: 'dest-team', title: 'Team and reset demo data', detail: 'Settings › Team', href: '/settings?tab=team', keywords: 'team roles members reset demo' },
  { id: 'dest-aadhaar-log', title: 'Aadhaar access log', detail: 'Verification › Access log', href: '/verification?tab=log', keywords: 'aadhaar access log reveal uidai' },
  { id: 'dest-account', title: 'Your account and notification preferences', detail: 'Account', href: '/account', keywords: 'account profile preferences notifications' },
];

/**
 * Searches the whole portal: pages, workers, customers, bookings and disputes.
 *
 * Matches on the words an administrator actually has in hand — a name, the last digits
 * of a phone number, a booking or dispute reference — and returns a few of each kind
 * with a link straight to the record. Nothing is indexed ahead of time; it reads the
 * same collections every page reads, so a result can never point at a stale record.
 */
export async function searchPortal(query: string): Promise<SearchGroup[]> {
  const needle = query.trim().toLowerCase();
  if (needle.length < SEARCH_MIN_LENGTH) return respond([]);
  const digits = needle.replace(/\D/g, '');
  /* Only a query that is all digits is a phone number; "bkg-0877" is a reference. */
  const looksLikePhone = /^[\d\s+]+$/.test(needle);
  const phoneMatch = (phone: string): boolean =>
    looksLikePhone && digits.length >= 4 && phone.replace(/\D/g, '').includes(digits);

  const { workers, customers, bookings, disputes, zones } = adminState();
  const zoneName = new Map(zones.map((zone) => [zone.id, zone.name]));
  const groups: SearchGroup[] = [];

  const add = (kind: SearchGroupKind, label: string, matches: SearchResult[]): void => {
    if (matches.length > 0) groups.push({ kind, label, results: matches.slice(0, PER_GROUP), total: matches.length });
  };

  add('PAGE', 'Pages', [
    ...NAV_ITEMS.filter((item) => `${item.label} ${item.subtitle}`.toLowerCase().includes(needle)).map((item) => ({
      id: `page-${item.href}`,
      title: item.label,
      detail: item.subtitle,
      href: item.href,
    })),
    ...DESTINATIONS.filter((dest) => `${dest.title} ${dest.keywords}`.toLowerCase().includes(needle)).map((dest) => ({
      id: dest.id,
      title: dest.title,
      detail: dest.detail,
      href: dest.href,
    })),
  ]);

  add(
    'WORKER',
    'Workers',
    workers
      .filter((worker) => worker.name.toLowerCase().includes(needle) || phoneMatch(worker.phone))
      .map((worker) => ({
        id: worker.id,
        title: worker.name,
        detail: `${workerCategoryLabel(worker.category)} in ${zoneName.get(worker.zoneId) ?? 'an unknown zone'} · ${worker.phone}`,
        href: `/workers/${worker.id}`,
      })),
  );

  add(
    'CUSTOMER',
    'Customers',
    customers
      .filter(
        (customer) =>
          `${customer.name} ${customer.businessName ?? ''} ${customer.email ?? ''}`.toLowerCase().includes(needle) ||
          phoneMatch(customer.phone),
      )
      .map((customer) => ({
        id: customer.id,
        title: customer.name,
        detail: `${customer.businessName ?? 'Household'} in ${zoneName.get(customer.zoneId) ?? 'an unknown zone'} · ${customer.phone}`,
        href: `/customers?id=${customer.id}`,
      })),
  );

  /* Bookings by reference only: matching by name would list a regular customer's whole history. */
  const referenceNeedle = /^\d+$/.test(needle) ? `bkg-${needle.padStart(5, '0')}` : needle;
  add(
    'BOOKING',
    'Bookings',
    bookings
      .filter((booking) => booking.reference.toLowerCase().includes(referenceNeedle) || booking.reference.toLowerCase() === needle)
      .map((booking) => ({
        id: booking.id,
        title: booking.reference,
        detail: `${booking.category} for ${booking.customerName}${booking.workerName ? `, done by ${booking.workerName}` : ''}`,
        href: `/bookings?booking=${booking.id}`,
      })),
  );

  add(
    'DISPUTE',
    'Disputes',
    disputes
      .filter((dispute) =>
        `${dispute.reference} ${dispute.subject} ${dispute.customerName} ${dispute.workerName}`.toLowerCase().includes(needle),
      )
      .map((dispute) => ({
        id: dispute.id,
        title: `${dispute.reference}: ${dispute.subject}`,
        detail: `${dispute.customerName} and ${dispute.workerName}`,
        href: `/disputes?id=${dispute.id}`,
      })),
  );

  return respond(groups);
}
