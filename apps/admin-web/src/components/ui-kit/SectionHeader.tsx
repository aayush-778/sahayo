import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned action slot — a toggle, a filter, a link. */
  action?: ReactNode;
  className?: string;
  /** Heading level, so a page keeps one h1 and a sensible outline beneath it. */
  as?: 'h2' | 'h3';
}

/**
 * Section titles sit directly above their content. There is deliberately no
 * eyebrow label slot: tracked-out all-caps text above a heading is banned.
 */
export function SectionHeader({
  title,
  subtitle,
  action,
  className,
  as: Heading = 'h2',
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <Heading className="font-display text-card-title font-medium text-ink">{title}</Heading>
        {subtitle ? <p className="mt-1 text-table text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}
