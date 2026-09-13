'use client';

import { Gavel, Landmark } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { DisputeOrigin, DisputeOutcome, DisputeStatus } from '@sahayo/shared';
import { Avatar } from '@/components/ui-kit/Avatar';
import { Button } from '@/components/ui-kit/Button';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { rupees } from '@/lib/format';
import { OMBUDSMAN_ESCALATION_DAYS, type DisputeContext } from '@/lib/services';
import { Conversation } from './Conversation';
import { DISPUTE_STATUS, OriginBadge } from './DisputeList';
import { TicketTimeline } from './TicketTimeline';
import { LinkButton } from '@/components/ui-kit/LinkButton';

const OUTCOME_LABEL: Record<string, string> = {
  [DisputeOutcome.FULL_REFUND]: 'Full refund',
  [DisputeOutcome.PARTIAL_REFUND]: 'Partial refund',
  [DisputeOutcome.PENALTY_WAIVED]: 'Penalty waived',
  [DisputeOutcome.NO_ACTION]: 'No action',
  [DisputeOutcome.WARNING_ISSUED]: 'Warning issued',
};

export interface TicketPaneProps {
  context?: DisputeContext;
  loading: boolean;
  busy: boolean;
  onResolve: () => void;
  onEscalate: () => void;
  onSend: (body: string, internal: boolean) => Promise<void>;
}

/**
 * The full ticket: who, what happened, what was said, and what was decided.
 *
 * Both parties are shown with equal weight in the header whichever of them raised
 * it. The origin badge says who complained; nothing else about the layout treats a
 * worker's ticket as lesser than a customer's.
 */
