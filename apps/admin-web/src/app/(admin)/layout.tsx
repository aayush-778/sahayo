import type { ReactNode } from 'react';
import { Header } from '@/components/shell/Header';
import { Sidebar } from '@/components/shell/Sidebar';

/**
 * The application shell.
 *
 * The viewport is fixed and only <main> scrolls, which is what makes the portal
 * feel like a native desk tool rather than a web page. html/body are locked to
 * h-full overflow-hidden in globals.css; nothing here may reintroduce a
 * window-level scrollbar.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      {/*
       * Light falling on paper from the top-left corner. Fixed, non-interactive,
       * and behind every panel — the sidebar and header both sit on the opaque
       * surface colour, so the glow only reads across <main>.
       */}
      <div aria-hidden className="page-glow pointer-events-none fixed inset-0 z-0" />

      <Sidebar />

      <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
