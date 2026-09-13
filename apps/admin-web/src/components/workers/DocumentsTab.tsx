'use client';

import { KycDocumentType, type KycSubmission } from '@sahayo/shared';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { AadhaarReveal } from '@/components/verification/AadhaarReveal';
import { LinkButton } from '@/components/ui-kit/LinkButton';

const DOCUMENT_LABEL: Record<string, string> = {
  [KycDocumentType.AADHAAR]: 'Aadhaar',
  [KycDocumentType.PAN]: 'PAN card',
  [KycDocumentType.DRIVING_LICENCE]: 'Driving licence',
};

/*
 * The Aadhaar field is the shared AadhaarReveal, the same one the verification queue
 * uses. An earlier version here kept the revealed number in useState for its thirty
 * seconds, which UIDAI Circular 14 of 2025 rule 1 forbids outright; the shared
 * component never puts it in React state at all.
 */

export interface DocumentsTabProps {
  submissions?: KycSubmission[];
  /** The worker's current verification state, which these documents decided. */
  verificationLabel: string;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'offline';
}

export function DocumentsTab({
  submissions,
  verificationLabel,
  verificationStatus,
}: DocumentsTabProps) {
  return (
    <Card className="p-6">
      <SectionHeader
        title="Documents"
        subtitle="What this worker submitted, and what was decided"
        action={<StatusPill status={verificationStatus} label={verificationLabel} />}
      />

      {!submissions ? (
        <div className="mt-5">
          <Skeleton lines={4} />
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState
          className="mt-3"
          title="Nothing submitted yet"
          description="This worker has not uploaded an identity document. They cannot be verified, and so cannot be offered jobs, until they do."
          action={<LinkButton href="/verification">Open the verification queue</LinkButton>}
        />
      ) : (
        <ul className="mt-5 flex flex-col gap-4">
          {submissions.map((submission) => (
            <li key={submission.id} className="border-t border-hairline pt-4 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-table font-medium text-ink">
                  {DOCUMENT_LABEL[submission.documentType] ?? submission.documentType}
                </p>
                <p className="text-pill text-muted">
                  Submitted{' '}
                  {new Date(submission.submittedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {submission.reviewedAt ? (
                    <>
                      {' · reviewed '}
                      {new Date(submission.reviewedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </>
                  ) : null}
                </p>
              </div>

              {submission.rejectionReason ? (
                <p className="mt-1 text-pill text-muted">
                  Rejected: {submission.rejectionReason.toLowerCase().replace(/_/g, ' ')}
                  {submission.rejectionNote ? ` — ${submission.rejectionNote}` : ''}
                </p>
              ) : null}

              {submission.documentType === KycDocumentType.AADHAAR ? (
                <div className="mt-3"><AadhaarReveal submission={submission} /></div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