export function TicketPane({ context, loading, busy, onResolve, onEscalate, onSend }: TicketPaneProps) {
  const conversationRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton lines={14} />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="p-6">
        <EmptyState
          title="Choose a ticket"
          description="Pick one from the list to see the job behind it, the conversation, and what can be done."
        />
      </div>
    );
  }

  const { dispute, booking, workerAvatarUrl, timeline, ageDays, escalatable } = context;
  const status = DISPUTE_STATUS[dispute.status];
  const resolved = dispute.status === DisputeStatus.RESOLVED;
  const workerRaised = dispute.raisedBy === DisputeOrigin.WORKER;

  return (
    <div className="scroll-hidden flex h-full min-h-0 flex-col gap-6 overflow-y-auto p-6">
      {/* 1. Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-pill text-muted">{dispute.reference}</span>
              <OriginBadge origin={dispute.raisedBy} />
              <StatusPill status={status.pill} label={status.label} />
            </div>
            <h2 className="mt-1.5 font-display text-card-title font-medium text-ink">{dispute.subject}</h2>
            <p className="mt-0.5 text-pill text-muted">
              Raised {ageDays === 0 ? 'today' : `${ageDays} ${ageDays === 1 ? 'day' : 'days'} ago`} about{' '}
              <span className="tabular text-ink">{booking?.reference ?? 'a booking'}</span>
              {context.zoneName ? ` in ${context.zoneName}` : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="tabular font-display text-stat font-medium text-ink">
              {rupees(dispute.amountInDispute)}
            </span>
            {resolved ? null : (
              <Button
                variant="primary"
                icon={<Gavel size={16} strokeWidth={1.5} aria-hidden />}
                onClick={onResolve}
                disabled={busy}
              >
                Resolve ticket
              </Button>
            )}
          </div>
        </div>

        {/* Both parties, side by side, at the same weight. */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              role: 'Customer',
              name: dispute.customerName,
              avatar: undefined,
              raised: !workerRaised,
              href: undefined,
            },
            {
              role: 'Worker',
              name: dispute.workerName,
              avatar: workerAvatarUrl,
              raised: workerRaised,
              href: `/workers/${dispute.workerId}`,
            },
          ].map((party) => (
            <div key={party.role} className="flex items-center gap-3 rounded-tile border border-hairline p-3">
              <Avatar name={party.name} src={party.avatar} size={36} />
              <div className="min-w-0">
                <p className="truncate text-table font-medium text-ink">
                  {party.href ? (
                    <Link href={party.href} className="hover:underline">
                      {party.name}
                    </Link>
                  ) : (
                    party.name
                  )}
                </p>
                <p className="text-pill text-muted">
                  {party.role}
                  {party.raised ? ' · raised this ticket' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Escalation: required by law once a ticket has waited long enough. */}
        {dispute.escalation ? (
          <p className="flex items-center gap-2 rounded-tile border border-hairline bg-lavender/10 px-3 py-2 text-table text-ink">
            <Landmark size={16} strokeWidth={1.5} aria-hidden />
            Escalated to the Co-operative Ombudsman. Reference{' '}
            <span className="font-mono">{dispute.escalation.referenceNumber}</span>.
          </p>
        ) : escalatable ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-coral/60 bg-coral/10 px-3 py-2">
            <p className="text-table text-ink">
              Open for <span className="tabular">{ageDays}</span> days, past the{' '}
              <span className="tabular">{OMBUDSMAN_ESCALATION_DAYS}</span>-day limit. Either party can
              be referred to the Ombudsman under the MSCS Amendment Act 2023.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={<Landmark size={14} strokeWidth={1.5} aria-hidden />}
              onClick={onEscalate}
              disabled={busy}
            >
              Escalate to the Co-operative Ombudsman
            </Button>
          </div>
        ) : null}

        {/* After resolution: what was decided, and the ledger rows it created. */}
        {dispute.resolution ? (
          <div className="rounded-tile border border-fund-green/50 bg-fund-green/10 p-4">
            <p className="text-table font-medium text-ink">
              Resolved: {OUTCOME_LABEL[dispute.resolution.outcome]}
              {dispute.resolution.refundAmount ? (
                <>
                  {' '}
                  of <span className="tabular">{rupees(dispute.resolution.refundAmount)}</span>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-table text-ink">{dispute.resolution.note}</p>
            {dispute.resolution.ledgerEntryIds.length > 0 ? (
              <div className="mt-2">
                <p className="text-pill text-muted">New ledger entries</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {dispute.resolution.ledgerEntryIds.map((id) => (
                    <li key={id}>
                      <Link
                        href={`/finance?entry=${encodeURIComponent(id)}`}
                        className="rounded-pill border border-hairline bg-surface px-2 py-0.5 font-mono text-pill text-ink hover:border-ink"
                      >
                        {id.replace(/^led_/, '').slice(0, 8)}…{id.split('_').pop()}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-1 text-pill text-muted">No money moved, so no ledger entries were added.</p>
            )}
          </div>
        ) : resolved ? (
          <p className="rounded-tile border border-hairline bg-ground px-3 py-2 text-pill text-muted">
            Resolved before resolutions were recorded here, so there is no decision note for this ticket.
          </p>
        ) : null}
      </header>

      {/* 2. Timeline */}
      <section aria-label="What happened on the job">
        <SectionHeader as="h3" title="What happened on the job" subtitle="From the request to the payment, in order" />
        <div className="mt-4">
          {timeline.length === 0 ? (
            <EmptyState
              title="No job record"
              description="The booking for this ticket could not be found. Search the ledger for its reference to see whether any money moved."
              action={<LinkButton href="/finance">Search the ledger</LinkButton>}
            />
          ) : (
            <TicketTimeline
              nodes={timeline}
              onJumpToConversation={() =>
                conversationRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
              }
            />
          )}
        </div>
      </section>

      {/* 3. Conversation */}
      <div>
        <SectionHeader as="h3" title="Conversation" subtitle="Both parties, and notes only admins can see" />
        <div className="mt-4">
          <Conversation ref={conversationRef} dispute={dispute} workerAvatarUrl={workerAvatarUrl} onSend={onSend} />
        </div>
      </div>
    </div>
  );
}
