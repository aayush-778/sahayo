import { PhasePlaceholder } from '@/components/shell/PhasePlaceholder';

export default function AnalyticsPage() {
  return (
    <PhasePlaceholder
      title="Analytics are not built yet"
      description="Longer-range reports will live here. Demand by zone, the category mix and how evenly work is shared are on the dashboard now."
      action={{ href: '/dashboard', label: 'Open the dashboard' }}
    />
  );
}
