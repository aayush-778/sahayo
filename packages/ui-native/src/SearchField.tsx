import type { ReactNode } from 'react';
import { TextInput, View } from 'react-native';
import { Text } from './Text';
import { useThemeClasses, useThemeColors } from './theme';

export interface SearchFieldProps {
  /** Already translated by the caller. This package never touches i18n. */
  placeholder: string;
  value?: string;
  onChangeText?: (value: string) => void;
  /**
   * Renders a View instead of a TextInput.
   *
   * For screens where search is not wired yet. A `TextInput` with
   * `editable={false}` still looks focusable and, on some Android keyboards,
   * still raises the IME — which reads as a broken feature rather than an
   * unfinished one. A View simply cannot be typed into.
   */
  readOnly?: boolean;
  /** Icons are nodes, not names, so this package needs no icon dependency. */
  leadingIcon: ReactNode;
  trailingIcon?: ReactNode;
  accessibilityLabel: string;
  className?: string;
}

/**
 * The rounded search field used by Home and by All Categories.
 *
 * Shared so the two cannot drift: Home's is presentational for now and
 * Categories' filters live, but a user moving between the tabs should not see
 * the control change shape.
 *
 * 48dp tall in the customer app and 56dp in the worker app.
 */
export function SearchField({
  placeholder,
  value,
  onChangeText,
  readOnly = false,
  leadingIcon,
  trailingIcon,
  accessibilityLabel,
  className = '',
}: SearchFieldProps) {
  const themed = useThemeClasses();
  const colors = useThemeColors();

  return (
    <View
      className={`${themed.searchHeight} flex-row items-center rounded-2xl border ${themed.controlBorder} ${themed.surfaceBg} px-4 ${className}`}
      accessibilityRole="search"
      accessibilityLabel={accessibilityLabel}
    >
      {leadingIcon}

      {readOnly ? (
        <Text className={`ml-3 flex-1 ${themed.bodySize} ${themed.muted}`} numberOfLines={1}>
          {placeholder}
        </Text>
      ) : (
        <TextInput
          className={`ml-3 flex-1 ${themed.bodySize} ${themed.ink}`}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={accessibilityLabel}
        />
      )}

      {trailingIcon}
    </View>
  );
}
