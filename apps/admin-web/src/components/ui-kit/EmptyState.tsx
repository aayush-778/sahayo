import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconTile } from './IconTile';
import type { Tint } from './tint';

export interface EmptyStateProps {
  title: string;
  /**
   * One line of direction telling the reader what to do next. "No data" is not
   * acceptable copy — say why it is empty and what would fill it.
   */
  description: string;
  icon?: LucideIcon;
  tint?: Tint;
  /** A single action. Two choices in an empty state is one too many. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = Inbox,
  tint = 'muted',
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      <IconTile icon={icon} tint={tint} />
      <div className="max-w-sm">
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-table text-muted">{description}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
