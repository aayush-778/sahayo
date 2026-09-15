import { useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { useThemeClasses, useThemeColors } from './theme';

export interface FormFieldProps extends TextInputProps {
  /** Already translated by the caller. This package never touches i18n. */
  label: string;
  /**
   * Trailing element inside the field's border — in practice an icon.
   *
   * Taken as a node rather than an icon name so `@sahayo/ui-native` does not
   * have to depend on an icon library, which would make it a dependency of
   * both apps for the sake of one glyph.
   */
  accessory?: ReactNode;
  /**
   * Leading element inside the field's border, before the input — a fixed
   * "+91" in front of a mobile number, so the country code is shown but can
   * never be typed over or deleted.
   */
  prefix?: ReactNode;
  /** Shown under the field and turns the border red. Falsy means no error. */
  error?: string;
  /** Applied to the outer wrapper, for spacing between stacked fields. */
  containerClassName?: string;
}

/**
 * A labelled text input.
 *
 * Focus is tracked internally so the border can respond to it, and the
 * caller's own `onFocus`/`onBlur` still fire — the field is used both for
 * plain entry and for validate-on-blur, and swallowing those handlers would
 * make the second impossible.
 *
 * The idle border is the theme's `controlBorder`. In the worker app that is
 * an outline measured at 3:1 against the card, which WCAG 1.4.11 requires for
 * the edge of an input — a field you cannot find in sunlight is not a field.
 */
export function FormField({
  label,
  accessory,
  prefix,
  error,
  containerClassName = '',
  onFocus,
  onBlur,
  ...inputProps
}: FormFieldProps) {
  const themed = useThemeClasses();
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? themed.dangerBorder
    : focused
      ? themed.primaryBorder
      : themed.controlBorder;

  return (
    <View className={containerClassName}>
      <Text weight="semibold" className={`mb-2 ${themed.labelSize} ${themed.ink}`}>
        {label}
      </Text>

      <View
        className={`flex-row items-center rounded-xl border ${themed.surfaceBg} ${borderClass}`}
      >
        {prefix ? <View className="pl-4">{prefix}</View> : null}
        <TextInput
          className={`flex-1 ${prefix ? 'pl-2 pr-4' : 'px-4'} py-4 ${themed.bodySize} ${themed.ink}`}
          placeholderTextColor={colors.muted}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {accessory ? <View className="pr-4">{accessory}</View> : null}
      </View>

      {error ? <Text className={`mt-2 ${themed.labelSize} ${themed.dangerText}`}>{error}</Text> : null}
    </View>
  );
}
