'use client';

import type { SortingState } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminBooking, Zone } from '@sahayo/shared';
import {
  BookingFilterBar,
  EMPTY_BOOKING_FILTERS,
  type BookingFilterState,
} from '@/components/bookings/BookingFilterBar';
import { BookingDetailView } from '@/components/bookings/BookingDetailView';
import { BookingOverviewRow } from '@/components/bookings/BookingOverviewRow';
import { bookingStatusPill } from '@/components/bookings/booking-status';
import { buildBookingColumns } from '@/components/bookings/bookingColumns';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { DataTable } from '@/components/ui-kit/DataTable';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { LinkButton } from '@/components/ui-kit/LinkButton';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { downloadCsv, toCsv } from '@/lib/csv';
import {
  cancelBooking,
  getBookingDetail,
  getBookingOverview,
  listBookingCategories,
  listBookings,
  listDisputes,
  listZones,
  type BookingDetail,
  type BookingFilter,
  type BookingOverview,
  type BookingStatusGroup,
} from '@/lib/services';

const PERIODS = new Set(['24H', '7D', '30D', '90D']);

function filtersFromParams(params: URLSearchParams): BookingFilterState {
  const period = params.get('period') ?? '';
  return {
    search: params.get('q') ?? '',
    period: (PERIODS.has(period) ? period : EMPTY_BOOKING_FILTERS.period) as BookingFilterState['period'],
    group: params.get('status') ?? '',
    zone: params.get('zone') ?? '',
    category: params.get('trade') ?? '',
  };
}

function paramsFromFilters(filters: BookingFilterState): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('q', filters.search);
  if (filters.period !== EMPTY_BOOKING_FILTERS.period) params.set('period', filters.period);
  if (filters.group) params.set('status', filters.group);
  if (filters.zone) params.set('zone', filters.zone);
  if (filters.category) params.set('trade', filters.category);
  return params.toString();
}

function toServiceFilter(filters: BookingFilterState): BookingFilter {
  return {
    period: filters.period,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.group ? { statusGroup: filters.group as BookingStatusGroup } : {}),
    ...(filters.zone ? { zoneId: filters.zone } : {}),
    ...(filters.category ? { category: filters.category } : {}),
  };
}

