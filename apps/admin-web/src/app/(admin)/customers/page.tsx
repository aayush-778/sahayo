'use client';

import type { SortingState } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { CustomerSegment, CustomerStatus, CustomerSummary, CustomerType, Zone } from '@sahayo/shared';
import {
  CustomerFilterBar,
  EMPTY_CUSTOMER_FILTERS,
  type CustomerFilterState,
} from '@/components/customers/CustomerFilterBar';
import { CustomerOverviewRow } from '@/components/customers/CustomerOverviewRow';
import { CustomerProfileView } from '@/components/customers/CustomerProfileView';
import { SEGMENT_COPY } from '@/components/customers/customer-copy';
import { buildCustomerColumns } from '@/components/customers/customerColumns';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { DataTable } from '@/components/ui-kit/DataTable';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { LinkButton } from '@/components/ui-kit/LinkButton';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { downloadCsv, toCsv } from '@/lib/csv';
import {
  getCustomerOverview,
  getCustomerProfile,
  listCustomers,
  listZones,
  reinstateCustomer,
  suspendCustomer,
  type CustomerFilter,
  type CustomerOverview,
  type CustomerProfile,
} from '@/lib/services';

function filtersFromParams(params: URLSearchParams): CustomerFilterState {
  return {
    search: params.get('q') ?? '',
    zone: params.get('zone') ?? '',
    segment: params.get('segment') ?? '',
    type: params.get('type') ?? '',
    status: params.get('status') ?? '',
  };
}

function paramsFromFilters(filters: CustomerFilterState): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('q', filters.search);
  if (filters.zone) params.set('zone', filters.zone);
  if (filters.segment) params.set('segment', filters.segment);
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  return params.toString();
}

function toServiceFilter(filters: CustomerFilterState): CustomerFilter {
  return {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.zone ? { zoneId: filters.zone } : {}),
    ...(filters.segment ? { segment: filters.segment as CustomerSegment } : {}),
    ...(filters.type ? { type: filters.type as CustomerType } : {}),
    ...(filters.status ? { status: filters.status as CustomerStatus } : {}),
  };
}

