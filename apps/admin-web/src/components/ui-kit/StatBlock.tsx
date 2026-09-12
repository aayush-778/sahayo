import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DeltaPill } from './DeltaPill';
import { IconTile } from './IconTile';
import type { Tint } from './tint';

export interface StatBlockProps {
  label: string;
  /** Pre-formatted for display — rupee grouping happens at the call site. */
  value: string;
  icon: LucideIcon;
  tint?: Tint;
  /** Signed percentage; renders a DeltaPill when present. */
  delta?: number;
  deltaPeriod?: string;
  /** One plain line under the value, e.g. "of 140". */
  note?: string;
  /** Anything that belongs below the figure — a progress bar, a link. */
  children?: ReactNode;
  /** `hero` is reserved for the single most important number on a page. */
  emphasis?: 'hero' | 'supporting';
  className?: string;
}

/**
 * The figure primitive. `hero` gets the 36px tabular treatment; `supporting`
 * steps down to 24px so a row of stats reads as visibly lighter weight than the
 * number it sits beside. Four of these at identical size in one row is banned —
 * vary the grid spans and the emphasis.
 */
export function StatBlock({
  label,
  value,
  icon,
  tint = 'marigold',
  delta,
  deltaPeriod,
  note,
  children,
  emphasis = 'supporting',
  className,
}: StatBlockProps) {
  const isHero = emphasis === 'hero';

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <IconTile icon={icon} tint={tint} size={isHero ? 'md' : 'sm'} />
      <div>
        <p className="text-table text-muted">{label}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={cn(
              'tabular font-display font-medium text-ink',
              isHero ? 'text-hero' : 'text-stat',
            )}
          >
            {value}
          </span>
          {note ? <span className="text-table text-muted">{note}</span> : null}
          {delta === undefined ? null : <DeltaPill value={delta} period={deltaPeriod} />}
        </div>
      </div>
      {children}
    </div>
  );
}
