import Image from 'next/image';
import logo from '@/assets/sahayo-logo.png';
import { cn } from '@/lib/utils';

/**
 * The Sahayo mark and name, together.
 *
 * The mark is the cooperative's emblem — a tree whose roots are hands — the same artwork
 * the browser tab shows. It replaced a marigold diamond that stood in for the emblem
 * before there was a file to use.
 *
 * Imported rather than read from `public/`, and left unoptimized, so the build emits it
 * under `/_next/static/` — which is exactly what the service worker precaches. Served any
 * other way, the portal's own logo would be the one thing missing when it runs offline.
 *
 * `priority` because the rail's logo is on screen at first paint.
 */
export function Wordmark({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  const px = size === 'md' ? 28 : 22;

  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Image
        src={logo}
        alt=""
        aria-hidden
        width={px}
        height={px}
        priority
        unoptimized
        className="flex-none"
        style={{ width: px, height: px }}
      />
      <span className={cn('font-display font-medium text-ink', size === 'md' ? 'text-3xl' : 'text-card-title')}>Sahayo</span>
    </span>
  );
}
