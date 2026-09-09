import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Phase 1 smoke test, not design work.
 *
 * This component exists to prove one thing: that NativeWind `className`
 * written inside a workspace package is picked up by each app's Tailwind
 * content scan and compiled by each app's babel config. If the class here
 * stops applying, the shared-package styling pipeline is broken — find out
 * here rather than halfway through building real UI on top of it.
 */
export function Screen({ children }: { children?: ReactNode }) {
  return <View className="flex-1 bg-white">{children}</View>;
}
