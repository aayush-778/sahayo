import { EmptyState } from '@/components/ui-kit/EmptyState';

export interface PhasePlaceholderProps {
  /** What this screen will show once it is built. */
  title: string;
  /** One line of honest direction — what arrives here, and when. */
  description: string;
}

/**
 * Stands in for a route the shell can already reach but no phase has filled yet.
 *
 * It exists so the navigation is complete and clickable from Phase 0 onward: a
 * nav item that leads to a 404 is worse than one that leads to a line saying
 * what is coming. Deliberately not wrapped in a card — it sits inline at the top
 * of the region exactly as a real empty state will. Each of these is deleted by
 * the phase that builds its page.
 */
export function PhasePlaceholder({ title, description }: PhasePlaceholderProps) {
  return <EmptyState title={title} description={description} />;
}
