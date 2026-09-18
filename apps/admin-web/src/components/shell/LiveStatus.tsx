'use client';

import { useLiveMode } from '@/lib/services';
import { cn } from '@/lib/utils';

/**
 * Whether the portal is showing the live platform or its own demo data, as a pill in
 * the header. The administrator should never have to guess which they are looking at.
 */
export function LiveStatus({ className }: { className?: string }) {
  const { mode } = useLiveMode();
  if (mode === 'idle') return null;

  const view = {
    connecting: { dot: 'bg-muted', label: 'Connecting' },
    live: { dot: 'bg-fund-green', label: 'Live' },
    reconnecting: { dot: 'bg-marigold', label: 'Reconnecting' },
    offline: { dot: 'bg-muted', label: 'Demo data' },
  }[mode];

  return (
    <span
      className={cn('gap-2 px-3 text-pill font-medium text-ink', className)}
      title={mode === 'offline' ? 'The backend is not reachable. Every page shows the portal’s own seeded data.' : undefined}
      aria-live="polite"
    >
      <span className={cn('h-2 w-2 rounded-pill', view.dot, mode === 'live' && 'animate-pulse')} aria-hidden />
      {view.label}
    </span>
  );
}
