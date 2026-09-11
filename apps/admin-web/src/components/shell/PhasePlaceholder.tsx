import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';

export interface PhasePlaceholderProps {
  /** What this screen will show once it is built. */
  title: string;
  /** One line of honest direction — what arrives here, and when. */
  description: string;
  icon: LucideIcon;
}

/**
 * Stands in for a route the shell can already reach but no phase has filled yet.
 *
 * It exists so the navigation is complete and clickable from Phase 0 onward: a
 * nav item that leads to a 404 is worse than one that leads to a card saying
 * what is coming. Each of these is deleted by the phase that builds its page.
 */
export function PhasePlaceholder({ title, description, icon }: PhasePlaceholderProps) {
  return (
    <Card className="mx-auto max-w-xl">
      <EmptyState title={title} description={description} icon={icon} />
    </Card>
  );
}
