'use client';

import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  ProposalStatus,
  VoteDirection,
  type AdminWorker,
  type FundTotals,
  type LoanRequest,
  type Proposal,
} from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { FundOverview } from '@/components/fund/FundOverview';
import { LoanQueue } from '@/components/fund/LoanQueue';
import { NewProposalDialog } from '@/components/fund/NewProposalDialog';
import { PastDecisions } from '@/components/fund/PastDecisions';
import { ProposalCard } from '@/components/fund/ProposalCard';
import { ProposalDetailDialog } from '@/components/fund/ProposalDetailDialog';
import { VoteDialog } from '@/components/fund/VoteDialog';
import { rupees } from '@/lib/format';
import {
  castVote,
  createProposal,
  disburseLoan,
  getFundGrowth,
  getFundTotals,
  useLiveVersion,
  getSettings,
  listLoanRequests,
  listPastDecisions,
  listProposals,
  listWorkers,
  listZones,
  rejectLoan,
  type FundGrowthPoint,
  type NewProposalInput,
} from '@/lib/services';

/**
 * The cooperative fund.
 *
 * The part of the product that makes it a cooperative: what the workers' fund holds,
 * what they are voting on, who is asking to borrow, and everything they have decided.
 * Every figure is read back from the services after a change, so a vote or a loan moves
 * this page, the dashboard and the ledger in the same instant.
 */
export default function FundPage() {
  const [totals, setTotals] = useState<FundTotals>();
  const [growth, setGrowth] = useState<FundGrowthPoint[]>();
  const [open, setOpen] = useState<Proposal[]>();
  const [past, setPast] = useState<Proposal[]>();
  const [loans, setLoans] = useState<LoanRequest[]>();
  const [members, setMembers] = useState<AdminWorker[]>([]);
  const [zoneNames, setZoneNames] = useState<Map<string, string>>(new Map());
  const [fundPercent, setFundPercent] = useState<number>();

  const [voting, setVoting] = useState<{ proposal: Proposal; direction: VoteDirection }>();
  const [reading, setReading] = useState<Proposal>();
  const [proposing, setProposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  /* A finished job's fund share arriving live moves the balance and the chart. */
  const ledgerVersion = useLiveVersion('ledger');

  const load = useCallback(async () => {
    const [nextTotals, nextGrowth, nextOpen, nextPast, nextLoans] = await Promise.all([
      getFundTotals(),
      getFundGrowth(),
      listProposals(ProposalStatus.OPEN),
      listPastDecisions(),
      listLoanRequests(),
    ]);
    setTotals(nextTotals);
    setGrowth(nextGrowth);
    setOpen(nextOpen);
    setPast(nextPast);
    setLoans(nextLoans);
  }, []);

  useEffect(() => {
    if (ledgerVersion > 0) void load();
  }, [ledgerVersion, load]);

  useEffect(() => {
    void load();
    void Promise.all([listWorkers(), listZones(), getSettings()]).then(([workers, zones, settings]) => {
      setFundPercent(settings.split.fundPercent);
      setMembers(workers);
      setZoneNames(new Map(zones.map((zone) => [zone.id, zone.name])));
    });
  }, [load]);

  const zoneName = useCallback((zoneId: string) => zoneNames.get(zoneId) ?? 'Unknown zone', [zoneNames]);

  async function recordVote(workerId: string, direction: VoteDirection): Promise<void> {
    if (!voting) return;
    /* Errors surface in the dialog, where the reviewer can pick someone else. */
    const updated = await castVote(voting.proposal.id, direction, workerId);
    const member = members.find((m) => m.id === workerId);
    setVoting(undefined);
    setNotice(
      `Recorded ${member?.name ?? 'the member'}'s vote ${direction === VoteDirection.FOR ? 'for' : 'against'} "${updated.title}". ` +
        `${updated.votesFor + updated.votesAgainst} of ${updated.electorate} have now voted.`,
    );
    await load();
  }

  async function approveLoan(loan: LoanRequest): Promise<void> {
    setBusy(true);
    try {
      await disburseLoan(loan.id);
      setNotice(`Lent ${rupees(loan.amount)} to ${loan.workerName}. The fund balance has gone down by the same amount.`);
      await load();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function declineLoan(loan: LoanRequest, reason: string): Promise<void> {
    await rejectLoan(loan.id, reason);
    setNotice(`Declined ${loan.workerName}'s request and told them why.`);
    await load();
  }

  async function submitProposal(input: NewProposalInput): Promise<void> {
    const proposal = await createProposal(input);
    setProposing(false);
    setNotice(`"${proposal.title}" is now open for every member to vote on.`);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <FundOverview totals={totals} growth={growth} fundPercent={fundPercent} />

      {notice ? (
        <p role="status" className="rounded-tile border border-hairline bg-marigold-tint/50 px-4 py-2.5 text-table text-ink">
          {notice}
        </p>
      ) : null}

      <section aria-label="Open votes" className="flex flex-col gap-4">
        <SectionHeader
          title="What members are voting on"
          subtitle="A result counts once enough members have voted"
          action={
            <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} aria-hidden />} onClick={() => setProposing(true)}>
              Put forward a proposal
            </Button>
          }
        />
        {!open ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-card" />
            <Skeleton className="h-64 w-full rounded-card" />
          </div>
        ) : open.length === 0 ? (
          <EmptyState
            title="Nothing is up for a vote right now"
            description="Put a proposal to the members when someone asks for the fund to pay for something."
            action={
              <Button variant="outline" size="sm" onClick={() => setProposing(true)}>
                Put forward a proposal
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {open.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onOpen={() => setReading(proposal)}
                onRecordVote={(direction) => setVoting({ proposal, direction })}
              />
            ))}
          </div>
        )}
      </section>

      <LoanQueue loans={loans} headroom={totals?.lendingHeadroom} busy={busy} onApprove={approveLoan} onReject={declineLoan} />

      <PastDecisions decisions={past} onOpen={setReading} />

      <VoteDialog
        proposal={voting?.proposal}
        direction={voting?.direction ?? VoteDirection.FOR}
        zoneName={zoneName}
        onClose={() => setVoting(undefined)}
        onConfirm={recordVote}
      />
      <ProposalDetailDialog proposal={reading} onClose={() => setReading(undefined)} />
      <NewProposalDialog
        open={proposing}
        members={members}
        fundBalance={totals?.balance ?? 0}
        onClose={() => setProposing(false)}
        onConfirm={submitProposal}
      />
    </div>
  );
}
