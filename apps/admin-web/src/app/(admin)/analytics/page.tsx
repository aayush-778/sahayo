import { TrendingUp } from 'lucide-react';
import { PhasePlaceholder } from '@/components/shell/PhasePlaceholder';

export default function AnalyticsPage() {
  return (
    <PhasePlaceholder
      icon={TrendingUp}
      title="Analytics are not built yet"
      description="Demand by zone, the mix of service categories, and how evenly work is shared between members will be reported here."
    />
  );
}
