import { useMemo, useRef, useState } from 'react';
import { PanResponder, View, type GestureResponderEvent } from 'react-native';
import { Text } from '@sahayo/ui-native';

/**
 * A whole-number slider, built on PanResponder.
 *
 * @react-native-community/slider is a native module this app does not
 * otherwise carry. This one tracks a finger anywhere on its 48dp-tall strip —
 * not just on the thumb — so it can be set with one imprecise touch, and it is
 * `adjustable` for TalkBack: swipe up or down to change the value by one.
 */
export function RangeSlider({
  label,
  value,
  min,
  max,
  onChange,
  formatValue,
  className = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  className?: string;
}) {
  const railRef = useRef<View>(null);
  const railX = useRef(0);
  const railWidth = useRef(0);
  const [width, setWidth] = useState(0);

  const responder = useMemo(() => {
    const valueAt = (pageX: number): number | null => {
      if (railWidth.current <= 0) return null;
      const ratio = Math.min(1, Math.max(0, (pageX - railX.current) / railWidth.current));
      return Math.round(min + ratio * (max - min));
    };
    const follow = (event: GestureResponderEvent) => {
      const next = valueAt(event.nativeEvent.pageX);
      if (next !== null) onChange(next);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Once a drag starts here, a vertical wobble must not hand it to the ScrollView.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        const pageX = event.nativeEvent.pageX;
        // Measured on every touch: the form may have scrolled or reflowed since layout.
        railRef.current?.measureInWindow((x, _y, measured) => {
          railX.current = x;
          railWidth.current = measured;
          const next = valueAt(pageX);
          if (next !== null) onChange(next);
        });
      },
      onPanResponderMove: follow,
    });
  }, [min, max, onChange]);

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const shown = formatValue(value);

  return (
    <View className={className}>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text weight="semibold" className="text-base text-worker-ink">
          {label}
        </Text>
        <View className="rounded-full bg-worker-primary-tint px-3 py-1">
          <Text weight="bold" className="text-sm text-worker-primary">
            {shown}
          </Text>
        </View>
      </View>

      <View
        className="mt-2 h-12 justify-center px-4"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: shown }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + 1));
          if (event.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - 1));
        }}
        {...responder.panHandlers}
      >
        <View
          ref={railRef}
          className="h-2 rounded-full bg-worker-primary-soft"
          onLayout={(event) => {
            railWidth.current = event.nativeEvent.layout.width;
            setWidth(event.nativeEvent.layout.width);
          }}
        >
          <View className="absolute left-0 top-0 h-2 rounded-full bg-worker-primary" style={{ width: width * ratio }} />
          <View
            className="absolute -top-2.5 h-7 w-7 rounded-full border-4 border-worker-primary bg-worker-surface"
            style={{ left: width * ratio - 14 }}
          />
        </View>
      </View>

      <View className="flex-row justify-between">
        <Text className="text-sm text-worker-muted">{formatValue(min)}</Text>
        <Text className="text-sm text-worker-muted">{formatValue(max)}</Text>
      </View>
    </View>
  );
}
