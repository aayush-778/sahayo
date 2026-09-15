import { View } from 'react-native';
import { Text } from '@sahayo/ui-native';

import type { BadgeTone } from '../lib/status';

/* Whole literals, so Tailwind's scanner finds every class. */
const GROUND: Record<BadgeTone, string> = {
  primary: 'bg-worker-primary-tint',
  success: 'bg-worker-success-soft',
  warning: 'bg-worker-warning-soft',
  danger: 'bg-worker-danger-soft',
  muted: 'bg-worker-border',
};

const INK: Record<BadgeTone, string> = {
  primary: 'text-worker-primary',
  success: 'text-worker-success',
  warning: 'text-worker-warning',
  danger: 'text-worker-danger',
  muted: 'text-worker-muted',
};

/** A small status pill. Every tone's text clears 4.5:1 on its own ground. */
export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${GROUND[tone]}`}>
      <Text weight="semibold" className={`text-xs ${INK[tone]}`}>
        {label}
      </Text>
    </View>
  );
}
