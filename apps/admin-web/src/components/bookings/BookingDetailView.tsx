'use client';

import { ArrowLeft, Ban, Radio } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { LedgerDirection } from '@sahayo/shared';
import { TicketTimeline } from '@/components/disputes/TicketTimeline';
import { Avatar } from '@/components/ui-kit/Avatar';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { LinkButton } from '@/components/ui-kit/LinkButton';
import { Modal } from '@/components/ui-kit/Modal';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { rupees } from '@/lib/format';
import type { BookingDetail, CancellationRequester } from '@/lib/services';
import { bookingStatusPill } from './booking-status';
import { bookingStamp } from './bookingColumns';

const LEDGER_LABEL: Record<string, string> = {
  WORKER_PAYOUT: 'Paid to the worker',
  PLATFORM_FEE: 'Platform fee',
  COOP_FUND_CONTRIBUTION: 'To the cooperative fund',
  PAYOUT_RELEASE: "Sent to the worker's bank",
  REFUND: 'Refund',
  ADJUSTMENT: 'Reversal',
};

const REQUESTERS = [
  { value: 'CUSTOMER' as const, label: 'The customer' },
  { value: 'WORKER' as const, label: 'The worker' },
];

export interface BookingDetailViewProps {
  detail: BookingDetail;
  busy: boolean;
  onCancel: (requestedBy: CancellationRequester, reason: string) => Promise<void>;
}

/**
 * One job, everything that touched it: the timeline from request to payment, the two
 * people involved, every ledger row that mentions it, and any dispute about it.
 *
 * The only action is cancelling a job that has not finished. A finished job is never
 * edited here; it is corrected through a dispute, which posts new ledger rows.
 */
