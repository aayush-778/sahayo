import { View } from 'react-native';
import { Text } from '@sahayo/ui-native';

export interface Bar {
  key: string;
  /** Already translated, e.g. a weekday. */
  label: string;
  value: number;
  /** Already translated; what a screen reader says for this bar. */
  description: string;
  highlight?: boolean;
}

/**
 * Plain vertical bars built from Views — no chart library for seven numbers.
 *
 * `onDark` draws white bars for a coloured card. Every bar is also a text
 * label for screen readers, since a bar's height means nothing to TalkBack.
 * Bar heights are inline styles: a computed height is not a className.
 */
export function MiniBarChart({ bars, height = 96, onDark = false }: { bars: Bar[]; height?: number; onDark?: boolean }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));

  return (
    <View className="flex-row items-end gap-2">
      {bars.map((bar) => {
        const barClass = onDark
          ? bar.highlight
            ? 'bg-white'
            : 'bg-white/60'
          : bar.highlight
            ? 'bg-worker-primary'
            : 'bg-worker-sky';
        return (
          <View key={bar.key} className="flex-1 items-center" accessible accessibilityLabel={bar.description}>
            <View className="w-full items-center justify-end" style={{ height }}>
              <View
                className={`w-full max-w-[28px] rounded-t-md ${barClass}`}
                style={{ height: bar.value > 0 ? Math.max(4, (bar.value / max) * height) : 2 }}
              />
            </View>
            <Text
              weight={bar.highlight ? 'bold' : 'regular'}
              className={`mt-1 text-xs ${onDark ? 'text-white' : bar.highlight ? 'text-worker-ink' : 'text-worker-muted'}`}
              numberOfLines={1}
            >
              {bar.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
