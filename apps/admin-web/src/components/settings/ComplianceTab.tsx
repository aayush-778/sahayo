'use client';

import { Download, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Dispute, SettingsChange } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { IconTile } from '@/components/ui-kit/IconTile';
import { LinkButton } from '@/components/ui-kit/LinkButton';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { SegmentedToggle } from '@/components/ui-kit/SegmentedToggle';
import { Select } from '@/components/ui-kit/Select';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { downloadFile } from '@/lib/download';
import { count } from '@/lib/format';
import {
  CRCS_DATASETS,
  buildCrcsExport,
  listAadhaarAccessLog,
  listFinancialYears,
  listOmbudsmanEscalations,
  listSettingsHistory,
  type CrcsDataset,
  type ExportFormat,
} from '@/lib/services';

const FORMATS = [
  { value: 'CSV' as const, label: 'CSV' },
  { value: 'JSON' as const, label: 'JSON' },
];

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface ComplianceTabProps {
  onNotice: (message: string) => void;
  onOpenTab: (tab: 'DISPATCH') => void;
}

/**
 * What the society owes the Central Registrar, and the logs an inspector asks to see.
 */
export function ComplianceTab({ onNotice, onOpenTab }: ComplianceTabProps) {
  const years = listFinancialYears();
  const [yearKey, setYearKey] = useState(years[0]?.key ?? '');
  const [datasets, setDatasets] = useState<CrcsDataset[]>(CRCS_DATASETS.map((option) => option.value));
  const [format, setFormat] = useState<ExportFormat>('CSV');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string>();

  const [escalations, setEscalations] = useState<Dispute[]>();
  const [revealCount, setRevealCount] = useState<number>();
  const [history, setHistory] = useState<SettingsChange[]>();

  useEffect(() => {
    void Promise.all([listOmbudsmanEscalations(), listAadhaarAccessLog(), listSettingsHistory()]).then(
      ([nextEscalations, log, nextHistory]) => {
        setEscalations(nextEscalations);
        setRevealCount(log.length);
        setHistory(nextHistory);
      },
    );
  }, []);

  function toggle(dataset: CrcsDataset): void {
    setDatasets((current) =>
      current.includes(dataset) ? current.filter((value) => value !== dataset) : [...current, dataset],
    );
  }

  async function exportFile(): Promise<void> {
    setExporting(true);
    setError(undefined);
    try {
      const file = await buildCrcsExport(yearKey, datasets, format);
      downloadFile(file.filename, file.mimeType, file.content);
      onNotice(
        `Exported ${file.filename}: ${file.counts.map((item) => `${count(item.rows)} ${item.title.toLowerCase()} rows`).join(', ')}.`,
      );
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setExporting(false);
    }
  }

  const year = years.find((candidate) => candidate.key === yearKey);

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12 p-6 lg:col-span-7">
        <SectionHeader
          title="CRCS returns export"
          subtitle="For the Central Registrar, under the Multi-State Co-operative Societies (Amendment) Act, 2023"
        />
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <Select
            label="Financial year"
            value={yearKey}
            onChange={setYearKey}
            options={years.map((candidate) => ({ value: candidate.key, label: candidate.label }))}
            className="w-52"
          />
          <div className="flex flex-col gap-1">
            <span className="text-pill font-medium text-muted">Format</span>
            <SegmentedToggle label="Export format" options={FORMATS} value={format} onChange={setFormat} />
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="text-pill font-medium text-muted">Include</legend>
          <ul className="mt-2 flex flex-col divide-y divide-hairline">
            {CRCS_DATASETS.map((option) => (
              <li key={option.value} className="py-2.5 first:pt-1">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={datasets.includes(option.value)}
                    onChange={() => toggle(option.value)}
                    className="mt-1 h-4 w-4 flex-none accent-marigold"
                  />
                  <span>
                    <span className="block text-table font-medium text-ink">{option.label}</span>
                    <span className="block text-pill text-muted">{option.description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-hairline pt-4">
          {error ? (
            <p role="alert" className="mr-auto text-pill text-ink">
              {error}
            </p>
          ) : (
            <p className="mr-auto text-pill text-muted">
              {format === 'CSV' && datasets.length > 1
                ? 'One file, each dataset under its own heading.'
                : 'Built on this device. No Aadhaar data is ever included.'}
            </p>
          )}
          <Button
            variant="primary"
            icon={<Download size={16} strokeWidth={1.5} aria-hidden />}
            disabled={exporting || datasets.length === 0}
            onClick={() => void exportFile()}
          >
            {exporting ? 'Exporting' : `Export ${year ? `FY ${year.key}` : 'returns'}`}
          </Button>
        </div>
      </Card>

      <Card className="col-span-12 flex flex-col gap-4 self-start p-6 lg:col-span-5">
        <div className="flex items-start gap-3">
          <IconTile icon={ShieldCheck} tint="fund-green" />
          <div>
            <h3 className="font-display text-card-title font-medium text-ink">Aadhaar access log</h3>
            <p className="mt-0.5 text-table text-muted">
              Every reveal of a full Aadhaar number, with who asked, why, and when, as UIDAI Circular 14
              of 2025 requires.
            </p>
          </div>
        </div>
        <div className="text-table text-ink">
          {revealCount === undefined ? (
            <Skeleton className="h-4 w-40" />
          ) : revealCount === 0 ? (
            'No number has been revealed this session.'
          ) : (
            <>
              <span className="tabular">{count(revealCount)}</span> {revealCount === 1 ? 'reveal' : 'reveals'} recorded
              this session.
            </>
          )}
        </div>
        <LinkButton href="/verification?tab=log" className="self-start">
          Open the access log
        </LinkButton>
      </Card>

      <Card className="col-span-12 p-6 lg:col-span-7">
        <SectionHeader title="Ombudsman escalations" subtitle="Disputes referred outside the cooperative" />
        {!escalations ? (
          <div className="mt-5">
            <Skeleton lines={4} />
          </div>
        ) : escalations.length === 0 ? (
          <EmptyState
            className="mt-3"
            title="No dispute has been referred to the Ombudsman"
            description="A ticket can be referred once it has gone unresolved for 14 days. Referrals appear here with their Ombudsman reference."
            action={
              <LinkButton href="/disputes">Open the dispute queue</LinkButton>
            }
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-table">
              <thead>
                <tr className="text-left text-pill text-muted">
                  <th scope="col" className="pb-2 font-medium">Ombudsman reference</th>
                  <th scope="col" className="pb-2 font-medium">Dispute</th>
                  <th scope="col" className="pb-2 font-medium">Referred</th>
                  <th scope="col" className="pb-2 text-right font-medium">Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {escalations.map((dispute) => (
                  <tr key={dispute.id}>
                    <td className="tabular py-2.5 text-ink">{dispute.escalation?.referenceNumber}</td>
                    <td className="py-2.5">
                      <Link href={`/disputes?id=${dispute.id}`} className="text-ink hover:underline">
                        {dispute.reference}
                      </Link>
                      <span className="block text-pill text-muted">{dispute.subject}</span>
                    </td>
                    <td className="tabular py-2.5 text-ink">
                      {dispute.escalation ? longDate(dispute.escalation.escalatedAt) : ''}
                    </td>
                    <td className="py-2.5 text-right">
                      <StatusPill
                        status={dispute.status === 'RESOLVED' ? 'resolved' : 'pending'}
                        label={dispute.status === 'RESOLVED' ? 'Resolved' : 'With the Ombudsman'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="col-span-12 p-6 lg:col-span-5">
        <SectionHeader title="Settings changes" subtitle="Who changed what, kept in the audit log" />
        {!history ? (
          <div className="mt-5">
            <Skeleton lines={4} />
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            className="mt-3"
            title="The settings are as the cooperative launched them"
            description="Any change to the dispatch rules, the split or the platform details is recorded here and in the CRCS audit log."
            action={
              <Button variant="outline" size="sm" onClick={() => onOpenTab('DISPATCH')}>
                Review the dispatch rules
              </Button>
            }
          />
        ) : (
          <ol className="mt-4 flex flex-col divide-y divide-hairline">
            {history.map((change) => (
              <li key={change.id} className="py-2.5 first:pt-0">
                <p className="text-table text-ink">{change.summary}</p>
                <p className="mt-0.5 text-pill text-muted">
                  {change.adminName} · was {change.before} · now {change.after}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
