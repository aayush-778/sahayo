import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeltaPillProps {
  /** Signed percentage change. Its sign alone picks the colour and the arrow. */
  value: number;
  /** Trailing context, e.g. "this month". Keeps the pill self-explanatory. */
  period?: string;
  className?: string;
}

/**
 * A movement, not a status. Green for up, coral for down — but the arrow glyph
 * and the signed number carry the same information, so the colour is never the
 * only signal.
 */
export function DeltaPill({ value, period, className }: DeltaPillProps) {
  const isUp = value >= 0;
  const Arrow = isUp ? ArrowUpRight : ArrowDownRight;
  const formatted = `${isUp ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2 py-1 text-pill font-semibold',
        isUp ? 'bg-fund-green/15 text-fund-green' : 'bg-coral/20 text-ink',
        className,
      )}
    >
      <Arrow size={12} strokeWidth={2} aria-hidden />
      <span className="tabular">{formatted}</span>
      {period ? <span className="font-medium opacity-80">{period}</span> : null}
    </span>
  );
}
