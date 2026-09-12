'use client';

import { Eye } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  AadhaarAccessPurpose,
  KycDocumentType,
  type AadhaarAccessPurpose as Purpose,
  type KycSubmission,
} from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Select } from '@/components/ui-kit/Select';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { maskedAadhaar, revealAadhaar } from '@/lib/services';

const DOCUMENT_LABEL: Record<string, string> = {
  [KycDocumentType.AADHAAR]: 'Aadhaar',
  [KycDocumentType.PAN]: 'PAN card',
  [KycDocumentType.DRIVING_LICENCE]: 'Driving licence',
};

const PURPOSE_OPTIONS = [
  { value: AadhaarAccessPurpose.IDENTITY_VERIFICATION, label: 'Verifying identity' },
  { value: AadhaarAccessPurpose.DISPUTE_INVESTIGATION, label: 'Investigating a dispute' },
  { value: AadhaarAccessPurpose.PAYOUT_RECONCILIATION, label: 'Reconciling a payout' },
  { value: AadhaarAccessPurpose.REGULATORY_REQUEST, label: 'Responding to a regulator' },
];

/**
 * One Aadhaar row, with the masked value and a reveal behind a stated purpose.
 *
 * UIDAI Circular 14 of 2025 shapes this component, not convenience:
 *
 *   The masked form is what renders. The full value is never a prop, never in the
 *   DOM until a reveal, and never written to state that outlives the window.
 *   Selecting a purpose is required before the button does anything, because
 *   without one there is no lawful basis to look. The service writes the audit row
 *   BEFORE it returns a value, so a reveal that cannot be logged does not happen.
 *   A visible countdown runs, and the value is cleared from state when it expires.
 */
function AadhaarRow({ submission }: { submission: KycSubmission }) {
  const [purpose, setPurpose] = useState<string>('');
  const [revealed, setRevealed] = useState<string>();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string>();
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  /* Clear the value when the window expires, and on unmount either way. */
  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  useEffect(() => {
    if (secondsLeft > 0) return;
    setRevealed(undefined);
    if (timer.current) clearInterval(timer.current);
  }, [secondsLeft]);

  async function onReveal(): Promise<void> {
    setError(undefined);
    if (!purpose) {
      setError('Choose why you need to see this number before revealing it.');
      return;
    }
    try {
      const result = await revealAadhaar(submission.id, purpose as Purpose);
      setRevealed(result.value);
      setSecondsLeft(Math.round(result.windowMs / 1000));
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => {
        setSecondsLeft((current) => Math.max(0, current - 1));
      }, 1000);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <div className="mt-3 rounded-tile border border-hairline bg-ground p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-pill text-muted">Aadhaar reference</p>
          <p className="tabular mt-0.5 text-table text-ink">
            {revealed ?? maskedAadhaar(submission.aadhaarLast4)}
          </p>
          {revealed ? (
            <p className="mt-1 text-pill text-coral" role="status">
              Hidden again in {secondsLeft}s. This access has been logged.
            </p>
          ) : (
            <p className="mt-1 text-pill text-muted">
              Only the last four digits are stored. Every reveal is recorded.
            </p>
          )}
        </div>

        {revealed ? null : (
          <div className="flex items-end gap-2">
            <Select
              className="w-52"
              label="Why do you need this?"
              allLabel="Choose a reason"
              value={purpose}
              onChange={setPurpose}
              options={PURPOSE_OPTIONS}
            />
            <Button
              variant="outline"
              icon={<Eye size={16} strokeWidth={1.5} aria-hidden />}
              onClick={onReveal}
              className="mb-0.5"
            >
              Reveal number
            </Button>
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-pill text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

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
                <AadhaarRow submission={submission} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
