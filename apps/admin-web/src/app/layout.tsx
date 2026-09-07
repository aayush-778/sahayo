import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BOOKING_STATUSES } from '@sahakar/shared';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sahakar Admin',
  // BOOKING_STATUSES is imported purely to prove @sahakar/shared resolves and
  // executes through transpilePackages at runtime. Phase 1 probe only.
  description: `Cooperative Gig Services Platform — administration (${BOOKING_STATUSES.length} booking states)`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
