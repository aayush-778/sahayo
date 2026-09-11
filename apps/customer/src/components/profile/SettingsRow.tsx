import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, Text } from '@sahayo/ui-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * One row of the profile menu.
 *
 * `href` is required rather than optional, and there is no variant without
 * one. Every item on this menu has to go somewhere: a row that looks tappable
 * and does nothing is the single worst thing to hand a judge, and making the
 * destination part of the type means one cannot be added by accident.
 */
export function SettingsRow({
  icon,
  label,
  value,
  href,
  danger = false,
  last = false,
}: {
  icon: IoniconName;
  /** Already translated. */
  label: string;
  /** Optional right-aligned current value, e.g. the chosen language. */
  value?: string;
  href: Href;
  danger?: boolean;
  last?: boolean;
}) {
  const router = useRouter();

  return (
    <>
      <Pressable
        className="flex-row items-center px-4 py-3.5"
        onPress={() => router.push(href)}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View
          className={`h-9 w-9 items-center justify-center rounded-xl ${
            danger ? 'bg-brand-danger-soft' : 'bg-brand-primary-tint'
          }`}
        >
          <Ionicons
            name={icon}
            size={18}
            color={danger ? brandColors.danger : brandColors.primary}
          />
        </View>

        <Text
          weight="medium"
          className={`ml-3 flex-1 text-sm ${danger ? 'text-brand-danger' : 'text-brand-navy'}`}
        >
          {label}
        </Text>

        {value ? <Text className="mr-2 text-sm text-brand-muted">{value}</Text> : null}

        <Ionicons
          name="chevron-forward"
          size={16}
          color={danger ? brandColors.danger : brandColors.muted}
        />
      </Pressable>

      {last ? null : <View className="ml-16 h-px bg-brand-border" />}
    </>
  );
}
