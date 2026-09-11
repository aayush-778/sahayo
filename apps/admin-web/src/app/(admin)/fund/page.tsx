import { HandCoins } from 'lucide-react';
import { PhasePlaceholder } from '@/components/shell/PhasePlaceholder';

export default function FundPage() {
  return (
    <PhasePlaceholder
      icon={HandCoins}
      title="The cooperative fund arrives in Phase 8"
      description="Workers' proposals, the votes cast on them, and the micro-loans the fund has paid out will all be shown here."
    />
  );
}
