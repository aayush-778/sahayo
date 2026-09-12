'use client';

import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { Copy, Send } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { DataTable } from '@/components/ui-kit/DataTable';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { rupees } from '@/lib/format';
import type { PayoutRow } from '@/lib/services';
import { shortId } from './LedgerTable';

export type PayoutView = 'PENDING' | 'RELEASED';

const VIEWS = [
  { value: 'PENDING' as const, label: 'Waiting to be sent' },
  { value: 'RELEASED' as const, label: 'Sent to bank' },
];

export interface PayoutsTableProps {
  view: PayoutView;
  onViewChange: (view: PayoutView) => void;
  rows?: PayoutRow[];
  selection: RowSelectionState;
  onSelectionChange: (selection: RowSelectionState) => void;
  onRelease: () => void;
  onCopyTrace: (traceId: string) => void;
  busy?: boolean;
}

/**
 * Worker payouts: what is owed, and what has been sent.
 *
 * Releasing a batch writes one new ledger row per payout rather than marking the
 * payouts as paid — "sent" is a fact derived from that row existing. The trace ID
 * column is for the call nobody wants but everyone gets: a worker asking where their
 * money is, which support answers by quoting the trace to the bank.
 */
export function PayoutsTable({
  view,
  onViewChange,
  rows,
  selection,
  onSelectionChange,
  onRelease,
  onCopyTrace,
  busy = false,
}: PayoutsTableProps) {
  const pending = view === 'PENDING';

  const selectedTotal = useMemo(
    () =>
      (rows ?? [])
        .filter((row) => selection[row.payout.id])
        .reduce((sum, row) => sum + row.payout.amount, 0),
    [rows, selection],
  );
  const selectedCount = Object.values(selection).filter(Boolean).length;

  const columns = useMemo<ColumnDef<PayoutRow>[]>(() => {
    const base: ColumnDef<PayoutRow>[] = [
      {
        id: 'worker',
        accessorFn: (row) => row.workerName,
        header: 'Worker',
        cell: ({ row }) => <span className="font-medium text-ink">{row.original.workerName}</span>,
      },
      {
        id: 'booking',
        accessorFn: (row) => row.bookingReference ?? '',
        header: 'For job',
        cell: ({ row }) => (
          <span className="tabular text-muted">{row.original.bookingReference ?? 'No booking'}</span>
        ),
      },
      {
        id: 'earned',
        accessorFn: (row) => row.payout.createdAt,
        header: 'Earned',
        cell: ({ row }) => (
          <span className="tabular text-muted">
            {new Date(row.original.payout.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        ),
      },
      {
        id: 'amount',
        accessorFn: (row) => row.payout.amount,
        header: 'Amount',
        cell: ({ row }) => (
          <span className="block text-right font-mono text-table text-ink">
            {rupees(row.original.payout.amount, { decimals: true })}
          </span>
        ),
      },
      {
        id: 'trace',
        header: 'Trace',
        enableSorting: false,
        cell: ({ row }) => {
          /* Once sent, the trace that matters is the bank transfer's, not the payout's. */
          const trace = row.original.release?.traceId ?? row.original.payout.traceId;
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
    ];

    if (!pending) {
      base.push({
        id: 'sent',
        accessorFn: (row) => row.release?.createdAt ?? '',
        header: 'Sent',
        cell: ({ row }) =>
          row.original.release ? (
            <span className="whitespace-nowrap text-pill text-muted">
              {new Date(row.original.release.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}{' '}
              by <span className="font-mono text-ink">{shortId(row.original.release.id)}</span>
            </span>
          ) : null,
      });
      return base;
    }

    return [
      {
        id: 'select',
        enableSorting: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Select every payout on this page"
            className="h-4 w-4 rounded-sm border-hairline accent-marigold"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={`Select the payout to ${row.original.workerName}`}
            className="h-4 w-4 rounded-sm border-hairline accent-marigold"
          />
        ),
      },
      ...base,
    ];
  }, [pending, onCopyTrace]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-5">
        <SegmentedToggle label="Payouts to show" options={VIEWS} value={view} onChange={onViewChange} />

        {pending ? (
          <div className="flex items-center gap-3">
            <span className="text-pill text-muted">
              {selectedCount > 0 ? (
                <>
                  <span className="tabular text-ink">{selectedCount}</span> selected,{' '}
                  <span className="tabular text-ink">{rupees(selectedTotal)}</span>
                </>
              ) : (
                'Select payouts to send them together'
              )}
            </span>
            <Button
              variant="primary"
              icon={<Send size={16} strokeWidth={1.5} aria-hidden />}
              onClick={onRelease}
              disabled={busy || selectedCount === 0}
            >
              Release batch
            </Button>
          </div>
        ) : null}
      </div>

      <DataTable
        data={rows ?? []}
        columns={columns}
        caption={pending ? 'Worker payouts waiting to be sent to the bank' : 'Worker payouts already sent'}
        isLoading={!rows}
        getRowId={(row) => row.payout.id}
        pageSize={15}
        {...(pending ? { rowSelection: selection, onRowSelectionChange: onSelectionChange } : {})}
        note={
          pending
            ? 'Releasing a batch adds one ledger entry per payout. The payouts themselves are never changed.'
            : 'Each payout here has a matching ledger entry recording when it was sent.'
        }
        empty={
          <EmptyState
            className="px-5 py-6"
            title={pending ? 'Nothing is waiting to be sent' : 'No payouts have been sent yet'}
            description={
              pending
                ? 'Every earned payout has already gone to the workers. New ones appear here as jobs are paid.'
                : 'Payouts appear here once a batch has been released to the bank.'
            }
          />
        }
      />
    </Card>
  );
}
