'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreVertical, Star } from 'lucide-react';
import Link from 'next/link';
import { KycStatus, type AdminWorker } from '@sahayo/shared';
import { Avatar } from '@/components/ui-kit/Avatar';
import { StatusPill, type StatusVariant } from '@/components/ui-kit/StatusPill';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { count, rupees } from '@/lib/format';
import { UNDER_ALLOCATED_THRESHOLD, categoryLabel, isUnderAllocated } from '@/lib/services';
import { cn } from '@/lib/utils';

/** Maps a verification state to the pill that shows it. */
const KYC_PILL: Record<string, { status: StatusVariant; label: string }> = {
  [KycStatus.VERIFIED]: { status: 'verified', label: 'Verified' },
  [KycStatus.PENDING]: { status: 'pending', label: 'Pending' },
  [KycStatus.REJECTED]: { status: 'rejected', label: 'Rejected' },
  [KycStatus.UNSUBMITTED]: { status: 'offline', label: 'Not submitted' },
};

/**
 * The jobs-this-week cell — the equity signal, and the reason this table exists.
 *
 * Given deliberate visual weight: a tabular count, then a bar drawn relative to
 * the busiest worker in the cohort so its length means "compared with the most
 * allocated". At or below the threshold the bar turns coral and an
 * "Under-allocated" pill appears, because a low number here is a problem for
 * dispatch to fix rather than a judgement on the worker.
 */
function JobsThisWeekCell({ worker, cohortMax }: { worker: AdminWorker; cohortMax: number }) {
  const under = isUnderAllocated(worker);
  const fill = Math.max(0.04, worker.jobsThisWeek / Math.max(1, cohortMax));

  return (
    <div className="flex items-center gap-2.5">
      <span className="tabular w-5 text-right font-medium text-ink">
        {count(worker.jobsThisWeek)}
      </span>
      <span
        className="h-1.5 w-10 flex-none overflow-hidden rounded-pill bg-hairline/70"
        role="img"
        aria-label={`${worker.jobsThisWeek} of ${cohortMax} jobs, the cohort's highest`}
      >
        <span
          className={cn('block h-full rounded-pill', under ? 'bg-coral' : 'bg-marigold')}
          style={{ width: `${fill * 100}%` }}
        />
      </span>
      {under ? (
        <span className="rounded-pill bg-coral/20 px-2 py-0.5 text-pill font-medium text-ink">
          Under-allocated
        </span>
      ) : null}
    </div>
  );
}

export interface WorkerColumnOptions {
  /** The busiest worker's weekly count, which the mini-bars scale against. */
  cohortMax: number;
  zoneName: (zoneId: string) => string;
  onApprove: (worker: AdminWorker) => void;
  onToggleOnline: (worker: AdminWorker) => void;
}

/**
 * The directory's columns.
 *
 * A factory rather than a constant because three of them need the cohort maximum
 * and the zone lookup, and threading those through cell context would be more
 * indirection than passing them in.
 */
export function buildWorkerColumns({
  cohortMax,
  zoneName,
  onApprove,
  onToggleOnline,
}: WorkerColumnOptions): ColumnDef<AdminWorker>[] {
  return [
    {
      id: 'select',
      enableSorting: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label="Select every worker on this page"
          className="h-4 w-4 rounded-sm border-hairline accent-marigold"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          aria-label={`Select ${row.original.name}`}
          onClick={(event) => event.stopPropagation()}
          className="h-4 w-4 rounded-sm border-hairline accent-marigold"
        />
      ),
    },
    {
      id: 'name',
      accessorFn: (worker) => worker.name,
      header: 'Worker',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.original.name} src={row.original.avatarUrl} size={32} />
          <div className="min-w-0">
            <Link
              href={`/workers/${row.original.id}`}
              className="block truncate font-medium text-ink hover:underline"
            >
              {row.original.name}
            </Link>
            <span className="block truncate text-pill text-muted">{row.original.phone}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'category',
      accessorFn: (worker) => worker.category,
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-muted">
          {categoryLabel(row.original.category)}
        </span>
      ),
    },
    {
      id: 'zone',
      accessorFn: (worker) => zoneName(worker.zoneId),
      header: 'Zone',
      cell: ({ row }) => <span className="text-muted">{zoneName(row.original.zoneId)}</span>,
    },
    {
      id: 'verification',
      accessorFn: (worker) => worker.kycStatus,
      header: 'Verification',
      cell: ({ row }) => {
        const pill = KYC_PILL[row.original.kycStatus];
        return <StatusPill status={pill.status} label={pill.label} />;
      },
    },
    {
      id: 'online',
      accessorFn: (worker) => (worker.isOnline ? 1 : 0),
      header: 'Available',
      cell: ({ row }) => {
        const { isOnline, isOnJob } = row.original;
        const label = isOnJob ? 'On a job' : isOnline ? 'Online' : 'Offline';
        return (
          <span className="flex items-center gap-2 text-muted">
            <span
              aria-hidden
              className={cn(
                'h-2 w-2 flex-none rounded-full',
                isOnline ? 'bg-fund-green' : 'bg-muted',
              )}
            />
            {/* The word carries the state; the dot alone never does. */}
            {label}
          </span>
        );
      },
    },
    {
      id: 'rating',
      accessorFn: (worker) => worker.rating,
      header: 'Rating',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <Star size={14} strokeWidth={1.5} aria-hidden className="text-marigold" />
          <span className="tabular text-ink">{row.original.rating.toFixed(1)}</span>
          <span className="tabular text-pill text-muted">({row.original.ratingCount})</span>
        </span>
      ),
    },
    {
      id: 'jobsThisWeek',
      accessorFn: (worker) => worker.jobsThisWeek,
      header: 'Jobs this week',
      cell: ({ row }) => <JobsThisWeekCell worker={row.original} cohortMax={cohortMax} />,
    },
    {
      id: 'wallet',
      accessorFn: (worker) => worker.walletBalance,
      header: 'Wallet',
      cell: ({ row }) => (
        <span className="tabular text-ink">{rupees(row.original.walletBalance)}</span>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      header: '',
      cell: ({ row }) => {
        const worker = row.original;
        const verified = worker.kycStatus === KycStatus.VERIFIED;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(event) => event.stopPropagation()}
              aria-label={`Actions for ${worker.name}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-pill text-muted hover:bg-marigold-tint/40 hover:text-ink"
            >
              <MoreVertical size={16} strokeWidth={1.5} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/workers/${worker.id}`}>View profile</Link>
              </DropdownMenuItem>
              {verified ? null : (
                <DropdownMenuItem onSelect={() => onApprove(worker)}>
                  Verify worker
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={!verified}
                onSelect={() => onToggleOnline(worker)}
              >
                {worker.isOnline ? 'Take offline' : 'Bring online'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export { UNDER_ALLOCATED_THRESHOLD };
