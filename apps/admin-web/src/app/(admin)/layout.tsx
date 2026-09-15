import type { ReactNode } from 'react';
import { Header } from '@/components/shell/Header';
import { Sidebar } from '@/components/shell/Sidebar';

/**
 * The application shell.
 *
 * The viewport is fixed and only <main> scrolls, which is what makes the portal
 * feel like a native desk tool rather than a web page. html/body are locked to
 * height 100% / overflow hidden in globals.css; nothing here may reintroduce a
 * window-level scrollbar.
 *
 * THE SURFACE RELATIONSHIP: the sidebar, the header and <main> are all
 * transparent and sit on the same cream canvas, separated only by hairlines.
 * Cards are the only white surfaces in the product. Giving the sidebar or header
 * a white panel inverts the depth and makes the page look unfinished.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-transparent">
      {/* The canvas: cream base, marigold bloom off the top-left, white veil. */}
      <div aria-hidden className="canvas pointer-events-none fixed inset-0 z-0" />

      <Sidebar />

      <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col bg-transparent">
        <Header />
        <main className="scroll-hidden flex-1 overflow-y-auto bg-transparent px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
