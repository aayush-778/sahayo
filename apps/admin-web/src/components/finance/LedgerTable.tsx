'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Copy, MoreVertical, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { LedgerAccount, LedgerEntryType } from '@sahayo/shared';
import { Card } from '@/components/ui-kit/Card';
import { DataTable } from '@/components/ui-kit/DataTable';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { Select } from '@/components/ui-kit/Select';
import { StatusPill, type StatusVariant } from '@/components/ui-kit/StatusPill';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { rupees } from '@/lib/format';
import type { LedgerRow, Period } from '@/lib/services';
import { Button } from '@/components/ui-kit/Button';

/** What each kind of movement is called, and the pill it wears. */
export const ENTRY_TYPE: Record<string, { label: string; pill: StatusVariant }> = {
  [LedgerEntryType.WORKER_PAYOUT]: { label: 'Worker payout', pill: 'pending' },
  [LedgerEntryType.PLATFORM_FEE]: { label: 'Platform fee', pill: 'offline' },
  [LedgerEntryType.COOP_FUND_CONTRIBUTION]: { label: 'Fund share', pill: 'verified' },
  [LedgerEntryType.COOP_FUND_DISBURSEMENT]: { label: 'Fund spending', pill: 'resolved' },
  [LedgerEntryType.REFUND]: { label: 'Refund', pill: 'rejected' },
  [LedgerEntryType.ADJUSTMENT]: { label: 'Reversal', pill: 'rejected' },
  [LedgerEntryType.PAYOUT_RELEASE]: { label: 'Sent to bank', pill: 'active' },
  [LedgerEntryType.BOOKING_CHARGE]: { label: 'Customer charge', pill: 'offline' },
};

const PARTY_OPTIONS = [
  { value: LedgerAccount.WORKER, label: 'Workers' },
  { value: LedgerAccount.PLATFORM, label: 'Platform' },
  { value: LedgerAccount.COOP_FUND, label: 'Cooperative fund' },
  { value: LedgerAccount.CUSTOMER, label: 'Customers' },
];

const PERIOD_OPTIONS = [
  { value: '7D', label: 'Last 7 days' },
  { value: '30D', label: 'Last 30 days' },
  { value: '90D', label: 'Last 90 days' },
];

/** The first eight characters of an id, prefixed with #, as the table shows it. */
export function shortId(id: string): string {
  return `#${id.replace(/^(rev|rel)_/, '').slice(0, 8)}`;
}

/** Statuses that make "Issue reversal" meaningless, with the reason why. */
const NOT_REVERSIBLE: Partial<Record<LedgerRow['status'], string>> = {
  REVERSED: 'Already reversed',
  REVERSAL: 'This is a reversal',
  RELEASED: 'Already sent to the bank',
  RELEASE: 'A bank transfer record',
};

export interface LedgerFilters {
  search: string;
  type: string;
  party: string;
  period: string;
}

export interface LedgerTableProps {
  rows?: LedgerRow[];
  filters: LedgerFilters;
  onFiltersChange: (next: LedgerFilters) => void;
  onReverse: (row: LedgerRow) => void;
  onCopyTrace: (traceId: string) => void;
}

/**
 * The ledger, as a table that can only be read and appended to.
 *
 * There is no action here that alters or erases a row — not a disabled one, not
 * one hidden behind a permission. The row menu offers exactly three things: view the
 * booking, copy the trace ID, and issue a reversal, which adds a new row. That
 * absence is the feature, and the line above the table says so to anyone reading.
 */
