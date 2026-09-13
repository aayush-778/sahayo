import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * The one container in the product. Structural cards carry the 24px radius and
 * the two-layer warm shadow; nested panels pass `flat` to sit inside a parent
 * card on a hairline instead of stacking another shadow.
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  flat?: boolean;
}

export function Card({ className, flat = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-hairline bg-surface',
        flat ? 'shadow-none' : 'shadow-card',
        className,
      )}
      {...props}
    />
  );
}
