import { PhasePlaceholder } from '@/components/shell/PhasePlaceholder';

export default function BookingsPage() {
  return (
    <PhasePlaceholder
      title="The full booking log is not built yet"
      description="Every job from request through to payment will be listed here. Jobs in flight are on Live Dispatch now, and each worker's profile lists the jobs they took."
      action={{ href: '/dispatch', label: 'Open live dispatch' }}
    />
  );
}
