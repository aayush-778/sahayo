import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

export interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  /**
   * The tick, drawn only when checked. A node rather than an icon name so
   * this package needs no icon dependency — see FormField for the same
   * reasoning.
   */
  checkIcon?: ReactNode;
  /** The label. A node, because it usually mixes plain text with a link. */
  children: ReactNode;
  /** Used as the accessibility label, since `children` may be rich content. */
  accessibilityLabel: string;
  className?: string;
}

/**
 * A square checkbox with a label beside it.
 *
 * Only the box itself toggles. The label commonly contains a link — "Agree
 * with Terms & Conditions" — and a label that both toggles the box and
 * contains a tappable link gives two different outcomes for what looks like
 * one target, which is worse than a slightly smaller hit area.
 */
export function Checkbox({
  checked,
  onToggle,
  checkIcon,
  children,
  accessibilityLabel,
  className = '',
}: CheckboxProps) {
  return (
    <View className={`flex-row items-center ${className}`}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={accessibilityLabel}
        // Enlarges the touch target to a usable size without enlarging the
        // 20pt box the design calls for.
        hitSlop={10}
        className={`h-5 w-5 items-center justify-center rounded-md border ${
          checked ? 'border-brand-primary bg-brand-primary-tint' : 'border-brand-border'
        }`}
      >
        {checked ? checkIcon : null}
      </Pressable>

      <View className="ml-3 flex-1 flex-row flex-wrap items-center">{children}</View>
    </View>
  );
}
