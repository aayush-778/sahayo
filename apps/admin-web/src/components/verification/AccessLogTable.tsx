'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useMemo } from 'react';
import { AadhaarAccessPurpose, type AadhaarAccessLogEntry } from '@sahayo/shared';
import { Card } from '@/components/ui-kit/Card';
import { DataTable } from '@/components/ui-kit/DataTable';
import { EmptyState } from '@/components/ui-kit/EmptyState';

const PURPOSE_LABEL: Record<string, string> = {
  [AadhaarAccessPurpose.IDENTITY_VERIFICATION]: 'Verifying identity',
  [AadhaarAccessPurpose.DISPUTE_INVESTIGATION]: 'Investigating a dispute',
  [AadhaarAccessPurpose.PAYOUT_RECONCILIATION]: 'Reconciling a payout',
  [AadhaarAccessPurpose.REGULATORY_REQUEST]: 'Responding to a regulator',
};

export interface AccessLogTableProps {
  entries?: AadhaarAccessLogEntry[];
  workerName: (workerId: string) => string;
}

/**
 * Every Aadhaar reveal: who looked, when, at whose number, and why.
 *
 * This is the auditability proof. It is append-only — there is no way to change or
 * clear an entry from here or from the service beneath it — and it holds no part of
 * any number, only the fact of the access. Each row is written before the number it
 * records was ever shown.
 */
export function AccessLogTable({ entries, workerName }: AccessLogTableProps) {
  const columns = useMemo<ColumnDef<AadhaarAccessLogEntry>[]>(
    () => [
      {
        id: 'accessedAt',
        accessorFn: (entry) => entry.accessedAt,
        header: 'When',
        cell: ({ row }) => (
          <span className="tabular whitespace-nowrap text-muted">
            {new Date(row.original.accessedAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        id: 'admin',
        accessorFn: (entry) => entry.adminName,
        header: 'Administrator',
        cell: ({ row }) => (
          <span className="text-ink">
            {row.original.adminName}
            <span className="ml-2 font-mono text-pill text-muted">{row.original.adminId}</span>
          </span>
        ),
      },
      {
        id: 'worker',
        accessorFn: (entry) => workerName(entry.workerId),
        header: 'Whose Aadhaar',
        cell: ({ row }) => (
          <Link
            href={`/workers/${row.original.workerId}`}
            className="text-ink underline decoration-hairline underline-offset-2 hover:decoration-ink"
          >
            {workerName(row.original.workerId)}
          </Link>
        ),
      },
      {
        id: 'purpose',
        accessorFn: (entry) => entry.purpose,
        header: 'Stated purpose',
        cell: ({ row }) => (
          <span className="text-ink">{PURPOSE_LABEL[row.original.purpose] ?? row.original.purpose}</span>
        ),
      },
    ],
    [workerName],
  );

  return (
    <Card className="overflow-hidden p-0">
      <DataTable
        data={entries ?? []}
        columns={columns}
        caption="Every time a full Aadhaar number was revealed, with who revealed it and why"
        isLoading={!entries}
        getRowId={(entry) => entry.id}
        pageSize={15}
        note="Every reveal is recorded here before the number is shown, and kept. No part of any Aadhaar number is stored in this log."
        empty={
          <EmptyState
            className="px-5 py-6"
            title="Nobody has revealed an Aadhaar number yet"
            description="Reveals appear here the moment they happen, with the administrator and the purpose they gave. Numbers stay masked until someone gives a reason to look."
          />
        }
      />
    </Card>
  );
}
