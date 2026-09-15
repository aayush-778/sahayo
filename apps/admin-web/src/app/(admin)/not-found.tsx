import { EmptyState } from '@/components/ui-kit/EmptyState';
import { LinkButton } from '@/components/ui-kit/LinkButton';

export default function AdminNotFound() {
  return (
    <EmptyState
      title="There is no page at this address"
      description="The link may be out of date, or the record it pointed to no longer exists. Every section of the portal is in the sidebar."
      action={<LinkButton href="/dashboard">Open the dashboard</LinkButton>}
    />
  );
}
