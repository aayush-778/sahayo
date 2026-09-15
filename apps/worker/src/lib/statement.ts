import type { TFunction } from 'i18next';
import type { Paise } from '@sahayo/shared';
import { formatPaise, type AppLanguage } from '@sahayo/ui-native';

import type { PeriodSummary } from '../services/earnings';
import type { Settlement } from '../types';
import { formatDayMonth, formatWhen } from './datetime';

/**
 * A plain-text earnings statement, for the share sheet.
 *
 * Text rather than a PDF: it goes into WhatsApp, SMS or email as it is, needs
 * no file permission or native module, and reads the same on any phone. Every
 * line comes from the same derived figures the Earnings screen shows.
 */
export function buildStatement({
  t,
  language,
  workerName,
  periodLabel,
  summary,
  unsettled,
  contribution,
  settlements,
}: {
  t: TFunction;
  language: AppLanguage;
  workerName: string;
  periodLabel: string;
  summary: PeriodSummary;
  unsettled: Paise;
  contribution: Paise;
  settlements: Settlement[];
}): string {
  const money = (paise: Paise) => formatPaise(paise, language);
  const lines: string[] = [
    t('worker.earnings.statement.title'),
    workerName,
    t('worker.earnings.statement.period', { period: periodLabel }),
    '',
    t('worker.earnings.statement.total', { amount: money(summary.total) }),
    t('worker.earnings.statement.jobs', { n: summary.jobs, amount: money(summary.average) }),
    t('worker.earnings.statement.pending', { amount: money(unsettled) }),
    t('worker.earnings.statement.fund', { amount: money(contribution) }),
    '',
    `— ${t('worker.earnings.statement.jobsHeading')} —`,
  ];

  for (const month of summary.months) {
    for (const row of month.rows) {
      lines.push(
        t('worker.earnings.statement.row', {
          date: formatDayMonth(row.entry.createdAt, t),
          name: row.customer?.name ?? '—',
          amount: money(row.entry.amount),
          status: row.settled ? t('worker.earnings.paid') : t('worker.earnings.pendingBadge'),
        }),
      );
    }
  }

  if (settlements.length > 0) {
    lines.push('', `— ${t('worker.earnings.statement.settlementsHeading')} —`);
    for (const settlement of settlements) {
      lines.push(
        t('worker.earnings.statement.settlementLine', {
          date: formatDayMonth(settlement.settledAt, t),
          reference: settlement.reference,
          amount: money(settlement.amount),
        }),
      );
    }
  }

  lines.push('', t('worker.earnings.statement.generated', { when: formatWhen(new Date().toISOString(), t) }));
  return lines.join('\n');
}
