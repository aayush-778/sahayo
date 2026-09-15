import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@sahayo/ui-native';

const STARS = [1, 2, 3, 4, 5] as const;

/**
 * Five stars. Pass `onChange` to make it a picker — each star is then a 48dp
 * target — or leave it out to show a rating read-only.
 */
export function StarRating({
  value,
  onChange,
  size = 18,
  starLabel,
}: {
  value: number;
  onChange?: (stars: number) => void;
  size?: number;
  /** Already translated, e.g. "4 of 5 stars". */
  starLabel: (stars: number) => string;
}) {
  const colors = useThemeColors();

  if (!onChange) {
    return (
      <View className="flex-row" accessibilityRole="image" accessibilityLabel={starLabel(value)}>
        {STARS.map((star) => (
          <Ionicons
            key={star}
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? colors.warning : colors.outline}
          />
        ))}
      </View>
    );
  }

  return (
    <View className="flex-row" accessibilityRole="radiogroup">
      {STARS.map((star) => (
        <Pressable
          key={star}
          className="h-12 w-12 items-center justify-center"
          onPress={() => onChange(star)}
          accessibilityRole="radio"
          accessibilityState={{ selected: star === value }}
          accessibilityLabel={starLabel(star)}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? colors.warning : colors.outline}
          />
        </Pressable>
      ))}
    </View>
  );
}
