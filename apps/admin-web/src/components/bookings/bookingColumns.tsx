'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import type { AdminBooking } from '@sahayo/shared';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { rupees } from '@/lib/format';
import { bookingStatusPill } from './booking-status';

/** "12 Sept, 4:05 pm" — the day and time a job was asked for. */
export function bookingStamp(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function buildBookingColumns({
  zoneName,
  disputedIds,
}: {
  zoneName: (zoneId: string) => string;
  disputedIds: ReadonlySet<string>;
}): ColumnDef<AdminBooking>[] {
  /* Links inside a clickable row stop the click, so they go where they say rather than to the booking. */
  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return [
    {
      id: 'reference',
      accessorFn: (booking) => booking.reference,
      header: 'Booking',
      cell: ({ row }) => (
        <span className="flex flex-col">
          <Link href={`/bookings?booking=${row.original.id}`} className="tabular font-medium text-ink hover:underline">
            {row.original.reference}
          </Link>
          <span className="text-pill text-muted">{bookingStamp(row.original.createdAt)}</span>
        </span>
      ),
    },
    {
      id: 'customer',
      accessorFn: (booking) => booking.customerName,
      header: 'Customer',
      cell: ({ row }) => (
        <Link href={`/customers?id=${row.original.customerId}`} onClick={stop} className="text-ink hover:underline">
          {row.original.customerName}
        </Link>
      ),
    },
    {
      id: 'worker',
      accessorFn: (booking) => booking.workerName ?? '',
      header: 'Worker',
      cell: ({ row }) =>
        row.original.workerId ? (
          <Link href={`/workers/${row.original.workerId}`} onClick={stop} className="text-ink hover:underline">
            {row.original.workerName}
          </Link>
        ) : (
          <span className="text-muted">Not assigned</span>
        ),
    },
    {
      id: 'category',
      accessorFn: (booking) => booking.category,
      header: 'Trade',
      cell: ({ getValue }) => <span className="text-ink">{getValue<string>()}</span>,
    },
    {
      id: 'zone',
      accessorFn: (booking) => zoneName(booking.zoneId),
      header: 'Zone',
      cell: ({ getValue }) => <span className="text-muted">{getValue<string>()}</span>,
    },
    {
      id: 'amount',
      accessorFn: (booking) => booking.amount,
      header: 'Amount',
      cell: ({ row }) => <span className="tabular text-ink">{rupees(row.original.amount)}</span>,
    },
    {
      id: 'status',
      accessorFn: (booking) => booking.status,
      header: 'Status',
      cell: ({ row }) => {
        const pill = bookingStatusPill(row.original.status);
        return (
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={pill.status} label={pill.label} />
            {disputedIds.has(row.original.id) ? <StatusPill status="rejected" label="Disputed" /> : null}
          </span>
        );
      },
    },
  ];
}
