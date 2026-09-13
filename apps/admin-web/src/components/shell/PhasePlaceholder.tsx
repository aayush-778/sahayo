import { EmptyState } from '@/components/ui-kit/EmptyState';
import { LinkButton } from '@/components/ui-kit/LinkButton';

export interface PhasePlaceholderProps {
  /** What this screen will show once it is built. */
  title: string;
  /** One line of honest direction: what arrives here, and where to look meanwhile. */
  description: string;
  /** Where the same information can already be found. */
  action: { href: string; label: string };
}

/**
 * Stands in for a route the navigation reaches but the prototype has not built.
 *
 * A nav item that leads to a 404 is worse than one that says what is coming, and a page
 * that says what is coming is worse than one that also says where to go instead — so
 * every placeholder carries a link to the page where that information already lives.
 */
export function PhasePlaceholder({ title, description, action }: PhasePlaceholderProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={<LinkButton href={action.href}>{action.label}</LinkButton>}
    />
  );
}
