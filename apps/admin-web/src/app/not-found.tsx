import { EmptyState } from '@/components/ui-kit/EmptyState';
import { LinkButton } from '@/components/ui-kit/LinkButton';

/**
 * An address outside every section of the portal.
 *
 * Rendered by the root layout, outside the admin shell, so it paints its own canvas and
 * card instead of Next's default white "404" page.
 */
export default function NotFound() {
  return (
    <div className="relative flex h-screen items-center justify-center p-6">
      <div aria-hidden className="canvas pointer-events-none fixed inset-0 z-0" />
      <div className="relative z-10 rounded-card border border-hairline bg-surface p-6 shadow-card">
        <EmptyState
          title="There is no page at this address"
          description="The link may be out of date or mistyped. Every section of Sahayo Admin is reachable from the dashboard's sidebar."
          action={<LinkButton href="/dashboard">Open the dashboard</LinkButton>}
        />
      </div>
    </div>
  );
}
