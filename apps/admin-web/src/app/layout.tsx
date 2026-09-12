import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

/*
 * Two families, loaded once here, with strictly separated jobs. Outfit is
 * geometric and round and takes every heading and large display number; Plus
 * Jakarta Sans takes body, tables, labels and controls. Neither is loaded at
 * weight 700 — that weight is banned product-wide, so shipping it would only
 * invite its use. Do not add a third family or a Devanagari face; the product
 * is English throughout.
 */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sahayo Admin',
  description: 'Cooperative Gig Services Platform — administration',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${plusJakartaSans.variable}`}>
      <body className="font-sans text-body">{children}</body>
    </html>
  );
}
