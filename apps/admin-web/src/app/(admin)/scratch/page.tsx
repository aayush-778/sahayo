'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui-kit/Card';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import {
  approveKyc,
  getFundTotals,
  getSplitSummary,
  listAadhaarAccessLog,
  listBookings,
  listDisputes,
  listKycQueue,
  listLedger,
  listLoanRequests,
  listProposals,
  listWorkers,
  listZones,
} from '@/lib/services';

/**
 * A temporary probe route, not a feature page.
 *
 * It exists to satisfy the Phase 1 gate: every collection is reachable through
 * the service layer and nothing else, the counts are what the seed promised, and
 * approving the same submission twice is idempotent. Note what it does NOT do —
 * it never imports the store or the seed, because eslint will not let it, which
 * is the point being demonstrated.
 *
 * DELETE THIS ROUTE in Phase 2, when /dashboard reads the same services for real.
 */

interface Row {
  label: string;
  value: string;
  note?: string;
}

export default function ScratchPage() {
  const [rows, setRows] = useState<Row[] | undefined>();
  const [checks, setChecks] = useState<Row[] | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function probe(): Promise<void> {
      const [
        zones,
        workers,
        bookings,
        ledger,
        disputes,
        proposals,
        loans,
        kyc,
        accessLog,
        split,
        fund,
      ] = await Promise.all([
        listZones(),
        listWorkers(),
        listBookings(),
        listLedger(),
        listDisputes(),
        listProposals(),
        listLoanRequests(),
        listKycQueue(),
        listAadhaarAccessLog(),
        getSplitSummary('ALL'),
        getFundTotals(),
      ]);

      if (cancelled) return;

      setRows([
        { label: 'Zones', value: String(zones.length), note: 'Patna operating areas' },
        { label: 'Workers', value: String(workers.length), note: 'cooperative members' },
        { label: 'Bookings', value: String(bookings.length), note: 'over 90 days' },
        { label: 'Ledger entries', value: String(ledger.length), note: 'append-only' },
        { label: 'Disputes', value: String(disputes.length), note: 'both origins' },
        { label: 'Proposals', value: String(proposals.length), note: 'fund governance' },
        { label: 'Loan requests', value: String(loans.length), note: 'micro-loan queue' },
        { label: 'KYC queue', value: String(kyc.length), note: 'awaiting review' },
        {
          label: 'Aadhaar access log',
          value: String(accessLog.length),
          note: 'empty until a reveal happens',
        },
      ]);

      /* The two invariants the gate names, checked live rather than asserted. */
      const sums = split.worker + split.platform + split.coopFund === split.gross;

      const first = kyc[0];
      let idempotent = 'no submission to test';
      if (first) {
        const once = await approveKyc(first.submission.id);
        const twice = await approveKyc(first.submission.id);
        idempotent =
          once.id === twice.id && once.workerId === twice.workerId
            ? 'yes, twice is the same as once and neither threw'
            : 'NO — the second call changed something';
      }

      if (cancelled) return;

      setChecks([
        {
          label: 'Split sums to gross',
          value: sums ? 'exact' : 'MISMATCH',
          note: `${split.bookingCount} completed bookings, to the paisa`,
        },
        { label: 'approveKyc is idempotent', value: idempotent },
        {
          label: 'Fund balance',
          value: `₹${Math.round(fund.balance / 100).toLocaleString('en-IN')}`,
          note: `${fund.memberCount} members hold a share`,
        },
      ]);
    }

    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card className="p-6">
        <SectionHeader
          title="Seed collections"
          subtitle="Read through the service layer. This route cannot import the store or the seed."
        />
        <dl className="mt-5 flex flex-col">
          {rows
            ? rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 border-t border-hairline py-2.5 first:border-t-0"
                >
                  <dt className="text-body text-ink">{row.label}</dt>
                  <dd className="flex items-baseline gap-3">
                    {row.note ? <span className="text-pill text-muted">{row.note}</span> : null}
                    <span className="tabular font-display text-card-title font-medium text-ink">
                      {row.value}
                    </span>
                  </dd>
                </div>
              ))
            : <Skeleton lines={9} />}
        </dl>
      </Card>

      <Card className="p-6">
        <SectionHeader title="Gate checks" subtitle="The invariants Phase 1 has to hold." />
        <dl className="mt-5 flex flex-col">
          {checks
            ? checks.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 border-t border-hairline py-2.5 first:border-t-0"
                >
                  <dt className="text-body text-ink">{row.label}</dt>
                  <dd className="flex items-baseline gap-3">
                    {row.note ? <span className="text-pill text-muted">{row.note}</span> : null}
                    <span className="text-table text-ink">{row.value}</span>
                  </dd>
                </div>
              ))
            : <Skeleton lines={3} />}
        </dl>
      </Card>
    </div>
  );
}
