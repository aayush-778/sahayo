'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KycStatus,
  type AadhaarAccessLogEntry,
  type AdminWorker,
  type KycDocumentType,
  type KycRejectionReason,
} from '@sahayo/shared';
import { Tabs } from '@/components/ui-kit/Tabs';
import { AccessLogTable } from '@/components/verification/AccessLogTable';
import { QueueList, type QueueFilters } from '@/components/verification/QueueList';
import { RejectDialog } from '@/components/verification/RejectDialog';
import { ReviewPane } from '@/components/verification/ReviewPane';
import {
  approveKyc,
  getWorker,
  listAadhaarAccessLog,
  listKycQueue,
  listWorkers,
  listZones,
  rejectKyc,
  type KycQueueItem,
} from '@/lib/services';

type TabValue = 'queue' | 'log';

/**
 * The verification queue.
 *
 * A 40 / 60 split: the queue on the left, worked from the keyboard, and the document
 * on the right. Approving moves straight on to the next submission, because this
 * page is worked in volume and a reviewer should not have to click back to the list
 * after every decision.
 *
 * The selection is page state, never the URL. Submission ids are UUIDs and carry no
 * part of an Aadhaar number, but keeping review state out of the address bar means
 * nothing about a worker's identity documents can land in browser history, a shared
 * link or a referrer header by accident.
 */
export default function VerificationPage() {
  const [tab, setTab] = useState<TabValue>('queue');
  const [filters, setFilters] = useState<QueueFilters>({
    status: KycStatus.PENDING,
    documentType: '',
    search: '',
  });
  const [items, setItems] = useState<KycQueueItem[]>();
  const [selectedId, setSelectedId] = useState<string>();
  const [worker, setWorker] = useState<AdminWorker>();
  const [zoneNames, setZoneNames] = useState<Map<string, string>>(new Map());
  const [workerNames, setWorkerNames] = useState<Map<string, string>>(new Map());
  const [rejecting, setRejecting] = useState<KycQueueItem>();
  const [log, setLog] = useState<AadhaarAccessLogEntry[]>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  const paneRef = useRef<HTMLDivElement>(null);

  /* Settings > Compliance links here with ?tab=log to open the Aadhaar access log. */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'log') setTab('log');
  }, []);

  useEffect(() => {
    void Promise.all([listZones(), listWorkers()]).then(([zones, workers]) => {
      setZoneNames(new Map(zones.map((zone) => [zone.id, zone.name])));
      setWorkerNames(new Map(workers.map((w) => [w.id, w.name])));
    });
  }, []);

  const loadQueue = useCallback(async (): Promise<KycQueueItem[]> => {
    const next = await listKycQueue({
      ...(filters.status ? { status: filters.status as KycStatus } : {}),
      ...(filters.documentType ? { documentType: filters.documentType as KycDocumentType } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    });
    setItems(next);
    return next;
  }, [filters]);

  /* A filter change reloads, and keeps the selection only if it is still in view. */
  useEffect(() => {
    let cancelled = false;
    setItems(undefined);
    void loadQueue().then((next) => {
      if (cancelled) return;
      setSelectedId((current) =>
        current && next.some((item) => item.submission.id === current)
          ? current
          : next[0]?.submission.id,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [loadQueue]);

  const selected = items?.find((item) => item.submission.id === selectedId);

  useEffect(() => {
    setWorker(undefined);
    if (!selected) return;
    let cancelled = false;
    void getWorker(selected.workerId).then((found) => {
      if (!cancelled) setWorker(found);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const loadLog = useCallback(async () => {
    setLog(await listAadhaarAccessLog());
  }, []);

  useEffect(() => {
    if (tab === 'log') void loadLog();
  }, [tab, loadLog]);

  /**
   * After a decision, select whatever came next in the list as it was — not the top
   * of the refreshed list — so a reviewer working down the queue keeps their place.
   */
  const advanceFrom = useCallback(
    (decidedId: string, before: KycQueueItem[], after: KycQueueItem[]) => {
      const index = before.findIndex((item) => item.submission.id === decidedId);
      const laterIds = before.slice(index + 1).map((item) => item.submission.id);
      const next =
        after.find((item) => laterIds.includes(item.submission.id)) ??
        after.find((item) => item.submission.id !== decidedId) ??
        after[0];
      setSelectedId(next?.submission.id);
    },
    [],
  );

  async function onApprove(): Promise<void> {
    if (!selected || !items) return;
    setBusy(true);
    try {
      await approveKyc(selected.submission.id);
      const after = await loadQueue();
      advanceFrom(selected.submission.id, items, after);
      setNotice(`Approved ${selected.workerName}. They can take jobs now.`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmReject(reason: KycRejectionReason, note: string): Promise<void> {
    if (!rejecting || !items) return;
    await rejectKyc(rejecting.submission.id, reason, note || undefined);
    const after = await loadQueue();
    advanceFrom(rejecting.submission.id, items, after);
    setNotice(`Rejected ${rejecting.workerName}'s document and told them why.`);
    setRejecting(undefined);
  }

  const openSelected = useCallback(() => paneRef.current?.focus(), []);

  const workerName = useCallback(
    (workerId: string) => workerNames.get(workerId) ?? 'Unknown worker',
    [workerNames],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs
          label="Verification"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'queue', label: 'Queue', ...(items ? { badge: items.length } : {}) },
            { value: 'log', label: 'Access log', ...(log ? { badge: log.length } : {}) },
          ]}
        />
        {notice ? (
          <p role="status" className="text-table text-ink">
            {notice}
          </p>
        ) : null}
      </div>

      {tab === 'queue' ? (
        <div
          role="tabpanel"
          aria-label="Queue"
          className="grid h-[calc(100vh-11.5rem)] min-h-[32rem] grid-cols-5 overflow-hidden rounded-card border border-hairline bg-surface shadow-card"
        >
          <div className="col-span-2 min-h-0 border-r border-hairline">
            <QueueList
              items={items}
              filters={filters}
              onFiltersChange={setFilters}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpen={openSelected}
            />
          </div>
          <div className="col-span-3 min-h-0">
            <ReviewPane
              ref={paneRef}
              item={selected}
              worker={worker}
              zoneName={worker ? zoneNames.get(worker.zoneId) : undefined}
              busy={busy}
              onApprove={onApprove}
              onReject={() => selected && setRejecting(selected)}
              onRevealed={() => void loadLog()}
            />
          </div>
        </div>
      ) : (
        <div role="tabpanel" aria-label="Access log">
          <AccessLogTable entries={log} workerName={workerName} onOpenQueue={() => setTab('queue')} />
        </div>
      )}

      <RejectDialog
        item={rejecting}
        onCancel={() => setRejecting(undefined)}
        onConfirm={onConfirmReject}
      />
    </div>
  );
}
