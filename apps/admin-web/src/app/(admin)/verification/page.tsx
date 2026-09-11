import { BadgeCheck } from 'lucide-react';
import { PhasePlaceholder } from '@/components/shell/PhasePlaceholder';

export default function VerificationPage() {
  return (
    <PhasePlaceholder
      icon={BadgeCheck}
      title="The verification queue arrives in Phase 6"
      description="Submitted documents will be reviewed side by side with the worker's details. Aadhaar references stay masked, and every reveal is logged."
    />
  );
}
