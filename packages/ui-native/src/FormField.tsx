import { useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { brandColors } from '../tokens';
import { Text } from './Text';

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
 */
export function FormField({
  label,
  accessory,
  error,
  containerClassName = '',
  onFocus,
  onBlur,
  ...inputProps
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? 'border-brand-danger'
    : focused
      ? 'border-brand-primary'
      : 'border-brand-border';

  return (
    <View className={containerClassName}>
      <Text weight="semibold" className="mb-2 text-sm text-brand-navy">
        {label}
      </Text>

      <View
        className={`flex-row items-center rounded-xl border bg-brand-surface ${borderClass}`}
      >
        <TextInput
          className="flex-1 px-4 py-4 text-base text-brand-navy"
          placeholderTextColor={brandColors.muted}
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

      {error ? <Text className="mt-2 text-sm text-brand-danger">{error}</Text> : null}
    </View>
  );
}
