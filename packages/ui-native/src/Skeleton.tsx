import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

/**
 * A loading placeholder.
 *
 * Shape is the caller's business — pass the same `className` the real element
 * will have, so the skeleton occupies exactly the space the content will and
 * nothing reflows when it arrives. That is the whole point of a skeleton over
 * a spinner: a spinner tells you to wait, a skeleton tells you what is coming
 * and stops the page jumping when it does.
 *
 * The pulse uses `Animated` from React Native core with the native driver, so
 * it runs off the JS thread and keeps going smoothly while the work it is
 * standing in for is actually happening. Same reasoning as the booking map:
 * no Reanimated, no extra native wiring.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      className={`bg-brand-border ${className}`}
      // Opacity cannot come from a class here: it is a live animated value,
      // which is exactly the case the NativeWind rule carves out.
      style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }) }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/**
 * A stand-in for one card in a list.
 *
 * Three lines and an avatar block, which is the shape every list in this app
 * happens to share — a booking row, a worker row, a search result.
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <View className={`rounded-2xl border border-brand-border bg-brand-surface p-4 ${className}`}>
      <View className="flex-row items-center">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <View className="ml-3 flex-1">
          <Skeleton className="h-3.5 w-2/3 rounded" />
          <Skeleton className="mt-2 h-3 w-1/3 rounded" />
        </View>
      </View>
      <Skeleton className="mt-3 h-3 w-full rounded" />
      <Skeleton className="mt-2 h-3 w-4/5 rounded" />
    </View>
  );
}
