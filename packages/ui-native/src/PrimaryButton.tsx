import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { brandColors } from '../tokens';
import { Text } from './Text';

export interface PrimaryButtonProps extends Omit<PressableProps, 'children'> {
  /** Already translated by the caller. */
  label: string;
  loading?: boolean;
  className?: string;
}

/**
 * The full-width primary action.
 *
 * Disabled uses `brand-primary-soft` with muted text rather than an opacity
 * knock-down: opacity over the cream ground produces a washed green that is
 * hard to distinguish from the enabled state in a photograph, which is how
 * most people will see this app.
 *
 * `loading` implies disabled — a spinner on a still-tappable button invites
 * the double submit it is meant to prevent.
 */
export function PrimaryButton({
  label,
  loading = false,
  disabled = false,
  className = '',
  ...rest
}: PrimaryButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      className={`h-14 flex-row items-center justify-center rounded-xl ${
        inactive ? 'bg-brand-primary-soft' : 'bg-brand-primary'
      } ${className}`}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityLabel={label}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={brandColors.muted} />
      ) : (
        <Text
          weight="semibold"
          className={inactive ? 'text-base text-brand-muted' : 'text-base text-white'}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
