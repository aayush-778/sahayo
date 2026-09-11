import { UserRound } from 'lucide-react';
import { PhasePlaceholder } from '@/components/shell/PhasePlaceholder';

export default function CustomersPage() {
  return (
    <PhasePlaceholder
      icon={UserRound}
      title="The customer directory is not built yet"
      description="Households and businesses that book work will be listed here, with their booking history and any disputes they have raised."
    />
  );
}