export function LedgerTable({
  rows,
  filters,
  onFiltersChange,
  onReverse,
  onCopyTrace,
}: LedgerTableProps) {
  const set = <K extends keyof LedgerFilters>(key: K, value: LedgerFilters[K]): void =>
    onFiltersChange({ ...filters, [key]: value });

  /** Clicking a linked id narrows the table to that one entry. */
  const jumpTo = (id: string): void => onFiltersChange({ ...filters, search: id, type: '', party: '', period: '' });

  const columns = useMemo<ColumnDef<LedgerRow>[]>(
    () => [
      {
        id: 'createdAt',
        accessorFn: (row) => row.entry.createdAt,
        header: 'When',
        cell: ({ row }) => (
          <span className="tabular whitespace-nowrap text-muted">
            {new Date(row.original.entry.createdAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        id: 'entryId',
        accessorFn: (row) => row.entry.id,
        header: 'Entry',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-pill text-ink" title={row.original.entry.id}>
            {shortId(row.original.entry.id)}
          </span>
        ),
      },
      {
        id: 'booking',
        accessorFn: (row) => row.bookingReference ?? '',
        header: 'Booking',
        cell: ({ row }) =>
          row.original.bookingReference ? (
            <span className="tabular text-ink">{row.original.bookingReference}</span>
          ) : (
            <span className="text-muted">No booking</span>
          ),
      },
      {
        id: 'type',
        accessorFn: (row) => row.entry.type,
        header: 'Type',
        cell: ({ row }) => {
          const type = ENTRY_TYPE[row.original.entry.type] ?? {
            label: row.original.entry.type,
            pill: 'offline' as StatusVariant,
          };
          return <StatusPill status={type.pill} label={type.label} />;
        },
      },
      {
        id: 'party',
        accessorFn: (row) => row.partyName,
        header: 'Party',
        cell: ({ row }) => <span className="text-ink">{row.original.partyName}</span>,
      },
      {
        id: 'amount',
        accessorFn: (row) => row.sign * row.entry.amount,
        header: 'Amount',
        cell: ({ row }) => (
          /*
           * The sign carries the direction and is coloured; the digits stay ink so
           * they remain legible. Colour is never the only signal — the +/- is there.
           */
          <span className="flex justify-end gap-1 font-mono text-table">
            <span
              className={row.original.sign > 0 ? 'text-fund-green' : 'text-coral'}
              aria-label={row.original.sign > 0 ? 'in' : 'out'}
            >
              {row.original.sign > 0 ? '+' : '−'}
            </span>
            <span className="text-ink">{rupees(row.original.entry.amount, { decimals: true })}</span>
          </span>
        ),
      },
      {
        id: 'trace',
        accessorFn: (row) => row.entry.traceId ?? '',
        header: 'Trace',
        enableSorting: false,
        cell: ({ row }) => {
          const trace = row.original.entry.traceId;
          if (!trace) return <span className="text-muted">None</span>;
          return (
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-pill text-muted">{trace}</span>
              <button
                type="button"
                onClick={() => onCopyTrace(trace)}
                aria-label={`Copy trace ${trace}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-pill text-muted hover:bg-marigold-tint/40 hover:text-ink"
              >
                <Copy size={13} strokeWidth={1.5} aria-hidden />
              </button>
            </span>
          );
        },
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => {
          const { status, entry, reversedById, releasedById } = row.original;
          const linkClass =
            'rounded-sm font-mono text-pill text-ink underline decoration-hairline underline-offset-2 hover:decoration-ink';
          if (status === 'REVERSAL' && entry.reversalOf) {
            return (
              <span className="whitespace-nowrap text-pill text-muted">
                Reversal of{' '}
                <button type="button" className={linkClass} onClick={() => jumpTo(entry.reversalOf as string)}>
                  {shortId(entry.reversalOf)}
                </button>
              </span>
            );
          }
          if (status === 'REVERSED' && reversedById) {
            return (
              <span className="whitespace-nowrap text-pill text-muted">
                Reversed by{' '}
                <button type="button" className={linkClass} onClick={() => jumpTo(reversedById)}>
                  {shortId(reversedById)}
                </button>
              </span>
            );
          }
          if (status === 'RELEASE' && entry.releaseOf) {
            return (
              <span className="whitespace-nowrap text-pill text-muted">
                Sends{' '}
                <button type="button" className={linkClass} onClick={() => jumpTo(entry.releaseOf as string)}>
                  {shortId(entry.releaseOf)}
                </button>
              </span>
            );
          }
          if (status === 'RELEASED' && releasedById) {
            return (
              <span className="whitespace-nowrap text-pill text-muted">
                Sent by{' '}
                <button type="button" className={linkClass} onClick={() => jumpTo(releasedById)}>
                  {shortId(releasedById)}
                </button>
              </span>
            );
          }
          if (status === 'AWAITING_RELEASE') {
            return <span className="whitespace-nowrap text-pill text-ink">Waiting to be sent</span>;
          }
          return <span className="text-pill text-muted">Posted</span>;
        },
      },
      {
        id: 'menu',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const { entry, status } = row.original;
          const blocked = NOT_REVERSIBLE[status];
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Actions for entry ${shortId(entry.id)}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-pill text-muted hover:bg-marigold-tint/40 hover:text-ink"
              >
                <MoreVertical size={16} strokeWidth={1.5} aria-hidden />
              </DropdownMenuTrigger>
              {/* Exactly three actions. Nothing here alters or erases a row. */}
              <DropdownMenuContent align="end">
                {entry.bookingId ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/bookings?booking=${entry.bookingId}`}>View booking</Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>View booking</DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={!entry.traceId}
                  onSelect={() => entry.traceId && onCopyTrace(entry.traceId)}
                >
                  Copy trace ID
                </DropdownMenuItem>
                <DropdownMenuItem disabled={Boolean(blocked)} onSelect={() => onReverse(row.original)}>
                  {blocked ? `Issue reversal (${blocked.toLowerCase()})` : 'Issue reversal'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters],
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-end gap-3 border-b border-hairline p-5">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
          <span className="text-pill font-medium text-muted">Search</span>
          <span className="relative flex items-center">
            <Search
              size={16}
              strokeWidth={1.5}
              aria-hidden
              className="pointer-events-none absolute left-3 text-muted"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => set('search', event.target.value)}
              placeholder="Entry ID, booking reference or trace ID"
              className="h-9 w-full rounded-pill border border-hairline bg-surface pl-9 pr-3 text-table text-ink placeholder:text-muted"
            />
          </span>
        </label>
        <Select
          className="w-44"
          label="Type"
          allLabel="Every type"
          value={filters.type}
          onChange={(value) => set('type', value)}
          options={Object.entries(ENTRY_TYPE).map(([value, type]) => ({ value, label: type.label }))}
        />
        <Select
          className="w-44"
          label="Party"
          allLabel="Everyone"
          value={filters.party}
          onChange={(value) => set('party', value)}
          options={PARTY_OPTIONS}
        />
        <Select
          className="w-40"
          label="When"
          allLabel="All time"
          value={filters.period}
          onChange={(value) => set('period', value as Period | '')}
          options={PERIOD_OPTIONS}
        />
      </div>

      <DataTable
        data={rows ?? []}
        columns={columns}
        caption="The append-only ledger of every money movement on the platform"
        isLoading={!rows}
        getRowId={(row) => row.entry.id}
        pageSize={15}
        /* Reversals carry a coral edge, so a correction is visible at a glance. */
        rowClassName={(row) =>
          row.status === 'REVERSAL'
            ? '[&>td:first-child]:shadow-[inset_2px_0_0_0_hsl(var(--coral))]'
            : undefined
        }
        note={
          <>
            This ledger is append-only. No entry is ever changed or removed; a mistake is
            corrected by issuing a new reversing entry, and both stay here, linked to each other.
            {rows ? (
              <span className="tabular ml-1 text-ink">{rows.length.toLocaleString('en-IN')} entries shown.</span>
            ) : null}
          </>
        }
        empty={
          <EmptyState
            className="px-5 py-6"
            title="No entries match"
            description="Nothing in the ledger matches the search and filters above."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFiltersChange({ search: '', type: '', party: '', period: '' })}
              >
                Clear filters
              </Button>
            }
          />
        }
      />
    </Card>
  );
}
