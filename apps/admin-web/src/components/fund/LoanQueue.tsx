'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LoanStatus, type LoanRequest } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { DataTable } from '@/components/ui-kit/DataTable';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { rupees } from '@/lib/format';
import { Modal } from './Modal';

export interface LoanQueueProps {
  loans?: LoanRequest[];
  headroom?: number;
  busy: boolean;
  onApprove: (loan: LoanRequest) => void;
  onReject: (loan: LoanRequest, reason: string) => Promise<void>;
}

/**
 * Members asking to borrow from the fund.
 *
 * Each request shows what the member has put into the fund over the years and what they
 * still owe, because those are what a fair decision weighs. The lending headroom sits
 * above the table: the fund lends against only part of its balance, so there is always
 * money for the things the members voted to pay for.
 */
export function LoanQueue({ loans, headroom, busy, onApprove, onReject }: LoanQueueProps) {
  const [rejecting, setRejecting] = useState<LoanRequest>();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();

  const pending = useMemo(() => (loans ?? []).filter((loan) => loan.status === LoanStatus.PENDING), [loans]);
  const decided = useMemo(() => (loans ?? []).filter((loan) => loan.status !== LoanStatus.PENDING), [loans]);

  const columns = useMemo<ColumnDef<LoanRequest>[]>(
    () => [
      {
        id: 'worker',
        accessorFn: (loan) => loan.workerName,
        header: 'Member',
        cell: ({ row }) => <span className="font-medium text-ink">{row.original.workerName}</span>,
      },
      {
        id: 'amount',
        accessorFn: (loan) => loan.amount,
        header: 'Asks for',
        cell: ({ row }) => {
          const over = headroom !== undefined && row.original.amount > headroom;
          return (
            <span className="block text-right">
              <span className="tabular text-ink">{rupees(row.original.amount)}</span>
              {over ? <span className="block text-pill text-muted">More than the fund can lend now</span> : null}
            </span>
          );
        },
      },
      {
        id: 'purpose',
        accessorFn: (loan) => loan.purpose,
        header: 'For',
        enableSorting: false,
        cell: ({ row }) => <span className="text-ink">{row.original.purpose}</span>,
      },
      {
        id: 'plan',
        accessorFn: (loan) => loan.repaymentMonths,
        header: 'Paying back',
        cell: ({ row }) => <span className="text-muted">{row.original.repaymentPlan}</span>,
      },
      {
        id: 'contributed',
        accessorFn: (loan) => loan.lifetimeContribution,
        header: 'Put into the fund',
        cell: ({ row }) => (
          <span className="tabular block text-right text-fund-green">{rupees(row.original.lifetimeContribution)}</span>
        ),
      },
      {
        id: 'outstanding',
        accessorFn: (loan) => loan.outstanding,
        header: 'Still owes',
        cell: ({ row }) =>
          row.original.outstanding > 0 ? (
            <span className="tabular block text-right text-ink">{rupees(row.original.outstanding)}</span>
          ) : (
            <span className="block text-right text-muted">Nothing</span>
          ),
      },
      {
        id: 'decide',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const loan = row.original;
          const over = headroom !== undefined && loan.amount > headroom;
          return (
            <span className="flex justify-end gap-2">
              <Button
                variant="danger"
                size="sm"
                icon={<X size={14} strokeWidth={1.5} aria-hidden />}
                onClick={() => {
                  setReason('');
                  setError(undefined);
                  setRejecting(loan);
                }}
                disabled={busy}
              >
                Decline
              </Button>
              <Button
                variant="approve"
                size="sm"
                icon={<Check size={14} strokeWidth={1.5} aria-hidden />}
                onClick={() => onApprove(loan)}
                disabled={busy || over}
              >
                Lend {rupees(loan.amount)}
              </Button>
            </span>
          );
        },
      },
    ],
    [busy, headroom, onApprove],
  );

  async function confirmReject(): Promise<void> {
    if (!rejecting) return;
    setError(undefined);
    try {
      await onReject(rejecting, reason);
      setRejecting(undefined);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 p-6 pb-4">
        <SectionHeader title="Members asking to borrow" subtitle="Small loans from the fund, repaid with no interest" />
        <div className="text-right">
          <p className="text-pill text-muted">The fund can lend up to</p>
          <p className="tabular font-display text-stat font-medium text-ink">
            {headroom === undefined ? '…' : rupees(headroom)}
          </p>
        </div>
      </div>

      <DataTable
        data={pending}
        columns={columns}
        caption="Loan requests waiting for a decision"
        isLoading={!loans}
        getRowId={(loan) => loan.id}
        pageSize={8}
        note="Lending stops at part of the fund's balance, so there is always money for the programmes members have voted for."
        empty={
          <EmptyState
            className="px-5 py-6"
            title="Nobody is waiting on a loan"
            description="New requests arrive from the worker app. Decisions already made are listed below."
          />
        }
      />

      {decided.length > 0 ? (
        <div className="border-t border-hairline px-6 py-4">
          <p className="text-pill font-medium text-muted">Decided recently</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {decided.map((loan) => (
              <li key={loan.id} className="flex flex-wrap items-baseline justify-between gap-2 text-table">
                <span className="text-ink">
                  {loan.workerName} · <span className="tabular">{rupees(loan.amount)}</span> for {loan.purpose.toLowerCase()}
                </span>
                <span className="flex items-baseline gap-2">
                  {loan.rejectionReason ? <span className="text-pill text-muted">{loan.rejectionReason}</span> : null}
                  <StatusPill
                    status={loan.status === LoanStatus.DISBURSED ? 'verified' : 'rejected'}
                    label={loan.status === LoanStatus.DISBURSED ? 'Lent' : 'Declined'}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(undefined)} labelledBy="decline-title">
        {rejecting ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void confirmReject();
            }}
            className="flex flex-col gap-4 p-6"
          >
            <div>
              <h2 id="decline-title" className="font-display text-card-title font-medium text-ink">
                Decline {rejecting.workerName.split(' ')[0]}&rsquo;s request
              </h2>
              <p className="mt-1 text-table text-muted">
                {rupees(rejecting.amount)} for {rejecting.purpose.toLowerCase()}. They will be told why, and can ask again.
              </p>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-pill font-medium text-muted">Why</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                required
                placeholder="For example: please finish repaying the earlier loan first"
                className="rounded-tile border border-hairline bg-surface px-3 py-2 text-table text-ink placeholder:text-muted"
              />
            </label>
            {error ? (
              <p role="alert" className="text-pill text-ink">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejecting(undefined)}>
                Keep it waiting
              </Button>
              <Button type="submit" variant="danger" disabled={!reason.trim()}>
                Decline and tell them why
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </Card>
  );
}
