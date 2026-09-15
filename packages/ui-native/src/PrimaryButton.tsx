import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { Text } from './Text';
import { useThemeClasses, useThemeColors } from './theme';

export interface PrimaryButtonProps extends Omit<PressableProps, 'children'> {
  /** Already translated by the caller. */
  label: string;
  loading?: boolean;
  className?: string;
}

/**
 * The full-width primary action.
 *
 * Disabled uses the theme's soft primary ground with muted text rather than
 * an opacity knock-down: opacity over a pale screen ground produces a washed
 * tone that is hard to distinguish from the enabled state in a photograph,
 * which is how most people will see this app — and in sunlight, which is how
 * a worker will.
 *
 * `loading` implies disabled — a spinner on a still-tappable button invites
 * the double submit it is meant to prevent.
 *
 * Height is 56 in both apps, which clears the 48dp floor for a thumb.
 */
export function PrimaryButton({
  label,
  loading = false,
  disabled = false,
  className = '',
  ...rest
}: PrimaryButtonProps) {
  const themed = useThemeClasses();
  const colors = useThemeColors();
  const inactive = disabled || loading;

  return (
    <Pressable
      className={`${themed.buttonHeight} flex-row items-center justify-center rounded-xl ${
        inactive ? themed.primarySoftBg : themed.primaryBg
      } ${className}`}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityLabel={label}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.muted} />
      ) : (
        <Text
          weight="semibold"
          className={
            inactive ? `${themed.bodySize} ${themed.muted}` : `${themed.bodySize} ${themed.onPrimary}`
          }
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
