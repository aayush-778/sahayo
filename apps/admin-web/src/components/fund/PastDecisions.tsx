import { ProposalStatus, type Proposal } from '@sahayo/shared';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { count, rupees } from '@/lib/format';
import { PROPOSAL_STATUS, longDate } from './ProposalCard';

/**
 * Every decision the members have made, and what came of it.
 *
 * This is the page's proof. It lists what passed and what did not, in the order it was
 * decided, with what the money actually did — and a passed decision here always has a
 * matching payment in the ledger for exactly the amount approved.
 */
export function PastDecisions({ decisions, onOpen }: { decisions?: Proposal[]; onOpen: (proposal: Proposal) => void }) {
  return (
    <Card className="p-6">
      <SectionHeader title="What the members have decided" subtitle="Every concluded vote, most recent first" />
      {!decisions ? (
        <div className="mt-5">
          <Skeleton lines={6} />
        </div>
      ) : decisions.length === 0 ? (
        <EmptyState
          className="mt-3"
          title="No votes have closed yet"
          description="Once a proposal's voting window ends, its result and what the money did appear here."
        />
      ) : (
        <ol className="relative mt-5 flex flex-col gap-5 border-l border-hairline pl-5">
          {decisions.map((proposal) => {
            const status = PROPOSAL_STATUS[proposal.status];
            const passed = proposal.status === ProposalStatus.PASSED;
            const cast = proposal.votesFor + proposal.votesAgainst;
            return (
              <li key={proposal.id} className="relative">
                <span
                  aria-hidden
                  className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface ${passed ? 'bg-fund-green' : 'bg-muted'}`}
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <button type="button" onClick={() => onOpen(proposal)} className="text-left">
                    <span className="text-table font-medium text-ink hover:underline">{proposal.title}</span>
                  </button>
                  <span className="flex items-center gap-2">
                    <span className="text-pill text-muted">{longDate(proposal.closesAt)}</span>
                    <StatusPill status={status.pill} label={status.label} />
                  </span>
                </div>
                <p className="mt-0.5 text-pill text-muted">
                  <span className="tabular">{count(proposal.votesFor)}</span> for,{' '}
                  <span className="tabular">{count(proposal.votesAgainst)}</span> against, of{' '}
                  <span className="tabular">{count(proposal.electorate)}</span> members
                  {' · '}
                  {passed ? 'paid ' : 'asked for '}
                  <span className="tabular text-ink">{rupees(proposal.amountRequested)}</span>
                  {cast < proposal.quorum ? ' · too few voted for the result to count' : ''}
                </p>
                {proposal.outcomeNote ? <p className="mt-1.5 text-table text-ink">{proposal.outcomeNote}</p> : null}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
