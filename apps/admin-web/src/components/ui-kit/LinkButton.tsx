import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A link styled as the small outline button.
 *
 * For actions that take the administrator somewhere else — an empty state's way out,
 * or a log that lives on another page. Navigation stays a real link, so it can be
 * opened in a new tab and is announced as a link rather than a button.
 */
export function LinkButton({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-pill border border-hairline bg-surface px-3 text-pill font-medium text-ink transition-colors hover:bg-marigold-tint/40',
        className,
      )}
    >
      {children}
    </Link>
  );
}
