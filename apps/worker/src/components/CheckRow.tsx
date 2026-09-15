import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

/**
 * A checkbox where the whole row is the target.
 *
 * ui-native's Checkbox toggles only on the box, because its labels can hold a
 * link. These labels never do — a sub-service, a weekday — so the entire 56dp
 * row toggles, which is what a thumb in a glove in sunlight needs. The box is
 * 28dp with a 2dp outline that clears 3:1 against the card.
 */
export function CheckRow({
  label,
  checked,
  onToggle,
  children,
  className = '',
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  /** Extra lines under the label, e.g. a declaration's small print. */
  children?: ReactNode;
  className?: string;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      className={`min-h-12 flex-row items-center py-2 ${className}`}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View
        className={`h-7 w-7 items-center justify-center rounded-md border-2 ${
          checked ? 'border-worker-primary bg-worker-primary' : 'border-worker-outline bg-worker-surface'
        }`}
      >
        {checked ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
      </View>
      <View className="ml-3 flex-1">
        <Text weight={checked ? 'semibold' : 'regular'} className="text-base text-worker-ink">
          {label}
        </Text>
        {children}
      </View>
    </Pressable>
  );
}
