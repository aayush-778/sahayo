import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

/*
 * One family for the entire product. Do not add a second typeface, and do not
 * add a Devanagari face — the admin portal is English throughout. Plus Jakarta
 * Sans covers ₹ at every weight we load, including the 36px hero metric.
 */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sahayo Admin',
  description: 'Cooperative Gig Services Platform — administration',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="font-sans text-body">{children}</body>
    </html>
  );
}