/** One customer's profile, opened from the directory with ?id=. */
function CustomerDetail({ customerId, zones }: { customerId: string; zones: Zone[] }) {
  const [profile, setProfile] = useState<CustomerProfile | null>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  const load = useCallback(async () => {
    setProfile((await getCustomerProfile(customerId)) ?? null);
  }, [customerId]);

  useEffect(() => {
    setProfile(undefined);
    setNotice(undefined);
    void load();
  }, [load]);

  if (profile === undefined) {
    return (
      <div className="grid grid-cols-12 gap-5">
        <Skeleton className="col-span-12 h-96 rounded-card lg:col-span-4" />
        <Skeleton className="col-span-12 h-96 rounded-card lg:col-span-8" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <EmptyState
        title="No customer with that link"
        description="The account may have been removed, or the link may be mistyped. Search the directory by name or phone instead."
        action={<LinkButton href="/customers">Back to the directory</LinkButton>}
      />
    );
  }

  const zoneName = zones.find((zone) => zone.id === profile.customer.zoneId)?.name ?? 'an unknown zone';

  return (
    <div className="flex flex-col gap-5">
      {notice ? (
        <p role="status" className="rounded-tile border border-hairline bg-marigold-tint/50 px-4 py-2.5 text-table text-ink">
          {notice}
        </p>
      ) : null}
      <CustomerProfileView
        profile={profile}
        zoneName={zoneName}
        busy={busy}
        onSuspend={async (reason) => {
          setBusy(true);
          try {
            await suspendCustomer(profile.customer.id, reason);
            await load();
            setNotice(`Suspended ${profile.customer.name}'s bookings. The reason is on their profile and in the audit log.`);
          } finally {
            setBusy(false);
          }
        }}
        onReinstate={async () => {
          setBusy(true);
          try {
            await reinstateCustomer(profile.customer.id);
            await load();
            setNotice(`${profile.customer.name} can book again.`);
          } catch (error) {
            setNotice((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function CustomersSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('id');

  const [filters, setFilters] = useState<CustomerFilterState>(EMPTY_CUSTOMER_FILTERS);
  const [customers, setCustomers] = useState<CustomerSummary[]>();
  const [overview, setOverview] = useState<CustomerOverview>();
  const [zones, setZones] = useState<Zone[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'lastBookingAt', desc: true }]);

  useEffect(() => {
    setFilters(filtersFromParams(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  useEffect(() => {
    void listZones().then(setZones);
  }, []);

  /* The overview is re-read whenever the directory is shown, so a suspension made on a profile counts. */
  useEffect(() => {
    if (customerId) return;
    void getCustomerOverview().then(setOverview);
  }, [customerId]);

  useEffect(() => {
    if (customerId) return;
    let cancelled = false;
    setCustomers(undefined);
    void listCustomers(toServiceFilter(filters)).then((rows) => {
      if (!cancelled) setCustomers(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [filters, customerId]);

  function onFiltersChange(next: CustomerFilterState): void {
    setFilters(next);
    const query = paramsFromFilters(next);
    router.replace(query ? `/customers?${query}` : '/customers', { scroll: false });
  }

  const zoneName = useCallback(
    (zoneId: string) => zones.find((zone) => zone.id === zoneId)?.name ?? 'Unknown zone',
    [zones],
  );
  const columns = useMemo(() => buildCustomerColumns({ zoneName }), [zoneName]);

  function exportRows(rows: CustomerSummary[]): void {
    downloadCsv(
      'sahayo-customers',
      toCsv(rows, [
        { header: 'Name', value: (c) => c.name },
        { header: 'Business', value: (c) => c.businessName ?? '' },
        { header: 'Phone', value: (c) => c.phone },
        { header: 'Email', value: (c) => c.email ?? '' },
        { header: 'Zone', value: (c) => zoneName(c.zoneId) },
        { header: 'Pattern', value: (c) => SEGMENT_COPY[c.segment].label },
        { header: 'Bookings', value: (c) => c.bookingCount },
        { header: 'Cancelled', value: (c) => c.cancelledCount },
        /* Rupees, not paise: this file is opened in a spreadsheet by a person. */
        { header: 'Spent (INR)', value: (c) => (c.totalSpend / 100).toFixed(2) },
        { header: 'Refunded (INR)', value: (c) => (c.refunded / 100).toFixed(2) },
        { header: 'Last booked', value: (c) => (c.lastBookingAt ?? '').slice(0, 10) },
        { header: 'Disputes', value: (c) => c.disputeCount },
        { header: 'Account', value: (c) => (c.status === 'SUSPENDED' ? 'Suspended' : 'Can book') },
        { header: 'Customer since', value: (c) => c.joinedAt.slice(0, 10) },
      ]),
    );
  }

  if (customerId) return <CustomerDetail customerId={customerId} zones={zones} />;

  return (
    <div className="flex flex-col gap-5">
      <CustomerOverviewRow
        overview={overview}
        onShowSegment={(segment) => onFiltersChange({ ...EMPTY_CUSTOMER_FILTERS, segment })}
      />

      <CustomerFilterBar
        value={filters}
        onChange={onFiltersChange}
        zones={zones}
        matchCount={customers?.length ?? 0}
        onExport={() => exportRows(customers ?? [])}
      />

      <Card className="overflow-hidden p-0">
        <DataTable
          /*
           * Rows wait for the zone list. The table caches each row's zone name the first
           * time it reads it, so rows shown before the zones arrive would say "Unknown
           * zone" for good.
           */
          data={zones.length ? (customers ?? []) : []}
          columns={columns}
          caption="Every customer who has booked work, most recently active first"
          isLoading={!customers || zones.length === 0}
          getRowId={(customer) => customer.id}
          sorting={sorting}
          onSortingChange={setSorting}
          onRowClick={(customer) => router.push(`/customers?id=${customer.id}`)}
          pageSize={15}
          empty={
            <EmptyState
              className="px-5 py-6"
              title="No customers match these filters"
              description="No customer matches the search and filters above."
              action={
                <Button variant="outline" size="sm" onClick={() => onFiltersChange(EMPTY_CUSTOMER_FILTERS)}>
                  Clear filters
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
 * The customer section: the directory, and a customer's profile at ?id=.
 *
 * The profile lives on this route rather than its own, so the single page the offline
 * service worker precaches opens every one of the two thousand customers.
 */
export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-5">
          <Skeleton className="h-56 w-full rounded-card" />
          <Skeleton className="h-96 w-full rounded-card" />
        </div>
      }
    >
      <CustomersSection />
    </Suspense>
  );
}
