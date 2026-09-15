import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { Sheet } from './Sheet';

export interface SelectOption {
  value: string;
  /** Already translated. */
  label: string;
}

/**
 * A dropdown that opens a bottom sheet of options.
 *
 * A sheet rather than a native Picker: Android's Picker renders in the system
 * font, so a Hindi option list would lose Noto Sans Devanagari and read in
 * whatever the OEM ships. Every row here is 56dp — above this app's 48dp floor
 * — with the chosen option ticked.
 */
export function SelectField({
  label,
  placeholder,
  sheetTitle,
  value,
  options,
  onChange,
  error,
  className = '',
}: {
  label: string;
  placeholder: string;
  sheetTitle: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className={className}>
      <Text weight="semibold" className="mb-2 text-sm text-worker-ink">
        {label}
      </Text>
      <Pressable
        className={`min-h-12 flex-row items-center rounded-xl border bg-worker-surface px-4 ${
          error ? 'border-worker-danger' : 'border-worker-outline'
        }`}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
      >
        <Text className={`flex-1 text-base ${selected ? 'text-worker-ink' : 'text-worker-muted'}`} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text className="mt-2 text-sm text-worker-danger">{error}</Text> : null}

      <Sheet visible={open} title={sheetTitle} onClose={() => setOpen(false)}>
        <ScrollView>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                className={`min-h-12 flex-row items-center px-5 ${active ? 'bg-worker-primary-tint' : ''}`}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option.label}
              >
                <Text
                  weight={active ? 'semibold' : 'regular'}
                  className={`flex-1 text-base ${active ? 'text-worker-primary' : 'text-worker-ink'}`}
                >
                  {option.label}
                </Text>
                {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </View>
  );
}
