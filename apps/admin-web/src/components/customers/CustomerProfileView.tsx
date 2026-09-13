'use client';

import { ArrowLeft, Building2, CircleSlash, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { bookingStatusPill } from '@/components/bookings/booking-status';
import { Avatar } from '@/components/ui-kit/Avatar';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { LinkButton } from '@/components/ui-kit/LinkButton';
import { Modal } from '@/components/ui-kit/Modal';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { SEED_NOW } from '@/lib/dates';
import { count, relativeTime, rupees } from '@/lib/format';
import type { CustomerProfile } from '@/lib/services';
import { SEGMENT_COPY } from './customer-copy';

const longDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Thirteen weekly counts as a bar strip, with the counts written for screen readers. */
function WeeklyBars({ weeks }: { weeks: number[] }) {
  const max = Math.max(1, ...weeks);
  return (
    <figure aria-label={`Bookings per week over the last 13 weeks: ${weeks.join(', ')}`} className="mt-4">
      <div className="flex h-16 items-end gap-1.5">
        {weeks.map((value, index) => (
          <span
            key={index}
            className={value === 0 ? 'h-1 flex-1 rounded-sm bg-hairline' : 'flex-1 rounded-sm bg-marigold'}
            style={value === 0 ? undefined : { height: `${Math.max(12, (value / max) * 100)}%` }}
          />
        ))}
      </div>
      <figcaption className="mt-1.5 flex justify-between text-pill text-muted">
        <span>13 weeks ago</span>
        <span>This week</span>
      </figcaption>
    </figure>
  );
}

export interface CustomerProfileViewProps {
  profile: CustomerProfile;
  zoneName: string;
  busy: boolean;
  onSuspend: (reason: string) => Promise<void>;
  onReinstate: () => Promise<void>;
}

/**
 * One customer: who they are, how they book, what they have spent, and every job and
 * dispute behind those figures.
 *
 * Suspending is the one action here, and it needs a written reason, because support
 * reads it back to the customer and the CRCS audit log carries it.
 */
export function CustomerProfileView({ profile, zoneName, busy, onSuspend, onReinstate }: CustomerProfileViewProps) {
  const { customer, bookings, disputes, spendByCategory, weeklyBookings } = profile;
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const segment = SEGMENT_COPY[customer.segment];
  const suspended = customer.status === 'SUSPENDED';
  const maxSpend = Math.max(1, ...spendByCategory.map((row) => row.spend));

  async function confirmSuspend(): Promise<void> {
    setError(undefined);
    try {
      await onSuspend(reason);
      setSuspending(false);
      setReason('');
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/customers"
        className="inline-flex w-fit items-center gap-1.5 rounded-sm text-table text-muted hover:text-ink"
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
        All customers
      </Link>

      <div className="grid grid-cols-12 items-start gap-5">
        {/* Identity */}
        <Card className="sticky top-0 col-span-12 flex flex-col p-6 lg:col-span-4">
          <div className="flex items-start gap-4">
            <Avatar name={customer.name} size={72} />
            <div className="min-w-0 pt-1">
              <h2 className="font-display text-card-title font-medium text-ink">{customer.name}</h2>
              {customer.businessName ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-table text-muted">
                  <Building2 size={14} strokeWidth={1.5} aria-hidden />
                  Books for {customer.businessName}
                </p>
              ) : (
                <p className="mt-0.5 text-table text-muted">Household in {zoneName}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusPill status={segment.pill} label={segment.label} />
                {suspended ? <StatusPill status="rejected" label="Suspended" /> : <StatusPill status="verified" label="Can book" />}
              </div>
            </div>
          </div>

          <dl className="mt-5 flex flex-col gap-2 border-t border-hairline pt-4">
            {[
              { label: 'Phone', value: customer.phone, tabular: true },
              { label: 'Email', value: customer.email ?? 'Not given' },
              { label: 'Address', value: customer.address },
              { label: 'Books most in', value: zoneName },
              { label: 'Usually books', value: customer.favouriteCategory ?? 'Nothing yet' },
              { label: 'Customer since', value: longDate(customer.joinedAt) },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4">
                <dt className="flex-none text-table text-muted">{row.label}</dt>
                <dd className={`min-w-0 text-right text-table text-ink ${row.tabular ? 'tabular' : ''}`}>{row.value}</dd>
              </div>
            ))}
          </dl>

          {suspended && customer.suspension ? (
            <div className="mt-5 rounded-tile border border-coral/60 bg-coral/10 p-3">
              <p className="text-table font-medium text-ink">Suspended {relativeTime(customer.suspension.suspendedAt, SEED_NOW)}</p>
              <p className="mt-1 text-pill text-ink">{customer.suspension.reason}</p>
              <p className="mt-1 text-pill text-muted">By {customer.suspension.adminName}</p>
            </div>
          ) : null}

          <div className="mt-5 border-t border-hairline pt-4">
            {suspended ? (
              <Button
                variant="outline"
                icon={<RotateCcw size={16} strokeWidth={1.5} aria-hidden />}
                disabled={busy}
                onClick={() => void onReinstate()}
              >
                Let them book again
              </Button>
            ) : (
              <Button
                variant="danger"
                icon={<CircleSlash size={16} strokeWidth={1.5} aria-hidden />}
                disabled={busy}
                onClick={() => {
                  setError(undefined);
                  setSuspending(true);
                }}
              >
                Suspend bookings
              </Button>
            )}
          </div>
        </Card>

        <div className="col-span-12 flex flex-col gap-5 lg:col-span-8">
          {/* Figures */}
          <Card className="grid grid-cols-2 divide-hairline p-0 sm:grid-cols-4 sm:divide-x">
            {[
              { label: 'Bookings', value: count(customer.bookingCount), note: `${count(customer.completedCount)} finished` },
              { label: 'Cancelled', value: count(customer.cancelledCount), note: 'by either side, or unaccepted' },
              { label: 'Spent', value: rupees(customer.totalSpend), note: 'on finished jobs' },
              {
                label: 'Refunded',
                value: rupees(customer.refunded),
                note: `${count(customer.disputeCount)} ${customer.disputeCount === 1 ? 'dispute' : 'disputes'}`,
              },
            ].map((stat) => (
              <div key={stat.label} className="p-5">
                <p className="text-table text-muted">{stat.label}</p>
                <p className="tabular mt-1 font-display text-card-title font-medium text-ink">{stat.value}</p>
                <p className="mt-0.5 text-pill text-muted">{stat.note}</p>
              </div>
            ))}
          </Card>

          <div className="grid grid-cols-12 gap-5">
            <Card className="col-span-12 p-6 md:col-span-5">
              <SectionHeader title="How often they book" subtitle={segment.meaning} />
              <WeeklyBars weeks={weeklyBookings} />
              <p className="mt-3 text-pill text-muted">
                Last booked{' '}
                {customer.lastBookingAt ? relativeTime(customer.lastBookingAt, SEED_NOW) : 'never'}, first booked{' '}
                {customer.firstBookingAt ? longDate(customer.firstBookingAt) : 'never'}.
              </p>
            </Card>

            <Card className="col-span-12 p-6 md:col-span-7">
              <SectionHeader title="What they spend on" subtitle="Every trade they have booked, and what the finished jobs cost" />
              <ul className="mt-4 flex flex-col gap-3">
                {spendByCategory.map((row) => (
                  <li key={row.category}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-table text-ink">{row.category}</span>
                      <span className="text-pill text-muted">
                        {row.spend > 0 ? (
                          <>
                            <span className="tabular text-ink">{rupees(row.spend)}</span> from{' '}
                          </>
                        ) : (
                          'Nothing finished yet from '
                        )}
                        <span className="tabular">{count(row.bookings)}</span> {row.bookings === 1 ? 'booking' : 'bookings'}
                      </span>
                    </div>
                    <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-pill bg-hairline/70">
                      <span className="block h-full rounded-pill bg-marigold" style={{ width: `${(row.spend / maxSpend) * 100}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Jobs */}
          <Card className="p-0">
            <div className="p-6 pb-4">
              <SectionHeader title="Jobs they booked" subtitle="Newest first, over the last 90 days" />
            </div>
            {bookings.length === 0 ? (
              <EmptyState
                className="px-6 pb-6"
                title="No bookings in the last 90 days"
                description="Their account is older than the booking records kept here. New jobs appear as soon as they book."
                action={<LinkButton href="/dispatch">Open live dispatch</LinkButton>}
              />
            ) : (
              <ul className="flex flex-col border-t border-hairline">
                {bookings.map((booking) => {
                  const pill = bookingStatusPill(booking.status);
                  return (
                    <li
                      key={booking.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-hairline px-5 py-3.5 last:border-b-0"
                    >
                      <span className="tabular text-table font-medium text-ink">{booking.reference}</span>
                      <span className="text-table text-muted">{booking.category}</span>
                      {booking.workerId ? (
                        <Link href={`/workers/${booking.workerId}`} className="text-pill text-muted hover:text-ink hover:underline">
                          {booking.workerName}
                        </Link>
                      ) : (
                        <span className="text-pill text-muted">No worker assigned</span>
                      )}
                      <StatusPill status={pill.status} label={pill.label} className="ml-auto" />
                      <span className="tabular w-20 text-right text-table text-ink">{rupees(booking.amount)}</span>
                      <span className="w-24 text-right text-pill text-muted">{longDate(booking.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Disputes */}
          <Card className="p-6">
            <SectionHeader title="Disputes" subtitle="Raised by this customer, or by a worker about them" />
            {disputes.length === 0 ? (
              <EmptyState
                className="mt-3"
                title="No disputes on record"
                description="Neither this customer nor any worker who served them has raised a ticket."
                action={<LinkButton href="/disputes">Open the dispute queue</LinkButton>}
              />
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-hairline">
                {disputes.map((dispute) => (
                  <li key={dispute.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                    <Link href={`/disputes?id=${dispute.id}`} className="tabular text-table font-medium text-ink hover:underline">
                      {dispute.reference}
                    </Link>
                    <span className="text-table text-ink">{dispute.subject}</span>
                    <span className="text-pill text-muted">
                      raised by {dispute.raisedBy === 'CUSTOMER' ? 'the customer' : dispute.workerName}
                    </span>
                    <StatusPill
                      status={dispute.status === 'RESOLVED' ? 'resolved' : 'pending'}
                      label={dispute.status === 'RESOLVED' ? 'Resolved' : dispute.status === 'OPEN' ? 'Open' : 'Investigating'}
                      className="ml-auto"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={suspending} onClose={() => setSuspending(false)} labelledBy="suspend-title">
        <form
          className="flex flex-col gap-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void confirmSuspend();
          }}
        >
          <div>
            <h2 id="suspend-title" className="font-display text-card-title font-medium text-ink">
              Suspend {customer.name.split(' ')[0]}&rsquo;s bookings
            </h2>
            <p className="mt-1 text-table text-muted">
              They will not be able to book new jobs. Jobs already under way are not affected, and you can let them
              book again at any time.
            </p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-pill font-medium text-muted">Why</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="For example: cancelled after the worker arrived three times this month"
              className="rounded-tile border border-hairline bg-surface px-3 py-2 text-table text-ink placeholder:text-muted"
            />
          </label>
          {error ? (
            <p role="alert" className="text-pill text-ink">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSuspending(false)}>
              Keep them booking
            </Button>
            <Button type="submit" variant="danger" disabled={busy || !reason.trim()}>
              Suspend bookings
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
