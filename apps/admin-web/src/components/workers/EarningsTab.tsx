'use client';

import { COOP_FUND_SHARE, PLATFORM_SHARE, WORKER_SHARE } from '@sahayo/shared';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { count, percent, rupees } from '@/lib/format';
import { summariseEarnings, type Period, type WorkerEarning } from '@/lib/services';

const PERIODS = [
  { value: '7D' as const, label: '7 days' },
  { value: '30D' as const, label: '30 days' },
  { value: '90D' as const, label: '90 days' },
  /*
   * "All recorded", not "All". The booking records cover the last 90 days; the
   * lifetime totals on the identity panel go back to the day the worker joined.
   * Labelling this "All" would make the two look like they contradict each other.
   */
  { value: 'ALL' as const, label: 'All recorded' },
];

export interface EarningsTabProps {
  rows?: WorkerEarning[];
  period: Period;
  onPeriodChange: (period: Period) => void;
}

/**
 * The Earnings tab: one row per completed job, showing where its money went.
 *
 * The three shares come from the shared constants, never written as literals, so
 * the percentages in the header are the ones the platform actually applies. Each
 * row's three figures sum to that row's gross exactly.
 */
export function EarningsTab({ rows, period, onPeriodChange }: EarningsTabProps) {
  const totals = rows ? summariseEarnings(rows) : undefined;

  return (
    <Card className="p-0">
      <div className="p-6 pb-4">
        <SectionHeader
          title="Earnings"
          subtitle="Every finished job, and the three ways its payment was split"
          action={
            <SegmentedToggle
              label="Earnings period"
              options={PERIODS}
              value={period}
              onChange={onPeriodChange}
            />
          }
        />

        {totals ? (
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <dt className="text-pill text-muted">Customers paid</dt>
              <dd className="tabular font-display text-card-title font-medium text-ink">
                {rupees(totals.gross)}
              </dd>
            </div>
            <div>
              <dt className="text-pill text-muted">
                To this worker ({percent(WORKER_SHARE)})
              </dt>
              <dd className="tabular font-display text-card-title font-medium text-ink">
                {rupees(totals.workerShare)}
              </dd>
            </div>
            <div>
              <dt className="text-pill text-muted">
                To run the platform ({percent(PLATFORM_SHARE)})
              </dt>
              <dd className="tabular font-display text-card-title font-medium text-muted">
                {rupees(totals.platformShare)}
              </dd>
            </div>
            <div>
              <dt className="text-pill text-muted">
                To the fund ({percent(COOP_FUND_SHARE)})
              </dt>
              <dd className="tabular font-display text-card-title font-medium text-fund-green">
                {rupees(totals.coopFundShare)}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="mt-5">
            <Skeleton lines={2} />
          </div>
        )}
      </div>

      {!rows ? (
        <div className="px-6 pb-6">
          <Skeleton lines={6} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          className="px-6 pb-6"
          title="No finished jobs in this period"
          description="Widen the period above, or check the Bookings tab for work that is still in progress."
        />
      ) : (
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full border-collapse text-table">
            <caption className="sr-only">
              Earnings per job, with the worker, platform and cooperative fund shares
            </caption>
            <thead>
              <tr className="border-b border-hairline">
                {['Job', 'Finished', 'Customer', 'Paid', 'Worker', 'Platform', 'Fund'].map(
                  (header, index) => (
                    <th
                      key={header}
                      scope="col"
                      className={`px-5 py-3 text-pill font-semibold uppercase tracking-[0.04em] text-muted ${
                        index >= 3 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.bookingId} className="border-b border-hairline last:border-b-0">
                  <td className="tabular px-5 py-3 text-ink">{row.reference}</td>
                  <td className="px-5 py-3 text-muted">
                    {new Date(row.completedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
                  <td className="px-5 py-3 text-muted">{row.customerName}</td>
                  <td className="tabular px-5 py-3 text-right text-ink">{rupees(row.gross)}</td>
                  <td className="tabular px-5 py-3 text-right text-ink">
                    {rupees(row.workerShare)}
                  </td>
                  <td className="tabular px-5 py-3 text-right text-muted">
                    {rupees(row.platformShare)}
                  </td>
                  <td className="tabular px-5 py-3 text-right text-fund-green">
                    {rupees(row.coopFundShare)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-hairline px-5 py-3 text-pill text-muted">
            <span className="tabular">{count(rows.length)}</span> finished jobs. Every row&rsquo;s
            three shares add up to what the customer paid, to the paisa. Job records cover the last
            90 days; the lifetime totals beside them go back to the day this worker joined.
          </p>
        </div>
      )}
    </Card>
  );
}
