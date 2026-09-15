import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TINT_TILE, type Tint } from './tint';

export interface IconTileProps {
  icon: LucideIcon;
  tint?: Tint;
  /** 12px-radius tile at 40px, or 32px where space is tight. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Every icon in the product sits in one of these. Icons are 18px at stroke 1.5,
 * always, and the tile tint follows the semantic role of its subject.
 */
export function IconTile({ icon: Icon, tint = 'marigold', size = 'md', className }: IconTileProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex flex-none items-center justify-center rounded-tile',
        size === 'md' ? 'h-10 w-10' : 'h-8 w-8',
        TINT_TILE[tint],
        className,
      )}
    >
      <Icon size={18} strokeWidth={1.5} />
    </span>
  );
}
