import { PhasePlaceholder } from '@/components/shell/PhasePlaceholder';

export default function CustomersPage() {
  return (
    <PhasePlaceholder
      title="The customer directory is not built yet"
      description="Households and businesses that book work will be listed here. Their complaints, with the jobs behind them, are in the dispute queue now."
      action={{ href: '/disputes', label: 'Open the dispute queue' }}
    />
  );
}
