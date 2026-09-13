import {
  DisputeStatus,
  LedgerAccount,
  LedgerDirection,
  LedgerEntryType,
  LoanStatus,
  ProposalStatus,
  type Dispute,
  type IsoDateTime,
} from '@sahayo/shared';
import { SEED_NOW, isCompletedBooking } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';

/**
 * The compliance exports the Central Registrar of Co-operative Societies asks for.
 *
 * Under the Multi-State Co-operative Societies (Amendment) Act, 2023, a multi-state
 * society files its annual return with the Central Registrar and keeps its decisions,
 * related-party dealings and concurrent audit trail ready for inspection. This builds
 * those four datasets for a financial year from the same collections every page reads,
 * so an export can never report a figure the portal does not show.
 *
 * No export contains an Aadhaar number, a masked Aadhaar, an Aadhaar reference or the
 * last four digits. The audit log records that a reveal happened, by whom and why —
 * which is what an inspector needs — and nothing about the number itself.
 */

export type CrcsDataset = 'BOARD_DECISIONS' | 'RELATED_PARTY' | 'AUDIT_LOG' | 'ANNUAL_RETURN';
export type ExportFormat = 'CSV' | 'JSON';

export const CRCS_DATASETS: ReadonlyArray<{ value: CrcsDataset; label: string; description: string }> = [
  {
    value: 'BOARD_DECISIONS',
    label: 'General body decisions',
    description: 'Every vote that closed in the year: the question, the turnout, the result and the money.',
  },
  {
    value: 'RELATED_PARTY',
    label: 'Related-party transactions',
    description: 'Money the society paid to its own members outside ordinary payouts, such as micro-loans.',
  },
  {
    value: 'AUDIT_LOG',
    label: 'Concurrent audit log',
    description: 'Reversals, refunds, verification decisions, Aadhaar reveals and settings changes.',
  },
  {
    value: 'ANNUAL_RETURN',
    label: 'Annual return figures',
    description: 'Membership, turnover, the three-way split, the fund balance and disputes for the year.',
  },
];

export interface FinancialYear {
  /** e.g. `2026-27`. */
  key: string;
  label: string;
  start: IsoDateTime;
  /** Exclusive for a closed year. For the current year, SEED_NOW inclusive, since the year is not over. */
  end: IsoDateTime;
  inProgress: boolean;
}

