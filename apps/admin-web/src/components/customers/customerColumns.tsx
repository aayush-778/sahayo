'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Building2 } from 'lucide-react';
import Link from 'next/link';
import type { CustomerSummary } from '@sahayo/shared';
import { Avatar } from '@/components/ui-kit/Avatar';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { SEED_NOW } from '@/lib/dates';
import { count, relativeTime, rupees } from '@/lib/format';
import { SEGMENT_COPY } from './customer-copy';

export function buildCustomerColumns({
  zoneName,
}: {
  zoneName: (zoneId: string) => string;
}): ColumnDef<CustomerSummary>[] {
  return [
    {
      id: 'name',
      accessorFn: (customer) => customer.name,
      header: 'Customer',
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar name={customer.name} size={32} />
            <div className="min-w-0">
              <Link
                href={`/customers?id=${customer.id}`}
                className="block truncate font-medium text-ink hover:underline"
              >
                {customer.name}
              </Link>
              <span className="flex items-center gap-1 truncate text-pill text-muted">
                {customer.businessName ? (
                  <>
                    <Building2 size={12} strokeWidth={1.5} aria-hidden />
                    {customer.businessName}
                  </>
                ) : (
                  <span className="tabular">{customer.phone}</span>
                )}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'zone',
      accessorFn: (customer) => zoneName(customer.zoneId),
      header: 'Zone',
      cell: ({ getValue }) => <span className="text-ink">{getValue<string>()}</span>,
    },
    {
      id: 'segment',
      accessorFn: (customer) => customer.segment,
      header: 'Pattern',
      cell: ({ row }) => {
        const copy = SEGMENT_COPY[row.original.segment];
        return (
          <span title={copy.meaning}>
            <StatusPill status={copy.pill} label={copy.label} />
          </span>
        );
      },
    },
    {
      id: 'bookingCount',
      accessorFn: (customer) => customer.bookingCount,
      header: 'Bookings',
      cell: ({ row }) => (
        <span className="tabular text-ink">
          {count(row.original.bookingCount)}
          {row.original.cancelledCount > 0 ? (
            <span className="ml-1.5 text-pill text-muted">{count(row.original.cancelledCount)} cancelled</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'totalSpend',
      accessorFn: (customer) => customer.totalSpend,
      header: 'Spent',
      cell: ({ row }) => <span className="tabular text-ink">{rupees(row.original.totalSpend)}</span>,
    },
    {
      id: 'lastBookingAt',
      accessorFn: (customer) => customer.lastBookingAt ?? '',
      header: 'Last booked',
      cell: ({ row }) => (
        <span className="text-muted">
          {row.original.lastBookingAt ? relativeTime(row.original.lastBookingAt, SEED_NOW) : 'Never'}
        </span>
      ),
    },
    {
      id: 'account',
      accessorFn: (customer) => `${customer.status}-${customer.openDisputeCount}`,
      header: 'Account',
      enableSorting: false,
      cell: ({ row }) => {
        const customer = row.original;
        if (customer.status === 'SUSPENDED') return <StatusPill status="rejected" label="Suspended" />;
        if (customer.openDisputeCount > 0) {
          return (
            <StatusPill
              status="pending"
              label={`${customer.openDisputeCount} open ${customer.openDisputeCount === 1 ? 'dispute' : 'disputes'}`}
            />
          );
        }
        return <span className="text-pill text-muted">Can book</span>;
      },
    },
  ];
}
