import { Wallet } from 'lucide-react';
import { PhasePlaceholder } from '@/components/shell/PhasePlaceholder';

export default function FinancePage() {
  return (
    <PhasePlaceholder
      icon={Wallet}
      title="The finance hub arrives in Phase 5"
      description="The 85 / 10 / 5 split and the append-only ledger live here, with a trace ID on every entry and reversals issued as new rows."
    />
  );
}
