'use client';

import Link from 'next/link';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { count } from '@/lib/format';
import type { ZoneDemandPoint } from '@/lib/services';
import { ZoneHexCanvas } from './ZoneHexCanvas';

/**
 * The dashboard's card around the zone honeycomb, plus the thin-cover list.
 *
 * The honeycomb itself lives in ZoneHexCanvas, which the dispatch page reuses as
 * its offline fallback. Keeping the card and the map separate is what lets the
 * fallback look like the map a viewer already recognises.
 */
export function ZoneHexMap({ zones }: { zones?: ZoneDemandPoint[] }) {
  const underserved = (zones ?? []).filter((zone) => zone.underserved).slice(0, 3);

  return (
    <Card className="col-span-12 flex flex-col p-6 lg:col-span-7">
      <SectionHeader
        title="Where orders are coming from"
        subtitle="The twelve zones Sahayo covers in Patna"
      />

      <div className="mt-4">
        {zones ? <ZoneHexCanvas zones={zones} /> : <Skeleton className="h-40 w-full" />}
      </div>

      {/* Zones where cover is thin, and a way to act on it. */}
      <div className="mt-5 border-t border-hairline pt-4">
        <p className="text-table font-medium text-ink">Zones where cover is thin</p>
        {zones && underserved.length === 0 ? (
          <EmptyState
            className="mt-1"
            title="Every zone has enough workers this week"
            description="Orders and available workers are in balance across all twelve zones. Check back after a demand spike."
          />
        ) : (
          <ul className="mt-2 flex flex-col">
            {(zones ? underserved : [undefined, undefined, undefined]).map((zone, index) => (
              <li
                key={zone?.zoneId ?? index}
                className="flex items-center justify-between gap-4 border-t border-hairline py-2.5 first:border-t-0"
              >
                {zone ? (
                  <>
                    <span className="text-table text-ink">{zone.zoneName}</span>
                    <span className="flex items-baseline gap-3">
                      <span className="text-pill text-muted">
                        <span className="tabular text-ink">{count(zone.orderCount)}</span> orders
                        against{' '}
                        <span className="tabular text-ink">{count(zone.availableWorkerCount)}</span>{' '}
                        workers free
                      </span>
                      <Link
                        href={`/dispatch?zone=${zone.zoneId}`}
                        className="rounded-sm text-pill font-medium text-ink underline decoration-hairline underline-offset-2 hover:decoration-ink"
                      >
                        View in dispatch
                      </Link>
                    </span>
                  </>
                ) : (
                  <Skeleton />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
