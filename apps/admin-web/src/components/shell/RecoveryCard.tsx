'use client';

import { LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { IconTile } from '@/components/ui-kit/IconTile';

export interface RecoveryCardProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** A plain anchor, so it works even when the client router is what failed. */
  homeHref?: string;
}

/**
 * What the portal shows when something breaks.
 *
 * Calm and specific rather than a stack trace or a blank page: it says what happened,
 * that nothing has been lost, and offers the two ways out that actually work. The home
 * link is a full page load on purpose, which rebuilds the client from scratch.
 */
export function RecoveryCard({
  title,
  description,
  onRetry,
  retryLabel = 'Try this page again',
  homeHref = '/dashboard',
}: RecoveryCardProps) {
  return (
    <Card className="max-w-[520px] p-6">
      <div className="flex items-start gap-4">
        <IconTile icon={LifeBuoy} tint="marigold" />
        <div className="min-w-0">
          <h2 className="font-display text-card-title font-medium text-ink">{title}</h2>
          <p className="mt-1 text-table text-muted">{description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry ? (
              <Button variant="primary" onClick={onRetry}>
                {retryLabel}
              </Button>
            ) : null}
            <a
              href={homeHref}
              className="inline-flex h-9 items-center rounded-pill border border-hairline bg-surface px-4 text-table font-medium text-ink transition-colors hover:bg-marigold-tint/40"
            >
              Reload the dashboard
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
