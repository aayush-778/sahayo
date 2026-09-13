'use client';

import { useEffect } from 'react';
import { RecoveryCard } from '@/components/shell/RecoveryCard';
import './globals.css';

/**
 * The last line of defence: an error in the root layout itself.
 *
 * Replaces the whole document, so it brings its own <html>, <body> and stylesheet and
 * paints the cream canvas rather than leaving a white screen on the projector.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans text-body">
        <div className="canvas fixed inset-0 -z-10" aria-hidden />
        <main className="flex h-full items-center justify-center p-6">
          <RecoveryCard
            title="Sahayo Admin needs a fresh start"
            description="Something went wrong before the portal could finish loading. Reloading rebuilds it from the start; the demo data comes back exactly as it was on first load."
            onRetry={reset}
            retryLabel="Try again"
          />
        </main>
      </body>
    </html>
  );
}