/** One booking, opened from the log with ?booking=. */
function BookingDetailSection({ bookingId }: { bookingId: string }) {
  const [detail, setDetail] = useState<BookingDetail | null>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  const load = useCallback(async () => {
    setDetail((await getBookingDetail(bookingId)) ?? null);
  }, [bookingId]);

  useEffect(() => {
    setDetail(undefined);
    setNotice(undefined);
    void load();
  }, [load]);

  if (detail === undefined) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-28 w-full rounded-card" />
        <div className="grid grid-cols-12 gap-5">
          <Skeleton className="col-span-12 h-96 rounded-card lg:col-span-7" />
          <Skeleton className="col-span-12 h-96 rounded-card lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (detail === null) {
    return (
      <EmptyState
        title="No booking with that link"
        description="The link may be mistyped, or it may point at a simulated request from before the demo data was reset. Search the log by reference instead."
        action={<LinkButton href="/bookings">Back to the booking log</LinkButton>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {notice ? (
        <p role="status" className="rounded-tile border border-hairline bg-marigold-tint/50 px-4 py-2.5 text-table text-ink">
          {notice}
        </p>
      ) : null}
      <BookingDetailView
        detail={detail}
        busy={busy}
        onCancel={async (requestedBy, reason) => {
          setBusy(true);
          try {
            await cancelBooking(detail.booking.id, requestedBy, reason);
            await load();
            setNotice(`Cancelled ${detail.booking.reference}. The reason is on its timeline.`);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function BookingsSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking');

  const [filters, setFilters] = useState<BookingFilterState>(EMPTY_BOOKING_FILTERS);
  const [bookings, setBookings] = useState<AdminBooking[]>();
  const [overview, setOverview] = useState<BookingOverview>();
  const [zones, setZones] = useState<Zone[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [disputedIds, setDisputedIds] = useState<ReadonlySet<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    setFilters(filtersFromParams(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  useEffect(() => {
    void Promise.all([listZones(), listBookingCategories()]).then(([zoneList, categoryList]) => {
      setZones(zoneList);
      setCategories(categoryList);
    });
  }, []);

  /* Re-read whenever the log is shown, so a cancellation made on a booking counts. */
  useEffect(() => {
    if (bookingId) return;
    void getBookingOverview().then(setOverview);
    void listDisputes().then((disputes) => setDisputedIds(new Set(disputes.map((dispute) => dispute.bookingId))));
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) return;
    let cancelled = false;
    setBookings(undefined);
    void listBookings(toServiceFilter(filters)).then((rows) => {
      if (!cancelled) setBookings(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [filters, bookingId]);

  function onFiltersChange(next: BookingFilterState): void {
    setFilters(next);
    const query = paramsFromFilters(next);
    router.replace(query ? `/bookings?${query}` : '/bookings', { scroll: false });
  }

  const zoneName = useCallback(
    (zoneId: string) => zones.find((zone) => zone.id === zoneId)?.name ?? 'Unknown zone',
    [zones],
  );
  const columns = useMemo(() => buildBookingColumns({ zoneName, disputedIds }), [zoneName, disputedIds]);

  function exportRows(rows: AdminBooking[]): void {
    downloadCsv(
      'sahayo-bookings',
      toCsv(rows, [
        { header: 'Reference', value: (b) => b.reference },
        { header: 'Requested', value: (b) => b.createdAt },
        { header: 'Customer', value: (b) => b.customerName },
        { header: 'Worker', value: (b) => b.workerName ?? '' },
        { header: 'Trade', value: (b) => b.category },
        { header: 'Zone', value: (b) => zoneName(b.zoneId) },
        /* Rupees, not paise: this file is opened in a spreadsheet by a person. */
        { header: 'Amount (INR)', value: (b) => (b.amount / 100).toFixed(2) },
        { header: 'Status', value: (b) => bookingStatusPill(b.status).label },
        { header: 'Disputed', value: (b) => (disputedIds.has(b.id) ? 'Yes' : 'No') },
        { header: 'Finished', value: (b) => b.completedAt ?? '' },
      ]),
    );
  }

  if (bookingId) return <BookingDetailSection bookingId={bookingId} />;

  return (
    <div className="flex flex-col gap-5">
      <BookingOverviewRow
        overview={overview}
        onShowGroup={(group) => onFiltersChange({ ...EMPTY_BOOKING_FILTERS, group })}
      />

      <BookingFilterBar
        value={filters}
        onChange={onFiltersChange}
        zones={zones}
        categories={categories}
        matchCount={bookings?.length ?? 0}
        onExport={() => exportRows(bookings ?? [])}
      />

      <Card className="overflow-hidden p-0">
        <DataTable
          /*
           * Rows wait for the zone list. The table caches each row's zone name the first
           * time it reads it, so rows shown before the zones arrive would say "Unknown
           * zone" for good.
           */
          data={zones.length ? (bookings ?? []) : []}
          columns={columns}
          caption="Every booking in the chosen period, newest first"
          isLoading={!bookings || zones.length === 0}
          getRowId={(booking) => booking.id}
          sorting={sorting}
          onSortingChange={setSorting}
          onRowClick={(booking) => router.push(`/bookings?booking=${booking.id}`)}
          pageSize={20}
          empty={
            <EmptyState
              className="px-5 py-6"
              title="No bookings match these filters"
              description="No job in the chosen period matches the search and filters above."
              action={
                <Button variant="outline" size="sm" onClick={() => onFiltersChange({ ...EMPTY_BOOKING_FILTERS, period: '90D' })}>
                  Show all 90 days
                </Button>
              }
            />
          }
        />
      </Card>
    </div>
  );
}

/**
 * The booking log, and one booking's full record at ?booking=.
 *
 * The record lives on this route rather than its own, so the page the offline service
 * worker precaches opens any of the twelve thousand bookings, and the "View booking"
 * links across the portal land here.
 */
export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-5">
          <Skeleton className="h-56 w-full rounded-card" />
          <Skeleton className="h-96 w-full rounded-card" />
        </div>
      }
    >
      <BookingsSection />
    </Suspense>
  );
}
