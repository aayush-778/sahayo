import type { ComponentProps, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** A card holding a list of SettingsRows. */
export function SettingsGroup({ children }: { children: ReactNode }) {
  return <View className="overflow-hidden rounded-2xl border border-worker-border bg-worker-surface">{children}</View>;
}

/**
 * One row of the profile menu: icon, title, a line of current state, and a
 * chevron. `attention` turns the state line red — a document that needs
 * re-uploading should be seen before it is tapped.
 */
export function SettingsRow({
  icon,
  title,
  subtitle,
  attention = false,
  last = false,
  onPress,
}: {
  icon: IoniconName;
  title: string;
  subtitle?: string;
  attention?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      className={`min-h-14 flex-row items-center px-4 py-3 ${last ? '' : 'border-b border-worker-border'}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-worker-primary-tint">
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View className="ml-3 flex-1">
        <Text weight="semibold" className="text-sm text-worker-ink">
          {title}
        </Text>
        {subtitle ? (
          <Text className={`text-xs ${attention ? 'text-worker-danger' : 'text-worker-muted'}`} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {attention ? <Ionicons name="alert-circle" size={18} color={colors.danger} style={{ marginRight: 4 }} /> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}
