'use client';

import { ArrowLeft, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  KycStatus,
  type AdminBooking,
  type AdminWorker,
  type KycSubmission,
} from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { Tabs } from '@/components/ui-kit/Tabs';
import { BookingsTab } from '@/components/workers/BookingsTab';
import { DocumentsTab } from '@/components/workers/DocumentsTab';
import { EarningsTab } from '@/components/workers/EarningsTab';
import { IdentityPanel } from '@/components/workers/IdentityPanel';
import { OverviewTab } from '@/components/workers/OverviewTab';
import {
  approveKyc,
  getWorker,
  getWorkerBookings,
  getWorkerDocuments,
  getWorkerEarnings,
  listKycQueue,
  listZones,
  setOnline,
  type Period,
  type WorkerEarning,
} from '@/lib/services';

type TabValue = 'overview' | 'earnings' | 'bookings' | 'documents';

/** Verification state as a pill variant and the word that goes with it. */
const VERIFICATION: Record<
  string,
  { status: 'pending' | 'verified' | 'rejected' | 'offline'; label: string }
> = {
  [KycStatus.VERIFIED]: { status: 'verified', label: 'Verified' },
  [KycStatus.PENDING]: { status: 'pending', label: 'Waiting on review' },
  [KycStatus.REJECTED]: { status: 'rejected', label: 'Rejected' },
  [KycStatus.UNSUBMITTED]: { status: 'offline', label: 'Nothing submitted' },
};

/**
 * A worker's profile.
 *
 * Four columns of identity beside eight of tabbed detail — not a centred card.
 * This is a record being worked on: the operator needs the person's details in
 * view while reading their earnings, so the left panel is sticky.
 *
 * Approving from here goes through the same `approveKyc` the verification queue
 * uses, which is what makes one click move this badge, the directory's badge and
 * the dashboard's verification count together.
 */
export default function WorkerProfilePage() {
  const params = useParams<{ id: string }>();
  const workerId = params.id;

  const [worker, setWorker] = useState<AdminWorker>();
  const [notFound, setNotFound] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [tab, setTab] = useState<TabValue>('overview');
  const [period, setPeriod] = useState<Period>('30D');
  const [earnings, setEarnings] = useState<WorkerEarning[]>();
  const [bookings, setBookings] = useState<AdminBooking[]>();
  const [documents, setDocuments] = useState<KycSubmission[]>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  const loadWorker = useCallback(async () => {
    const found = await getWorker(workerId);
    if (!found) {
      setNotFound(true);
      return;
    }
    setWorker(found);
    const zones = await listZones();
    setZoneName(zones.find((zone) => zone.id === found.zoneId)?.name ?? 'Unknown zone');
  }, [workerId]);

  useEffect(() => {
    void loadWorker();
  }, [loadWorker]);

  /*
   * Each tab fetches the first time it is opened and not before. A profile has
   * four tabs and an operator usually reads one, so loading all four on mount
   * would be three wasted round trips and three sets of skeletons nobody sees.
   */
  useEffect(() => {
    if (tab !== 'earnings') return;
    let cancelled = false;
    setEarnings(undefined);
    void getWorkerEarnings(workerId, period).then((rows) => {
      if (!cancelled) setEarnings(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [tab, workerId, period]);

  useEffect(() => {
    if (tab !== 'bookings' || bookings) return;
    void getWorkerBookings(workerId).then(setBookings);
  }, [tab, workerId, bookings]);

  const loadDocuments = useCallback(async () => {
    const rows = await getWorkerDocuments(workerId);
    setDocuments(rows);
  }, [workerId]);

  useEffect(() => {
    if (tab !== 'documents' || documents) return;
    void loadDocuments();
  }, [tab, documents, loadDocuments]);

  async function onApprove(): Promise<void> {
    if (!worker) return;
    setBusy(true);
    try {
      const queue = await listKycQueue();
      const item = queue.find((candidate) => candidate.workerId === worker.id);
      if (!item) {
        setNotice(
          `${worker.name} has not submitted any documents, so there is nothing to verify yet.`,
        );
        return;
      }
      await approveKyc(item.submission.id);
      await loadWorker();
      await loadDocuments();
      setNotice(`Verified ${worker.name}. The directory and the dashboard now show it too.`);
    } finally {
      setBusy(false);
    }
  }

  async function onSuspend(): Promise<void> {
    if (!worker) return;
    setBusy(true);
    try {
      await setOnline(worker.id, false);
      await loadWorker();
      setNotice(`${worker.name} has been taken offline and will not be offered new jobs.`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <Card className="max-w-md p-6">
        <EmptyState
          title="No worker with that link"
          description="The worker may have been removed, or the link may be mistyped. Go back to the directory and search by name."
          action={
            /* A link, not a button: this navigates, so it should be a real anchor. */
            <Link
              href="/workers"
              className="inline-flex h-9 items-center rounded-pill border border-hairline bg-surface px-4 text-table font-medium text-ink transition-colors hover:bg-marigold-tint/40"
            >
              Back to the directory
            </Link>
          }
        />
      </Card>
    );
  }

  if (!worker) {
    return (
      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 p-6 lg:col-span-4">
          <Skeleton lines={8} />
        </Card>
        <Card className="col-span-12 p-6 lg:col-span-8">
          <Skeleton lines={10} />
        </Card>
      </div>
    );
  }

  const verification = VERIFICATION[worker.kycStatus];
  const needsVerifying = worker.kycStatus !== KycStatus.VERIFIED;

  const TABS = [
    { value: 'overview' as const, label: 'Overview' },
    { value: 'earnings' as const, label: 'Earnings' },
    { value: 'bookings' as const, label: 'Bookings' },
    {
      value: 'documents' as const,
      label: 'Documents',
      ...(documents ? { badge: documents.length } : {}),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/workers"
          className="inline-flex items-center gap-1.5 rounded-sm text-table text-muted hover:text-ink"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
          All workers
        </Link>
        {needsVerifying ? (
          <Button
            variant="primary"
            icon={<BadgeCheck size={16} strokeWidth={1.5} aria-hidden />}
            onClick={onApprove}
            disabled={busy}
          >
            Verify worker
          </Button>
        ) : null}
      </div>

      {notice ? (
        <p
          role="status"
          className="rounded-tile border border-hairline bg-marigold-tint/50 px-4 py-2.5 text-table text-ink"
        >
          {notice}
        </p>
      ) : null}

      <div className="grid grid-cols-12 items-start gap-5">
        <IdentityPanel
          worker={worker}
          zoneName={zoneName}
          onViewDocuments={() => setTab('documents')}
          onSuspend={onSuspend}
          busy={busy}
        />

        <div className="col-span-12 flex flex-col gap-5 lg:col-span-8">
          <Tabs tabs={TABS} value={tab} onChange={setTab} label="Worker details" />

          <div
            role="tabpanel"
            aria-label={TABS.find((candidate) => candidate.value === tab)?.label}
          >
            {tab === 'overview' ? <OverviewTab worker={worker} /> : null}
            {tab === 'earnings' ? (
              <EarningsTab rows={earnings} period={period} onPeriodChange={setPeriod} />
            ) : null}
            {tab === 'bookings' ? <BookingsTab bookings={bookings} /> : null}
            {tab === 'documents' ? (
              <DocumentsTab
                submissions={documents}
                verificationLabel={verification.label}
                verificationStatus={verification.status}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
