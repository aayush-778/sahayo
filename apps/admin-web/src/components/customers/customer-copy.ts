import { CustomerSegment, CustomerStatus, CustomerType } from '@sahayo/shared';
import type { StatusVariant } from '@/components/ui-kit/StatusPill';
import { LAPSED_AFTER_DAYS, NEW_CUSTOMER_DAYS, REGULAR_MIN_BOOKINGS } from '@/lib/services';

/** How each segment reads, as a pill and as a sentence. */
export const SEGMENT_COPY: Record<CustomerSegment, { pill: StatusVariant; label: string; meaning: string }> = {
  [CustomerSegment.NEW]: {
    pill: 'active',
    label: 'New',
    meaning: `First booked in the last ${NEW_CUSTOMER_DAYS} days`,
  },
  [CustomerSegment.REGULAR]: {
    pill: 'resolved',
    label: 'Regular',
    meaning: `${REGULAR_MIN_BOOKINGS} or more bookings in 90 days`,
  },
  [CustomerSegment.OCCASIONAL]: {
    pill: 'offline',
    label: 'Occasional',
    meaning: 'Books now and then',
  },
  [CustomerSegment.LAPSED]: {
    pill: 'pending',
    label: 'Lapsed',
    meaning: `No booking for ${LAPSED_AFTER_DAYS} days`,
  },
};

export const SEGMENT_OPTIONS = [
  CustomerSegment.REGULAR,
  CustomerSegment.OCCASIONAL,
  CustomerSegment.NEW,
  CustomerSegment.LAPSED,
].map((value) => ({ value, label: SEGMENT_COPY[value].label }));

export const TYPE_OPTIONS = [
  { value: CustomerType.HOUSEHOLD, label: 'Households' },
  { value: CustomerType.BUSINESS, label: 'Businesses' },
];

export const STATUS_OPTIONS = [
  { value: CustomerStatus.ACTIVE, label: 'Can book' },
  { value: CustomerStatus.SUSPENDED, label: 'Suspended' },
];
