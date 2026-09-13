import Link from 'next/link';
import { BookingStatus, type AdminBooking } from '@sahayo/shared';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatusPill, type StatusVariant } from '@/components/ui-kit/StatusPill';
import { rupees } from '@/lib/format';
import { LinkButton } from '@/components/ui-kit/LinkButton';

/**
 * Booking lifecycle states mapped onto the six pill variants.
 *
 * The pill set is deliberately small, so several booking states share one. The
 * label keeps the distinction the colour loses — "Cancelled" and "Expired" both
 * read as rejected, but they say which they are.
 */
const STATUS_PILL: Record<string, { status: StatusVariant; label: string }> = {
  [BookingStatus.REQUESTED]: { status: 'pending', label: 'Requested' },
  [BookingStatus.BROADCAST]: { status: 'pending', label: 'Offered out' },
  [BookingStatus.ACCEPTED]: { status: 'active', label: 'Accepted' },
  [BookingStatus.EN_ROUTE]: { status: 'active', label: 'On the way' },
  [BookingStatus.ARRIVED]: { status: 'active', label: 'Arrived' },
  [BookingStatus.IN_PROGRESS]: { status: 'active', label: 'In progress' },
  [BookingStatus.COMPLETED]: { status: 'resolved', label: 'Finished' },
  [BookingStatus.SETTLED]: { status: 'resolved', label: 'Paid' },
  [BookingStatus.CANCELLED_BY_CUSTOMER]: { status: 'rejected', label: 'Customer cancelled' },
  [BookingStatus.CANCELLED_BY_WORKER]: { status: 'rejected', label: 'Worker cancelled' },
  [BookingStatus.EXPIRED_NO_ACCEPT]: { status: 'rejected', label: 'Nobody accepted' },
  [BookingStatus.DISPUTED]: { status: 'rejected', label: 'Disputed' },
};

/** Recent jobs, each linking to the timeline the dispute queue also reads. */
export function BookingsTab({ bookings }: { bookings?: AdminBooking[] }) {
  return (
    <Card className="p-0">
      <div className="p-6 pb-4">
        <SectionHeader
          title="Recent jobs"
          subtitle="Newest first. Job records cover the last 90 days, so this is shorter than the lifetime count beside it."
        />
      </div>

      {!bookings ? (
        <div className="px-6 pb-6">
          <Skeleton lines={6} />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          className="px-6 pb-6"
          title="This worker has not taken a job yet"
          description="Jobs appear here as soon as dispatch offers one and they accept it."
          action={<LinkButton href="/dispatch">Open live dispatch</LinkButton>}
        />
      ) : (
        <ul className="flex flex-col border-t border-hairline">
          {bookings.map((booking) => {
            const pill = STATUS_PILL[booking.status] ?? {
              status: 'pending' as StatusVariant,
              label: booking.status,
            };
            return (
              <li
                key={booking.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-hairline px-5 py-3.5 last:border-b-0"
              >
                <Link
                  href={`/bookings?booking=${booking.id}`}
                  className="tabular text-table font-medium text-ink hover:underline"
                >
                  {booking.reference}
                </Link>
                <span className="text-table text-muted">{booking.category}</span>
                <span className="text-pill text-muted">{booking.customerName}</span>
                <StatusPill status={pill.status} label={pill.label} className="ml-auto" />
                <span className="tabular w-20 text-right text-table text-ink">
                  {rupees(booking.amount)}
                </span>
                <span className="w-20 text-right text-pill text-muted">
                  {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
