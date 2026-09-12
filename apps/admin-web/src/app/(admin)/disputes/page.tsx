'use client';

import { useCallback, useEffect, useState } from 'react';
import { DisputeOrigin, DisputeStatus, type Dispute, type DisputeOutcome } from '@sahayo/shared';
import { DisputeList, type DisputeTab } from '@/components/disputes/DisputeList';
import { ResolveDialog } from '@/components/disputes/ResolveDialog';
import { TicketPane } from '@/components/disputes/TicketPane';
import { rupees } from '@/lib/format';
import {
  countDisputesByOrigin,
  escalateToOmbudsman,
  getDisputeContext,
  listDisputes,
  postMessage,
  resolveDispute,
  type DisputeContext,
  type DisputeFilter,
} from '@/lib/services';

/** What each filter tab asks the service for. */
function filterFor(tab: DisputeTab): DisputeFilter {
  if (tab === 'CUSTOMER') return { raisedBy: DisputeOrigin.CUSTOMER };
  if (tab === 'WORKER') return { raisedBy: DisputeOrigin.WORKER };
  if (tab === 'OPEN') return { unresolvedOnly: true };
  if (tab === 'RESOLVED') return { status: DisputeStatus.RESOLVED };
  return {};
}

/**
 * The dispute queue.
 *
 * A list on the left and the whole ticket on the right. Worker-raised and
 * customer-raised tickets go through exactly the same screen and exactly the same
 * services — the only difference anywhere is the origin badge — which is the claim the
 * page exists to make.
 */
export default function DisputesPage() {
  const [tab, setTab] = useState<DisputeTab>('ALL');
  const [disputes, setDisputes] = useState<Dispute[]>();
  const [counts, setCounts] = useState<{ customer: number; worker: number }>();
  const [selectedId, setSelectedId] = useState<string>();
  const [context, setContext] = useState<DisputeContext>();
  const [loadingContext, setLoadingContext] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  const loadList = useCallback(async (): Promise<Dispute[]> => {
    const [list, byOrigin] = await Promise.all([listDisputes(filterFor(tab)), countDisputesByOrigin()]);
    setDisputes(list);
    setCounts(byOrigin);
    return list;
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    setDisputes(undefined);
    void loadList().then((list) => {
      if (cancelled) return;
      setSelectedId((current) =>
        current && list.some((d) => d.id === current) ? current : list[0]?.id,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [loadList]);

  const loadContext = useCallback(async (id: string) => {
    const next = await getDisputeContext(id);
    setContext(next);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setContext(undefined);
      return;
    }
    let cancelled = false;
    setLoadingContext(true);
    void getDisputeContext(selectedId)
      .then((next) => {
        if (!cancelled) setContext(next);
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function refreshAll(): Promise<void> {
    if (!selectedId) return;
    await Promise.all([loadList(), loadContext(selectedId)]);
  }

  async function onConfirmResolve(
    outcome: DisputeOutcome,
    note: string,
    refundAmount?: number,
  ): Promise<void> {
    if (!context) return;
    const resolved = await resolveDispute(context.dispute.id, outcome, note, refundAmount);
    setResolving(false);
    const moved = resolved.resolution?.refundAmount;
    setNotice(
      moved
        ? `Resolved ${resolved.reference} with a refund of ${rupees(moved)}. ${resolved.resolution?.ledgerEntryIds.length} ledger entries were added.`
        : `Resolved ${resolved.reference}. No money moved.`,
    );
    await refreshAll();
  }

  async function onEscalate(): Promise<void> {
    if (!context) return;
    setBusy(true);
    try {
      const escalated = await escalateToOmbudsman(context.dispute.id);
      setNotice(
        `Escalated ${escalated.reference} to the Co-operative Ombudsman. Reference ${escalated.escalation?.referenceNumber}.`,
      );
      await refreshAll();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSend(body: string, internal: boolean): Promise<void> {
    if (!context) return;
    /* Errors propagate to the composer, which shows them in place. */
    await postMessage(context.dispute.id, body, internal);
    await refreshAll();
  }

  return (
    <div className="flex flex-col gap-3">
      {notice ? (
        <p role="status" className="rounded-tile border border-hairline bg-marigold-tint/50 px-4 py-2.5 text-table text-ink">
          {notice}
        </p>
      ) : null}

      <div className="grid h-[calc(100vh-8.5rem)] min-h-[32rem] grid-cols-12 overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
        <div className="col-span-5 min-h-0 border-r border-hairline xl:col-span-4">
          <DisputeList
            disputes={disputes}
            counts={counts}
            tab={tab}
            onTabChange={setTab}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <div className="col-span-7 min-h-0 xl:col-span-8">
          <TicketPane
            context={context}
            loading={loadingContext && !context}
            busy={busy}
            onResolve={() => setResolving(true)}
            onEscalate={onEscalate}
            onSend={onSend}
          />
        </div>
      </div>

      <ResolveDialog
        dispute={resolving ? context?.dispute : undefined}
        refundable={context?.refundable ?? 0}
        onCancel={() => setResolving(false)}
        onConfirm={onConfirmResolve}
      />
    </div>
  );
}
