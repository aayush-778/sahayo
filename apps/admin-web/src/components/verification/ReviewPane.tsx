'use client';

import { BadgeCheck, ImageOff, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { forwardRef, useEffect, useState } from 'react';
import { KycDocumentType, KycStatus, type AdminWorker } from '@sahayo/shared';
import { Avatar } from '@/components/ui-kit/Avatar';
import { Button } from '@/components/ui-kit/Button';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { StatusPill } from '@/components/ui-kit/StatusPill';
import { count, rupees } from '@/lib/format';
import { categoryLabel, type KycQueueItem } from '@/lib/services';
import { AadhaarReveal } from './AadhaarReveal';
import { DOCUMENT_LABEL, QUEUE_STATUS, REJECTION_REASONS } from './review-copy';

export interface ReviewPaneProps {
  item?: KycQueueItem;
  worker?: AdminWorker;
  zoneName?: string;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRevealed: () => void;
}

const ZOOM_STEPS = [1, 1.5, 2, 3] as const;

/**
 * The document itself, large, with zoom and rotate.
 *
 * Rotation and zoom are CSS transforms on the image, reset whenever a new submission
 * is opened — carrying a 270° rotation from one document onto the next would make
 * the reviewer think the second photo was taken sideways.
 *
 * The scans come from a remote host, so a failed load shows a plain message instead
 * of a broken image. A reviewer cannot approve a document they cannot see, and the
 * message says so.
 */
function DocumentViewer({ src, label, resetKey }: { src: string; label: string; resetKey: string }) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setZoomIndex(0);
    setRotation(0);
    setFailed(false);
  }, [resetKey]);

  const zoom = ZOOM_STEPS[zoomIndex];

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-auto rounded-tile border border-hairline bg-ground">
        {failed ? (
          <p className="flex max-w-xs flex-col items-center gap-2 p-6 text-center text-table text-muted">
            <ImageOff size={18} strokeWidth={1.5} aria-hidden />
            The document image did not load. Do not approve without seeing it; reload the
            page or ask the worker to upload it again.
          </p>
        ) : (
          <div
            className="transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }}
          >
            <Image
              src={src}
              alt={`${label} submitted for verification`}
              width={1200}
              height={760}
              unoptimized
              onError={() => setFailed(true)}
              className="h-auto max-h-[46vh] w-auto max-w-full select-none"
              draggable={false}
            />
          </div>
        )}
      </div>

      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-pill text-muted">
          {label} · <span className="tabular">{Math.round(zoom * 100)}%</span>
          {rotation ? <> · rotated {rotation}°</> : null}
        </span>
        <span className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Zoom out"
            icon={<ZoomOut size={16} strokeWidth={1.5} aria-hidden />}
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            disabled={failed || zoomIndex === 0}
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label="Zoom in"
            icon={<ZoomIn size={16} strokeWidth={1.5} aria-hidden />}
            onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            disabled={failed || zoomIndex === ZOOM_STEPS.length - 1}
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label="Rotate a quarter turn"
            icon={<RotateCw size={16} strokeWidth={1.5} aria-hidden />}
            onClick={() => setRotation((r) => (r + 90) % 360)}
            disabled={failed}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setZoomIndex(0);
              setRotation(0);
            }}
            disabled={failed || (zoomIndex === 0 && rotation === 0)}
          >
            Reset
          </Button>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * The right-hand review pane: the document, who submitted it, and the decision.
 *
 * Approve is fund-green and filled; Reject is a coral outline and never a filled
 * coral button. The pane is focusable so Enter in the queue can move the reviewer
 * straight into it.
 */
export const ReviewPane = forwardRef<HTMLDivElement, ReviewPaneProps>(function ReviewPane(
  { item, worker, zoneName, busy, onApprove, onReject, onRevealed },
  ref,
) {
  if (!item) {
    return (
      <div ref={ref} tabIndex={-1} className="p-6 outline-none">
        <EmptyState
          title="Choose a submission to review"
          description="Pick one from the queue on the left, or press J to start from the top."
        />
      </div>
    );
  }

  const { submission } = item;
  const documentLabel = DOCUMENT_LABEL[submission.documentType] ?? submission.documentType;
  const status = QUEUE_STATUS[item.status] ?? QUEUE_STATUS[KycStatus.PENDING];
  const decided = item.status === KycStatus.VERIFIED;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      aria-label={`Review of ${item.workerName}'s ${documentLabel}`}
      className="scroll-hidden flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-6 outline-none"
    >
      <DocumentViewer src={submission.documentImageUrl} label={documentLabel} resetKey={submission.id} />

      <div className="flex items-start gap-4">
        <Avatar name={item.workerName} src={item.workerAvatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-card-title font-medium text-ink">{item.workerName}</h2>
            <StatusPill status={status.pill} label={status.label} />
          </div>
          <p className="mt-0.5 text-table text-muted">
            {categoryLabel(item.workerCategory)}
            {zoneName ? ` in ${zoneName}` : ''}
          </p>
        </div>
        <Link
          href={`/workers/${item.workerId}`}
          className="flex-none rounded-sm text-pill font-medium text-ink underline decoration-hairline underline-offset-2 hover:decoration-ink"
        >
          Open profile
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-y border-hairline py-4 sm:grid-cols-4">
        <div>
          <dt className="text-pill text-muted">Document</dt>
          <dd className="text-table text-ink">{documentLabel}</dd>
        </div>
        <div>
          <dt className="text-pill text-muted">Submitted</dt>
          <dd className="text-table text-ink">
            {new Date(submission.submittedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </dd>
        </div>
        <div>
          <dt className="text-pill text-muted">Phone</dt>
          <dd className="tabular text-table text-ink">{worker?.phone ?? '…'}</dd>
        </div>
        <div>
          <dt className="text-pill text-muted">Jobs so far</dt>
          <dd className="tabular text-table text-ink">
            {worker ? count(worker.lifetimeJobs) : '…'}
          </dd>
        </div>
      </dl>

      {submission.documentType === KycDocumentType.AADHAAR ? (
        <AadhaarReveal submission={submission} onRevealed={onRevealed} />
      ) : null}

      {submission.rejectionReason ? (
        <p className="rounded-tile border border-hairline bg-ground p-3 text-table text-muted">
          Rejected earlier for{' '}
          <span className="text-ink">
            {REJECTION_REASONS[submission.rejectionReason].label.toLowerCase()}
          </span>
          {submission.rejectionNote ? `: ${submission.rejectionNote}` : '.'}
        </p>
      ) : null}

      {worker && worker.walletBalance > 0 && item.status !== KycStatus.VERIFIED ? (
        <p className="text-pill text-muted">
          {item.workerName.split(' ')[0]} has <span className="tabular text-ink">{rupees(worker.walletBalance)}</span>{' '}
          waiting in their balance and cannot take new work until verified.
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-4">
        {/* Coral as an outline, never a fill. */}
        <Button
          variant="danger"
          icon={<X size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onReject}
          disabled={busy}
        >
          Reject document
        </Button>
        <Button
          variant="approve"
          icon={<BadgeCheck size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onApprove}
          disabled={busy || decided}
        >
          {decided ? 'Already verified' : 'Approve worker'}
        </Button>
      </div>
    </div>
  );
});