export function BookingDetailView({ detail, busy, onCancel }: BookingDetailViewProps) {
  const { booking, customer, worker, timeline, ledger, dispute, cancellable, zoneName } = detail;
  const pill = bookingStatusPill(booking.status);
  const [cancelling, setCancelling] = useState(false);
  const [requestedBy, setRequestedBy] = useState<CancellationRequester>('CUSTOMER');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();

  async function confirmCancel(): Promise<void> {
    setError(undefined);
    try {
      await onCancel(requestedBy, reason);
      setCancelling(false);
      setReason('');
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/bookings" className="inline-flex w-fit items-center gap-1.5 rounded-sm text-table text-muted hover:text-ink">
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
        All bookings
      </Link>

      <Card className="flex flex-wrap items-center gap-x-8 gap-y-3 p-6">
        <div>
          <p className="text-table text-muted">
            {booking.category} in {zoneName}
          </p>
          <h2 className="tabular mt-0.5 font-display text-page-title font-medium text-ink">{booking.reference}</h2>
        </div>
        <div>
          <p className="text-table text-muted">Customer pays</p>
          <p className="tabular mt-0.5 font-display text-stat font-medium text-ink">{rupees(booking.amount)}</p>
        </div>
        <div>
          <p className="text-table text-muted">Requested</p>
          <p className="mt-0.5 text-body text-ink">{bookingStamp(booking.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill status={pill.status} label={pill.label} />
          {dispute ? <StatusPill status="rejected" label="Disputed" /> : null}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {cancellable ? (
            <>
              <LinkButton href={`/dispatch?zone=${booking.zoneId}`}>
                <Radio size={14} strokeWidth={1.5} aria-hidden />
                Watch in live dispatch
              </LinkButton>
              <Button
                variant="danger"
                size="sm"
                icon={<Ban size={14} strokeWidth={1.5} aria-hidden />}
                disabled={busy}
                onClick={() => {
                  setError(undefined);
                  setCancelling(true);
                }}
              >
                Cancel booking
              </Button>
            </>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-12 items-start gap-5">
        <Card className="col-span-12 p-6 lg:col-span-7">
          <SectionHeader title="What happened" subtitle="From the request to the payment, oldest first" />
          <div className="mt-5">
            <TicketTimeline nodes={timeline} />
          </div>
        </Card>

        <div className="col-span-12 flex flex-col gap-5 lg:col-span-5">
          <Card className="p-6">
            <SectionHeader title="Who was involved" />
            <ul className="mt-4 flex flex-col divide-y divide-hairline">
              <li className="flex items-center gap-3 pb-3">
                <Avatar name={booking.customerName} size={40} />
                <div className="min-w-0 flex-1">
                  <Link href={`/customers?id=${booking.customerId}`} className="text-table font-medium text-ink hover:underline">
                    {booking.customerName}
                  </Link>
                  <p className="text-pill text-muted">
                    Customer{customer?.businessName ? ` for ${customer.businessName}` : ''}
                    {customer ? <span className="tabular"> · {customer.phone}</span> : null}
                  </p>
                </div>
                {customer?.status === 'SUSPENDED' ? <StatusPill status="rejected" label="Suspended" /> : null}
              </li>
              <li className="flex items-center gap-3 pt-3">
                {worker ? (
                  <>
                    <Avatar name={worker.name} src={worker.avatarUrl} size={40} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/workers/${worker.id}`} className="text-table font-medium text-ink hover:underline">
                        {worker.name}
                      </Link>
                      <p className="text-pill text-muted">
                        Worker · rated <span className="tabular">{worker.rating.toFixed(1)}</span>
                        <span className="tabular"> · {worker.phone}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-table text-muted">No worker has taken this job.</p>
                )}
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <SectionHeader title="Money" subtitle="Every ledger row for this booking. Rows are never edited." />
            {ledger.length === 0 ? (
              <p className="mt-3 text-table text-muted">
                No money has moved. Payment is split and posted to the ledger when the job is finished.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-hairline">
                {ledger.map((entry) => (
                  <li key={entry.id} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <Link href={`/finance?entry=${entry.id}`} className="text-table text-ink hover:underline">
                        {LEDGER_LABEL[entry.type] ?? entry.type}
                      </Link>
                      <span className="block text-pill text-muted">{bookingStamp(entry.createdAt)}</span>
                    </span>
                    <span className="tabular text-table text-ink">
                      {entry.direction === LedgerDirection.DEBIT ? '−' : ''}
                      {rupees(entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {dispute ? (
            <Card className="p-6">
              <SectionHeader title="Dispute" subtitle={`${dispute.reference}, raised by the ${dispute.raisedBy === 'CUSTOMER' ? 'customer' : 'worker'}`} />
              <p className="mt-3 text-table text-ink">{dispute.subject}</p>
              <p className="mt-1 text-pill text-muted">
                {dispute.status === 'RESOLVED' ? 'Resolved' : dispute.status === 'OPEN' ? 'Waiting for a reply' : 'Being investigated'}
              </p>
              <LinkButton href={`/disputes?id=${dispute.id}`} className="mt-4">
                Open the ticket
              </LinkButton>
            </Card>
          ) : null}
        </div>
      </div>

      <Modal open={cancelling} onClose={() => setCancelling(false)} labelledBy="cancel-booking-title">
        <form
          className="flex flex-col gap-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void confirmCancel();
          }}
        >
          <div>
            <h2 id="cancel-booking-title" className="font-display text-card-title font-medium text-ink">
              Cancel {booking.reference}
            </h2>
            <p className="mt-1 text-table text-muted">
              No money has moved on this job, so nothing is posted to the ledger. The cancellation and your reason are
              added to its timeline.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-pill font-medium text-muted">Who asked to cancel</span>
            <SegmentedToggle label="Who asked to cancel" options={REQUESTERS} value={requestedBy} onChange={setRequestedBy} />
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-pill font-medium text-muted">Why</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="For example: the customer called to say they are no longer at home"
              className="rounded-tile border border-hairline bg-surface px-3 py-2 text-table text-ink placeholder:text-muted"
            />
          </label>
          {error ? (
            <p role="alert" className="text-pill text-ink">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelling(false)}>
              Keep the booking
            </Button>
            <Button type="submit" variant="danger" disabled={busy || !reason.trim()}>
              Cancel booking
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
