import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The bar pinned to the bottom of a screen that holds its one next action,
 * always under the thumb however far the page has scrolled.
 */
export function ActionBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="border-t border-worker-border bg-worker-surface" style={{ paddingBottom: insets.bottom + 10 }}>
      <View className="w-full max-w-xl gap-2 self-center px-5 pt-3">{children}</View>
    </View>
  );
}
