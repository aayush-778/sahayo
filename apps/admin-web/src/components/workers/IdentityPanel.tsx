'use client';

import { BadgeCheck, FileText, MessageSquare, Star, UserMinus } from 'lucide-react';
import { KycStatus, type AdminWorker } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { Avatar } from '@/components/ui-kit/Avatar';
import { count, rupees } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface IdentityPanelProps {
  worker: AdminWorker;
  zoneName: string;
  onViewDocuments: () => void;
  onSuspend: () => void;
  busy?: boolean;
}

/** Five stars, filled to the rating. The number beside it carries the real value. */
function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((position) => (
        <Star
          key={position}
          size={14}
          strokeWidth={1.5}
          className={cn(
            position <= Math.round(rating) ? 'fill-marigold text-marigold' : 'text-hairline',
          )}
        />
      ))}
    </span>
  );
}

/**
 * The worker's identity panel: who they are and what they are owed.
 *
 * Sticky, four columns wide, and deliberately not a centred card — the profile is
 * a record being worked on, not a business card. The three money figures sit
 * stacked and separated by hairlines because they answer three different
 * questions, and the fund contribution is in fund-green because that is the one
 * that makes this platform a cooperative.
 */
export function IdentityPanel({
  worker,
  zoneName,
  onViewDocuments,
  onSuspend,
  busy = false,
}: IdentityPanelProps) {
  const verified = worker.kycStatus === KycStatus.VERIFIED;

  return (
    <Card className="sticky top-0 col-span-12 flex flex-col p-6 lg:col-span-4">
      <div className="flex items-start gap-4">
        <span className="relative flex-none">
          <Avatar name={worker.name} src={worker.avatarUrl} size={96} />
          {verified ? (
            <span
              className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-fund-green ring-4 ring-surface"
              title="Documents verified"
            >
              <BadgeCheck size={16} strokeWidth={2} aria-hidden className="text-surface" />
              <span className="sr-only">Documents verified</span>
            </span>
          ) : null}
        </span>

        <div className="min-w-0 pt-1">
          <h2 className="font-display text-card-title font-medium text-ink">{worker.name}</h2>
          <p className="mt-0.5 text-table text-muted">
            {worker.category.charAt(0) + worker.category.slice(1).toLowerCase()} in {zoneName}
          </p>
          <p className="mt-2 flex items-center gap-2">
            <StarRow rating={worker.rating} />
            <span className="tabular text-table text-ink">{worker.rating.toFixed(1)}</span>
            <span className="tabular text-pill text-muted">
              {count(worker.ratingCount)} ratings
            </span>
          </p>
        </div>
      </div>

      <dl className="mt-5 flex flex-col gap-2 border-t border-hairline pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-table text-muted">Phone</dt>
          <dd className="tabular text-table text-ink">{worker.phone}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-table text-muted">Joined</dt>
          <dd className="text-table text-ink">
            {new Date(worker.joinedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-table text-muted">Lifetime jobs</dt>
          <dd className="tabular text-table text-ink">{count(worker.lifetimeJobs)}</dd>
        </div>
      </dl>

      <dl className="mt-4 flex flex-col divide-y divide-hairline border-t border-hairline">
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-table text-muted">Wallet balance</dt>
          <dd className="tabular font-display text-card-title font-medium text-ink">
            {rupees(worker.walletBalance)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-table text-muted">Lifetime earnings</dt>
          <dd className="tabular font-display text-card-title font-medium text-ink">
            {rupees(worker.lifetimeEarnings)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-table text-muted">Put into the fund</dt>
          <dd className="tabular font-display text-card-title font-medium text-fund-green">
            {rupees(worker.fundContributed)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-4">
        <Button
          variant="outline"
          icon={<MessageSquare size={16} strokeWidth={1.5} aria-hidden />}
          disabled={busy}
        >
          Message worker
        </Button>
        <Button
          variant="outline"
          icon={<FileText size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onViewDocuments}
        >
          View documents
        </Button>
        {/* Coral as an outline, never a fill. A suspension is not a primary action. */}
        <Button
          variant="danger"
          icon={<UserMinus size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onSuspend}
          disabled={busy || !worker.isOnline}
        >
          Suspend worker
        </Button>
      </div>
    </Card>
  );
}
