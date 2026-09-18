import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { IconTile } from '@/components/ui-kit/IconTile';
import { Wordmark } from '@/components/ui-kit/Wordmark';
import { CURRENT_ADMIN } from '@/lib/nav/session';

/**
 * Where "Sign out" lands.
 *
 * The prototype has no real accounts, so signing out cannot end a session. It still
 * leaves the portal, the way a demo audience expects, and says plainly how to get back.
 */
export default function SignedOutPage() {
  return (
    <div className="relative flex h-screen items-center justify-center p-6">
      <div aria-hidden className="canvas pointer-events-none fixed inset-0 z-0" />
      <main className="relative z-10 w-full max-w-[440px] rounded-card border border-hairline bg-surface p-8 shadow-card">
        <Wordmark size="sm" />
        <IconTile icon={LogOut} tint="marigold" className="mt-8" />
        <h1 className="mt-4 font-display text-page-title font-medium text-ink">You have signed out</h1>
        <p className="mt-2 text-table text-muted">
          This prototype has no real accounts, so nothing was ended and nothing you changed was lost. Sign back in to
          carry on where you left off.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center rounded-pill bg-marigold px-5 text-table font-medium text-ink transition-colors hover:bg-marigold/85"
        >
          Sign in as {CURRENT_ADMIN.name}
        </Link>
      </main>
    </div>
  );
}
