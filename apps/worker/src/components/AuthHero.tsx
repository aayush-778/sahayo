import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The blue artwork band at the top of Login.
 *
 * Overlapping circles in the worker palette stand in for the reference's
 * gradient blobs — plain Views, so no SVG or gradient library is added for
 * decoration. Every shape is decorative and hidden from screen readers; the
 * only thing in the band that can be read or pressed is `children`, placed
 * top-right (the language toggle).
 *
 * The card below overlaps the band's bottom edge, so the band is drawn taller
 * than the space it visibly occupies.
 */
export function AuthHero({ children }: { children?: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="overflow-hidden bg-worker-sky" style={{ height: insets.top + 220 }}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden className="absolute inset-0">
        <View className="absolute -left-20 top-24 h-56 w-56 rounded-full bg-worker-primary/25" />
        <View className="absolute -right-16 top-6 h-64 w-64 rounded-full bg-worker-sky-light" />
        <View className="absolute -right-10 -top-20 h-52 w-52 rounded-full bg-white/60" />
        <View className="absolute right-28 top-32 h-20 w-20 rounded-full bg-white/80" />
        <View className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-worker-primary-dark" />
      </View>
      <View className="absolute right-5 flex-row" style={{ top: insets.top + 12 }}>
        {children}
      </View>
    </View>
  );
}