/** Indian financial years run 1 April to 31 March. */
export function listFinancialYears(count = 3): FinancialYear[] {
  const now = SEED_NOW;
  const currentStartYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return Array.from({ length: count }, (_, index) => {
    const startYear = currentStartYear - index;
    const key = `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
    const inProgress = index === 0;
    /* India Standard Time is UTC+5:30, so the year opens at 18:30 UTC on 31 March. */
    const start = new Date(Date.UTC(startYear, 2, 31, 18, 30)).toISOString();
    const end = inProgress ? now.toISOString() : new Date(Date.UTC(startYear + 1, 2, 31, 18, 30)).toISOString();
    return { key, label: `FY ${key}${inProgress ? ' (to date)' : ''}`, start, end, inProgress };
  });
}

type Row = Record<string, string | number | boolean | null>;

export interface DatasetTable {
  dataset: CrcsDataset;
  title: string;
  rows: Row[];
  /** Column order, so an empty table still exports its header. */
  columns: string[];
}

const rupeesPlain = (paise: number): string => (paise / 100).toFixed(2);
/*
 * The year to date includes its end instant: everything done in this session is stamped
 * at SEED_NOW, and an exclusive bound would leave today's approvals, reveals and settings
 * changes out of the very audit log that is supposed to record them.
 */
const within = (at: string | undefined, year: FinancialYear): boolean =>
  at !== undefined && at >= year.start && (at < year.end || (year.inProgress && at === year.end));

function boardDecisions(year: FinancialYear): DatasetTable {
  const columns = [
    'decision_id', 'title', 'opened_on', 'closed_on', 'electorate', 'votes_for', 'votes_against',
    'quorum_required', 'quorum_met', 'result', 'amount_rupees', 'outcome_note',
  ];
  const rows = adminState()
    .proposals.filter((proposal) => proposal.status !== ProposalStatus.OPEN && within(proposal.closesAt, year))
    .sort((a, b) => (a.closesAt < b.closesAt ? -1 : 1))
    .map((proposal) => ({
      decision_id: proposal.id,
      title: proposal.title,
      opened_on: proposal.openedAt.slice(0, 10),
      closed_on: proposal.closesAt.slice(0, 10),
      electorate: proposal.electorate,
      votes_for: proposal.votesFor,
      votes_against: proposal.votesAgainst,
      quorum_required: proposal.quorum,
      quorum_met: proposal.votesFor + proposal.votesAgainst >= proposal.quorum,
      result: proposal.status,
      amount_rupees: rupeesPlain(proposal.amountRequested),
      outcome_note: proposal.outcomeNote ?? '',
    }));
  return { dataset: 'BOARD_DECISIONS', title: 'General body decisions', columns, rows };
}

function relatedParty(year: FinancialYear): DatasetTable {
  const columns = [
    'transaction_id', 'date', 'member_id', 'member_name', 'relationship', 'nature', 'amount_rupees',
    'terms', 'ledger_entry_id',
  ];
  const { loanRequests, ledger } = adminState();
  const ledgerByLoan = new Map(
    ledger
      .filter((entry) => entry.type === LedgerEntryType.COOP_FUND_DISBURSEMENT && entry.subjectId)
      .map((entry) => [(entry.referenceKey ?? '').split(':')[0], entry.id]),
  );
  const rows = loanRequests
    .filter((loan) => loan.status === LoanStatus.DISBURSED && within(loan.decidedAt, year))
    .map((loan) => ({
      transaction_id: loan.id,
      date: (loan.decidedAt ?? '').slice(0, 10),
      member_id: loan.workerId,
      member_name: loan.workerName,
      relationship: 'Member of the society',
      nature: `Micro-loan from the cooperative fund: ${loan.purpose}`,
      amount_rupees: rupeesPlain(loan.amount),
      terms: loan.repaymentPlan,
      ledger_entry_id: ledgerByLoan.get(loan.id) ?? '',
    }));
  return { dataset: 'RELATED_PARTY', title: 'Related-party transactions', columns, rows };
}

function auditLog(year: FinancialYear): DatasetTable {
  const columns = ['at', 'category', 'actor', 'subject_id', 'detail'];
  const { ledger, disputes, kycQueue, aadhaarAccessLog, settingsHistory, team } = adminState();
  const nameOf = (adminId?: string): string =>
    team.find((member) => member.id === adminId)?.name ?? adminId ?? 'System';
  const rows: Row[] = [];

  for (const entry of ledger) {
    if (!entry.reversalOf || !within(entry.createdAt, year)) continue;
    rows.push({
      at: entry.createdAt,
      category: 'Ledger reversal',
      actor: 'Accounts',
      subject_id: entry.reversalOf,
      detail: `${entry.description} (${rupeesPlain(entry.amount)} rupees, entry ${entry.id})`,
    });
  }
  for (const dispute of disputes) {
    if (dispute.resolution && within(dispute.resolution.resolvedAt, year)) {
      rows.push({
        at: dispute.resolution.resolvedAt,
        category: 'Dispute resolved',
        actor: nameOf(dispute.resolution.resolvedByAdminId),
        subject_id: dispute.reference,
        detail: `${dispute.resolution.outcome}: ${dispute.resolution.note}`,
      });
    }
    if (dispute.escalation && within(dispute.escalation.escalatedAt, year)) {
      rows.push({
        at: dispute.escalation.escalatedAt,
        category: 'Ombudsman escalation',
        actor: nameOf(dispute.escalation.escalatedByAdminId),
        subject_id: dispute.reference,
        detail: `Referred as ${dispute.escalation.referenceNumber}`,
      });
    }
  }
  for (const submission of kycQueue) {
    if (!within(submission.reviewedAt, year)) continue;
    rows.push({
      at: submission.reviewedAt as string,
      category: 'Verification decision',
      actor: nameOf(submission.reviewedByAdminId),
      subject_id: submission.workerId,
      detail: submission.rejectionReason
        ? `Rejected ${submission.documentType}: ${submission.rejectionReason}`
        : `Approved ${submission.documentType}`,
    });
  }
  /* That a reveal happened, by whom and why. Never anything about the number. */
  for (const access of aadhaarAccessLog) {
    if (!within(access.accessedAt, year)) continue;
    rows.push({
      at: access.accessedAt,
      category: 'Aadhaar reveal',
      actor: access.adminName,
      subject_id: access.workerId,
      detail: `Purpose: ${access.purpose}`,
    });
  }
  for (const change of settingsHistory) {
    if (!within(change.changedAt, year)) continue;
    rows.push({
      at: change.changedAt,
      category: 'Settings change',
      actor: change.adminName,
      subject_id: change.section,
      detail: `${change.summary}. Before: ${change.before}. After: ${change.after}.`,
    });
  }

  rows.sort((a, b) => (String(a.at) < String(b.at) ? -1 : String(a.at) > String(b.at) ? 1 : 0));
  return { dataset: 'AUDIT_LOG', title: 'Concurrent audit log', columns, rows };
}

function annualReturn(year: FinancialYear): DatasetTable {
  const { bookings, ledger, workers, disputes, loanRequests, settings } = adminState();
  let gross = 0;
  let completed = 0;
  for (const booking of bookings) {
    if (!isCompletedBooking(booking) || !within(booking.completedAt ?? booking.createdAt, year)) continue;
    gross += booking.amount;
    completed += 1;
  }

  let workerPayouts = 0;
  let platformFees = 0;
  let fundIn = 0;
  let fundOut = 0;
  let refunds = 0;
  let fundOpening = 0;
  for (const entry of ledger) {
    const signed = entry.direction === LedgerDirection.CREDIT ? entry.amount : -entry.amount;
    if (entry.account === LedgerAccount.COOP_FUND && entry.createdAt < year.start) fundOpening += signed;
    if (!within(entry.createdAt, year)) continue;
    if (entry.type === LedgerEntryType.WORKER_PAYOUT) workerPayouts += entry.amount;
    else if (entry.type === LedgerEntryType.PLATFORM_FEE) platformFees += entry.amount;
    else if (entry.type === LedgerEntryType.REFUND && entry.account === LedgerAccount.CUSTOMER) refunds += entry.amount;
    if (entry.account === LedgerAccount.COOP_FUND) {
      if (entry.direction === LedgerDirection.CREDIT) fundIn += entry.amount;
      else fundOut += entry.amount;
    }
  }

  const raised = disputes.filter((dispute: Dispute) => within(dispute.createdAt, year));
  const loans = loanRequests.filter((loan) => loan.status === LoanStatus.DISBURSED && within(loan.decidedAt, year));

  const figures: Array<[string, string | number]> = [
    ['Name of the society', settings.platform.cooperativeName],
    ['Registration number', settings.platform.registrationNumber],
    ['Registered office', settings.platform.registeredOffice],
    ['Financial year', year.label],
    ['Period from', year.start.slice(0, 10)],
    ['Period to', year.end.slice(0, 10)],
    ['Members holding a share', workers.length],
    ['Members with verified identity', workers.filter((worker) => worker.kycStatus === 'VERIFIED').length],
    ['Completed bookings', completed],
    ['Turnover: gross booking value (rupees)', rupeesPlain(gross)],
    ['Paid to worker-members (rupees)', rupeesPlain(workerPayouts)],
    ['Platform fees retained (rupees)', rupeesPlain(platformFees)],
    ['Refunds to customers (rupees)', rupeesPlain(refunds)],
    ['Cooperative fund opening balance (rupees)', rupeesPlain(fundOpening)],
    ['Contributions to the fund (rupees)', rupeesPlain(fundIn)],
    ['Spent from the fund (rupees)', rupeesPlain(fundOut)],
    ['Cooperative fund closing balance (rupees)', rupeesPlain(fundOpening + fundIn - fundOut)],
    ['Micro-loans disbursed to members', loans.length],
    ['Micro-loan value (rupees)', rupeesPlain(loans.reduce((sum, loan) => sum + loan.amount, 0))],
    ['Disputes raised', raised.length],
    ['Disputes resolved', raised.filter((dispute) => dispute.status === DisputeStatus.RESOLVED).length],
    ['Disputes referred to the Ombudsman', raised.filter((dispute) => dispute.escalation).length],
    [
      'Revenue split in force at export',
      `Worker ${settings.split.workerPercent}%, platform ${settings.split.platformPercent}%, fund ${settings.split.fundPercent}%`,
    ],
  ];

  return {
    dataset: 'ANNUAL_RETURN',
    title: 'Annual return figures',
    columns: ['item', 'value'],
    rows: figures.map(([item, value]) => ({ item, value })),
  };
}

const BUILDERS: Record<CrcsDataset, (year: FinancialYear) => DatasetTable> = {
  BOARD_DECISIONS: boardDecisions,
  RELATED_PARTY: relatedParty,
  AUDIT_LOG: auditLog,
  ANNUAL_RETURN: annualReturn,
};

/**
 * One CSV cell.
 *
 * Quoted when it holds a comma, quote or line break. A cell opening with = + - or @ is
 * prefixed with an apostrophe, because spreadsheet software runs those as formulas and
 * an export that a member's free-text note can turn into a formula is not one an
 * inspector can safely open.
 */
function csvCell(value: string | number | boolean | null): string {
  if (value === null) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(table: DatasetTable): string {
  const lines = [table.columns.join(',')];
  for (const row of table.rows) lines.push(table.columns.map((column) => csvCell(row[column] ?? null)).join(','));
  return lines.join('\r\n');
}

export interface CrcsExport {
  filename: string;
  mimeType: string;
  content: string;
  /** How many rows each dataset contributed, for the confirmation line. */
  counts: Array<{ title: string; rows: number }>;
}

/** Builds the export for a year, in one file. */
export async function buildCrcsExport(
  yearKey: string,
  datasets: CrcsDataset[],
  format: ExportFormat,
): Promise<CrcsExport> {
  const year = listFinancialYears().find((candidate) => candidate.key === yearKey);
  if (!year) throw new Error('Choose a financial year from the list before exporting.');
  if (datasets.length === 0) throw new Error('Tick at least one dataset to include, then export again.');

  const tables = CRCS_DATASETS.filter((option) => datasets.includes(option.value)).map((option) =>
    BUILDERS[option.value](year),
  );
  const { platform } = adminState().settings;
  const slug = `crcs-${year.key}-${datasets.length === 1 ? datasets[0].toLowerCase().replace(/_/g, '-') : 'returns'}`;

  let content: string;
  if (format === 'JSON') {
    content = JSON.stringify(
      {
        society: platform.cooperativeName,
        registrationNumber: platform.registrationNumber,
        financialYear: year.label,
        period: { from: year.start, to: year.end },
        generatedAt: SEED_NOW.toISOString(),
        datasets: Object.fromEntries(tables.map((table) => [table.dataset, table.rows])),
      },
      null,
      2,
    );
  } else {
    /*
     * Several datasets in one CSV sit one under another, each under its own title line,
     * separated by a blank line — the layout the Registrar's spreadsheet templates use.
     */
    content = tables
      .map((table) => (tables.length > 1 ? `${csvCell(table.title)}\r\n${toCsv(table)}` : toCsv(table)))
      .join('\r\n\r\n');
  }

  return respond({
    filename: `${slug}.${format === 'JSON' ? 'json' : 'csv'}`,
    mimeType: format === 'JSON' ? 'application/json' : 'text/csv',
    content,
    counts: tables.map((table) => ({ title: table.title, rows: table.rows.length })),
  });
}

/** Every dispute referred to the Ombudsman, most recent first. */
export async function listOmbudsmanEscalations(): Promise<Dispute[]> {
  const escalated = adminState().disputes.filter((dispute) => dispute.escalation);
  escalated.sort((a, b) =>
    (b.escalation?.escalatedAt ?? '') < (a.escalation?.escalatedAt ?? '') ? -1 : 1,
  );
  return respond(escalated);
}
