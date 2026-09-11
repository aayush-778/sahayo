import { Gauge } from 'lucide-react';
import { PhasePlaceholder } from '@/components/shell/PhasePlaceholder';

export default function DashboardPage() {
  return (
    <PhasePlaceholder
      icon={Gauge}
      title="The executive dashboard is next"
      description="Phase 2 fills this screen with the cooperative fund total, revenue against fund growth, the zone demand map, and hiring by category."
    />
  );
}
