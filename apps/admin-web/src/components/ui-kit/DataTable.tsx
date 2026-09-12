'use client';

import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

export interface DataTableProps<T, TValue = unknown> {
  data: T[];
  columns: ColumnDef<T, TValue>[];
  /** Describes the table's contents for screen readers. */
  caption: string;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  /** Stable row identity, so selection survives a re-sort or a re-filter. */
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  isLoading?: boolean;
  /** Shown in place of rows when `data` is empty. Must say what would fill it. */
  empty?: ReactNode;
  /**
   * A line rendered above the header — used where a table makes a claim the
   * reader should see without asking, such as the ledger being append-only.
   */
  note?: ReactNode;
  className?: string;
}

/**
 * The one table in the product.
 *
 * Hairline row separators and nothing else: no vertical grid lines, no zebra
 * striping, no outer cell borders. Rows are 56px, headers are 12px uppercase
 * muted — the second and last permitted use of uppercase — and hovering a row
 * washes it in marigold-tint at 40%.
 */
export function DataTable<T, TValue = unknown>({
  data,
  columns,
  caption,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  onRowClick,
  pageSize = 12,
  isLoading = false,
  empty,
  note,
  className,
}: DataTableProps<T, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: {
      ...(sorting ? { sorting } : {}),
      ...(rowSelection ? { rowSelection } : {}),
    },
    onSortingChange: onSortingChange
      ? (updater) =>
          onSortingChange(typeof updater === 'function' ? updater(sorting ?? []) : updater)
      : undefined,
    onRowSelectionChange: onRowSelectionChange
      ? (updater) =>
          onRowSelectionChange(
            typeof updater === 'function' ? updater(rowSelection ?? {}) : updater,
          )
      : undefined,
    enableRowSelection: Boolean(onRowSelectionChange),
    initialState: { pagination: { pageSize } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex + 1;
  const rowCount = table.getFilteredRowModel().rows.length;
  const pagerClass =
    'inline-flex items-center gap-1 rounded-pill border border-hairline px-3 py-1.5 text-pill font-semibold text-ink transition-colors hover:bg-marigold-tint/40 disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent';

  return (
    <div className={cn('flex flex-col', className)}>
      {note ? (
        <p className="border-b border-hairline px-5 py-3 text-table text-muted">{note}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-hairline">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const direction = header.column.getIsSorted();
                  const SortIcon =
                    direction === 'asc'
                      ? ArrowUp
                      : direction === 'desc'
                        ? ArrowDown
                        : ChevronsUpDown;

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        direction === 'asc'
                          ? 'ascending'
                          : direction === 'desc'
                            ? 'descending'
                            : undefined
                      }
                      className="px-5 py-3 text-left text-pill font-semibold uppercase tracking-[0.04em] text-muted"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 rounded-sm uppercase hover:text-ink"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon size={12} strokeWidth={1.5} aria-hidden />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-hairline">
                    {table.getAllLeafColumns().map((column) => (
                      <td key={column.id} className="h-14 px-5">
                        <Skeleton className="w-2/3" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      'border-b border-hairline transition-colors',
                      row.getIsSelected() ? 'bg-marigold-tint/60' : 'hover:bg-marigold-tint/40',
                      onRowClick ? 'cursor-pointer' : undefined,
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="h-14 px-5 align-middle text-ink">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {!isLoading && rows.length === 0
        ? (empty ?? (
            <EmptyState
              className="px-5 py-6"
              title="Nothing matches these filters"
              description="Widen the category, zone, or status filters above to bring rows back."
            />
          ))
        : null}

      {pageCount > 1 ? (
        <div className="flex items-center justify-between border-t border-hairline px-5 py-3">
          <p className="text-table text-muted">
            Page <span className="tabular text-ink">{pageIndex}</span> of{' '}
            <span className="tabular text-ink">{pageCount}</span>
            <span className="ml-2 tabular">{rowCount} rows</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={pagerClass}
            >
              <ChevronLeft size={14} strokeWidth={1.5} aria-hidden />
              Previous
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={pagerClass}
            >
              Next
              <ChevronRight size={14} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
