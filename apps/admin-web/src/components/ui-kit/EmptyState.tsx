import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** One 15px line of direction. Say what is missing in plain words. */
  title: string;
  /**
   * One 13.5px line of detail saying what would fill the region. "No data" is
   * not acceptable copy — the reader should learn what to do next.
   */
  description: string;
  /** A single action. Two choices in an empty state is one too many. */
  action?: ReactNode;
  className?: string;
}

/**
 * Left-aligned and inline at the top of the region it belongs to.
 *
 * Deliberately NOT a large centred rounded box floating in the middle of the
 * viewport with a centred icon tile above two centred lines. That shape is the
 * most recognisable generated empty state there is, and because every feature
 * page consumes this primitive, getting it wrong would propagate the look
 * through the whole product. No card wrapper, no icon tile, no centring.
 */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('max-w-[420px] py-2 text-left', className)}>
      <p className="text-body text-ink">{title}</p>
      <p className="mt-1 text-table text-muted">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
