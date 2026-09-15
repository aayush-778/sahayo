'use client';

import type { RowSelectionState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';
import type { LedgerAccount, LedgerEntryType, SplitSummary } from '@sahayo/shared';
import { Tabs } from '@/components/ui-kit/Tabs';
import { LedgerTable, shortId, type LedgerFilters } from '@/components/finance/LedgerTable';
import { PayoutsTable, type PayoutView } from '@/components/finance/PayoutsTable';
import { ReversalDialog } from '@/components/finance/ReversalDialog';
import { SplitOverview } from '@/components/finance/SplitOverview';
import { rupees } from '@/lib/format';
import {
  getSplitSummary,
  issueReversal,
  listLedgerRows,
  listPayouts,
  releasePayouts,
  type LedgerRow,
  type PayoutRow,
  type Period,
} from '@/lib/services';

type TabValue = 'ledger' | 'payouts';

const EMPTY_FILTERS: LedgerFilters = { search: '', type: '', party: '', period: '' };

/**
 * The finance hub.
 *
 * The split at the top, the append-only ledger beneath it, and the payout queue in
 * a second tab. Every money movement shown here — a reversal, a released batch —
 * arrives as a new ledger row through the service layer, and every figure is read
 * back from the ledger rather than kept in page state, so the split, the table and
 * the dashboard cannot disagree after a change.
 */
export default function FinancePage() {
  const [period, setPeriod] = useState<Period>('30D');
  const [summary, setSummary] = useState<SplitSummary>();
  const [tab, setTab] = useState<TabValue>('ledger');

  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_FILTERS);
  const [rows, setRows] = useState<LedgerRow[]>();
  const [reversing, setReversing] = useState<LedgerRow>();

  const [payoutView, setPayoutView] = useState<PayoutView>('PENDING');
  const [payouts, setPayouts] = useState<PayoutRow[]>();
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [busy, setBusy] = useState(false);

  const [notice, setNotice] = useState<string>();

  /*
   * A dispute's resolution card links here with ?entry=<id>, which opens the ledger
   * narrowed to that entry. Read from window.location once on mount rather than with
   * useSearchParams, which would force this page behind a Suspense boundary for a
   * value that only matters on arrival.
   */
  useEffect(() => {
    const entry = new URLSearchParams(window.location.search).get('entry');
    if (entry) setFilters({ ...EMPTY_FILTERS, search: entry });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSummary(undefined);
    void getSplitSummary(period).then((value) => {
      if (!cancelled) setSummary(value);
    });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const loadLedger = useCallback(async () => {
    const next = await listLedgerRows({
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.type ? { type: filters.type as LedgerEntryType } : {}),
      ...(filters.party ? { account: filters.party as LedgerAccount } : {}),
      ...(filters.period ? { period: filters.period as Period } : {}),
    });
    setRows(next);
  }, [filters]);

  useEffect(() => {
    setRows(undefined);
    void loadLedger();
  }, [loadLedger]);

  const loadPayouts = useCallback(async () => {
    setPayouts(await listPayouts(payoutView));
  }, [payoutView]);

  useEffect(() => {
    if (tab !== 'payouts') return;
    setPayouts(undefined);
    setSelection({});
    void loadPayouts();
  }, [tab, loadPayouts]);

  const copyTrace = useCallback(async (traceId: string) => {
    try {
      await navigator.clipboard.writeText(traceId);
      setNotice(`Copied trace ID ${traceId}.`);
    } catch {
      setNotice(`Could not reach the clipboard. The trace ID is ${traceId}.`);
    }
  }, []);

  async function confirmReversal(reason: string): Promise<void> {
    if (!reversing) return;
    /* Errors propagate to the dialog, which shows them in place. */
    const reversal = await issueReversal(reversing.entry.id, reason);
    setNotice(
      `Issued reversal ${shortId(reversal.id)} for ${rupees(reversing.entry.amount)}. ` +
        `Entry ${shortId(reversing.entry.id)} is unchanged and now links to it.`,
    );
    setReversing(undefined);
    await Promise.all([loadLedger(), getSplitSummary(period).then(setSummary)]);
  }

  async function releaseBatch(): Promise<void> {
    const ids = Object.keys(selection).filter((id) => selection[id]);
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const result = await releasePayouts(ids);
      const total = result.released.reduce((sum, entry) => sum + entry.amount, 0);
      setNotice(
        result.skipped === 0
          ? `Released ${result.released.length} payouts, ${rupees(total)} in all.`
          : `Released ${result.released.length} payouts, ${rupees(total)} in all. ` +
              `${result.skipped} had already been sent or reversed, so they were left alone.`,
      );
      setSelection({});
      await Promise.all([loadPayouts(), loadLedger()]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SplitOverview summary={summary} period={period} onPeriodChange={setPeriod} />

      <Tabs
        label="Finance records"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'ledger', label: 'Ledger' },
          { value: 'payouts', label: 'Payouts' },
        ]}
      />

      {notice ? (
        <p
          role="status"
          className="rounded-tile border border-hairline bg-marigold-tint/50 px-4 py-2.5 text-table text-ink"
        >
          {notice}
        </p>
      ) : null}

      <div role="tabpanel" aria-label={tab === 'ledger' ? 'Ledger' : 'Payouts'}>
        {tab === 'ledger' ? (
          <LedgerTable
            rows={rows}
            filters={filters}
            onFiltersChange={setFilters}
            onReverse={setReversing}
            onCopyTrace={copyTrace}
          />
        ) : (
          <PayoutsTable
            view={payoutView}
            onViewChange={setPayoutView}
            rows={payouts}
            selection={selection}
            onSelectionChange={setSelection}
            onRelease={releaseBatch}
            onCopyTrace={copyTrace}
            busy={busy}
          />
        )}
      </div>

      <ReversalDialog
        row={reversing}
        onCancel={() => setReversing(undefined)}
        onConfirm={confirmReversal}
      />
    </div>
  );
}
