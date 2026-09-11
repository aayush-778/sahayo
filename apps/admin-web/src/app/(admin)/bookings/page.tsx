import { CalendarCheck } from 'lucide-react';
import { PhasePlaceholder } from '@/components/shell/PhasePlaceholder';

export default function BookingsPage() {
  return (
    <PhasePlaceholder
      icon={CalendarCheck}
      title="The booking log is not built yet"
      description="Every job from request through to payment will be listed here, each one opening the timeline that the dispute queue also reads."
    />
  );
}
