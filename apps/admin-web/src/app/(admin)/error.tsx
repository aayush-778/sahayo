'use client';

import { useEffect } from 'react';
import { RecoveryCard } from '@/components/shell/RecoveryCard';

/**
 * The error boundary for every admin page.
 *
 * Sits inside the shell, so the sidebar and header stay put and the administrator can
 * navigate away from the broken page as normal. The error is logged for whoever is
 * debugging, never shown on screen.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <RecoveryCard
      title="This page stopped working"
      description="Something went wrong while showing it. Nothing you changed has been lost, and the rest of the portal still works. Try the page again, or open another from the sidebar."
      onRetry={reset}
    />
  );
}
