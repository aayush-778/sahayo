'use client';

import type { SortingState } from '@tanstack/react-table';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KycStatus, type AdminWorker, type WorkerCategory, type Zone } from '@sahayo/shared';
import { Card } from '@/components/ui-kit/Card';
import { DataTable } from '@/components/ui-kit/DataTable';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { BulkActionBar } from '@/components/workers/BulkActionBar';
import {
  EMPTY_FILTERS,
  WorkerFilterBar,
  type WorkerFilterState,
} from '@/components/workers/WorkerFilterBar';
import { buildWorkerColumns } from '@/components/workers/workerColumns';
import { downloadCsv, toCsv } from '@/lib/csv';
import {
  approveKyc,
  assignZone,
  listKycQueue,
  listWorkers,
  listZones,
  setOnline,
  type WorkerFilter,
} from '@/lib/services';
import { Button } from '@/components/ui-kit/Button';

/**
 * The worker directory.
 *
 * Filters live in the URL, so a filtered view is a link that can be sent to a
 * colleague and survives a reload. The table sorts on jobs-this-week descending
 * by default — the equity signal is what this page is for, so the busiest workers
 * are at the top and the "show under-allocated first" switch flips to the
 * opposite end of the same column rather than sorting something else.
 */

/** Reads the filter state out of the query string. */
function filtersFromParams(params: URLSearchParams): WorkerFilterState {
  return {
    search: params.get('q') ?? '',
    category: params.get('category') ?? '',
    zone: params.get('zone') ?? '',
    verification: params.get('verification') ?? '',
    online: params.get('online') ?? '',
    underAllocatedFirst: params.get('under') === '1',
  };
}

/** Writes the filter state back, omitting anything unset so the URL stays short. */
function paramsFromFilters(filters: WorkerFilterState): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('q', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.zone) params.set('zone', filters.zone);
  if (filters.verification) params.set('verification', filters.verification);
  if (filters.online) params.set('online', filters.online);
  if (filters.underAllocatedFirst) params.set('under', '1');
  return params.toString();
}

/** Translates the UI's filter state into the service's filter shape. */
function toServiceFilter(filters: WorkerFilterState): WorkerFilter {
  return {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.category ? { category: filters.category as WorkerCategory } : {}),
    ...(filters.zone ? { zoneId: filters.zone } : {}),
    ...(filters.verification ? { kycStatus: filters.verification as KycStatus } : {}),
    ...(filters.online ? { isOnline: filters.online === 'true' } : {}),
  };
}

function WorkersDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<WorkerFilterState>(EMPTY_FILTERS);
  const [workers, setWorkers] = useState<AdminWorker[]>();
  const [zones, setZones] = useState<Zone[]>([]);
  /*
   * The cohort maximum comes from the UNFILTERED set. A bar that rescaled to
   * whatever was filtered would make the same worker look busy in one view and
   * idle in another, which is the opposite of what the signal is for.
   */
  const [cohortMax, setCohortMax] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'jobsThisWeek', desc: true },
  ]);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [pendingZone, setPendingZone] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  /* Hydrate the filter state from the URL once, and on back/forward. */
  useEffect(() => {
    setFilters(filtersFromParams(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [all, zoneList] = await Promise.all([listWorkers(), listZones()]);
      if (cancelled) return;
      setCohortMax(all.reduce((max, worker) => Math.max(max, worker.jobsThisWeek), 1));
      setZones(zoneList);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * One fetcher, used both when the filters change and after a mutation. The
   * service owns the matching rules; this page never filters the array itself.
   */
  const reload = useCallback(async () => {
    const rows = await listWorkers(toServiceFilter(filters));
    setWorkers(rows);
  }, [filters]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /* The under-allocated switch flips the same column rather than sorting another. */
  useEffect(() => {
    setSorting([{ id: 'jobsThisWeek', desc: !filters.underAllocatedFirst }]);
  }, [filters.underAllocatedFirst]);

  function onFiltersChange(next: WorkerFilterState): void {
    setFilters(next);
    const query = paramsFromFilters(next);
    router.replace(query ? `/workers?${query}` : '/workers', { scroll: false });
  }

  const zoneName = useCallback(
    (zoneId: string) => zones.find((zone) => zone.id === zoneId)?.name ?? 'Unknown zone',
    [zones],
  );

  async function onApprove(worker: AdminWorker): Promise<void> {
    setBusy(true);
    try {
      /*
       * Approval goes through the KYC service, not by setting a field: that is
       * what makes the same click move this badge, the verification queue's count
       * and the dashboard's stat together.
       */
      const queue = await listKycQueue();
      const submission = queue.find((item) => item.workerId === worker.id);
      if (!submission) {
        setNotice(
          `${worker.name} has not submitted any documents yet, so there is nothing to verify.`,
        );
        return;
      }
      await approveKyc(submission.submission.id);
      await reload();
      setNotice(`Verified ${worker.name}.`);
    } finally {
      setBusy(false);
    }
  }

  async function onToggleOnline(worker: AdminWorker): Promise<void> {
    setBusy(true);
    try {
      await setOnline(worker.id, !worker.isOnline);
      await reload();
      setNotice(`${worker.name} is now ${worker.isOnline ? 'offline' : 'online'}.`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const columns = useMemo(
    () => buildWorkerColumns({ cohortMax, zoneName, onApprove, onToggleOnline }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cohortMax, zoneName],
  );

  const selectedWorkers = useMemo(
    () => (workers ?? []).filter((worker) => selection[worker.id]),
    [workers, selection],
  );

  function exportRows(rows: AdminWorker[], filename: string): void {
    downloadCsv(
      filename,
      toCsv(rows, [
        { header: 'Name', value: (w) => w.name },
        { header: 'Phone', value: (w) => w.phone },
        { header: 'Category', value: (w) => w.category },
        { header: 'Zone', value: (w) => zoneName(w.zoneId) },
        { header: 'Verification', value: (w) => w.kycStatus },
        { header: 'Online', value: (w) => (w.isOnline ? 'Yes' : 'No') },
        { header: 'Rating', value: (w) => w.rating.toFixed(1) },
        { header: 'Jobs this week', value: (w) => w.jobsThisWeek },
        { header: 'Lifetime jobs', value: (w) => w.lifetimeJobs },
        /* Rupees, not paise: this file is opened in a spreadsheet by a person. */
        { header: 'Wallet (INR)', value: (w) => (w.walletBalance / 100).toFixed(2) },
        { header: 'Fund contributed (INR)', value: (w) => (w.fundContributed / 100).toFixed(2) },
        { header: 'Joined', value: (w) => w.joinedAt.slice(0, 10) },
      ]),
    );
  }

  async function onVerifySelected(): Promise<void> {
    setBusy(true);
    try {
      const queue = await listKycQueue();
      const byWorker = new Map(queue.map((item) => [item.workerId, item.submission.id]));
      let verified = 0;
      let skipped = 0;
      for (const worker of selectedWorkers) {
        const submissionId = byWorker.get(worker.id);
        if (!submissionId) {
          skipped += 1;
          continue;
        }
        await approveKyc(submissionId);
        verified += 1;
      }
      await reload();
      setSelection({});
      setNotice(
        skipped === 0
          ? `Verified ${verified} workers.`
          : `Verified ${verified} workers. ${skipped} had submitted no documents, so they were left alone.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function onAssignZone(): Promise<void> {
    if (!pendingZone) return;
    setBusy(true);
    try {
      const moved = await assignZone(
        selectedWorkers.map((worker) => worker.id),
        pendingZone,
      );
      await reload();
      setSelection({});
      setPendingZone('');
      setNotice(`Moved ${moved} workers to ${zoneName(pendingZone)}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-24">
      <WorkerFilterBar
        value={filters}
        onChange={onFiltersChange}
        zones={zones}
        matchCount={workers?.length ?? 0}
        onExport={() => exportRows(workers ?? [], 'sahayo-workers')}
      />

      {notice ? (
        <p
          role="status"
          className="rounded-tile border border-hairline bg-marigold-tint/50 px-4 py-2.5 text-table text-ink"
        >
          {notice}
        </p>
      ) : null}

      <Card className="overflow-hidden p-0">
        <DataTable
          data={workers ?? []}
          columns={columns}
          caption="Every worker on the platform, with the jobs they have taken this week"
          isLoading={!workers}
          getRowId={(worker) => worker.id}
          sorting={sorting}
          onSortingChange={setSorting}
          rowSelection={selection}
          onRowSelectionChange={setSelection}
          pageSize={15}
          empty={
            <EmptyState
              className="px-5 py-6"
              title="No workers match these filters"
              description="No member matches the search and filters above."
              action={
                <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          }
        />
      </Card>

      <BulkActionBar
        selectedCount={selectedWorkers.length}
        zones={zones}
        pendingZone={pendingZone}
        onPendingZoneChange={setPendingZone}
        onVerify={onVerifySelected}
        onAssignZone={onAssignZone}
        onExport={() => exportRows(selectedWorkers, 'sahayo-workers-selection')}
        onClear={() => setSelection({})}
        busy={busy}
      />
    </div>
  );
}

/**
 * The route.
 *
 * `useSearchParams` forces the component that calls it out of prerendering, so
 * the directory sits behind a Suspense boundary and the route itself stays
 * statically shell-rendered. Without the boundary the production build fails
 * outright rather than degrading — the filters-in-the-URL design makes this
 * boundary a requirement, not a nicety.
 */
export default function WorkersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <Skeleton lines={2} />
          </Card>
          <Card className="p-6">
            <Skeleton lines={10} />
          </Card>
        </div>
      }
    >
      <WorkersDirectory />
    </Suspense>
  );
}
