import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  /** Number of stacked lines; the last is shortened so it reads as text. */
  lines?: number;
}

/**
 * Hairline shimmer, never a spinner. Every card shows one of these while its
 * service call resolves, so the 120–300ms delay looks deliberate rather than
 * broken.
 */
export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  if (lines === 1) {
    return <div aria-hidden className={cn('skeleton h-4 w-full', className)} />;
  }

  return (
    <div aria-hidden className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn('skeleton h-4', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}
