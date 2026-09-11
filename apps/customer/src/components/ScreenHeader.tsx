import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, Text } from '@sahayo/ui-native';

/**
 * Back chevron, title, optional subtitle, optional trailing slot.
 *
 * Seven screens in the profile section grew the same fourteen lines of header
 * independently, which is the point at which a shape stops being a
 * coincidence. It stays in the app rather than moving to
 * `@sahayo/ui-native` because it depends on expo-router, and the worker app
 * will have its own navigator.
 *
 * `fallback` is where Back goes when there is no history — opening a deep
 * link straight onto a sub-screen should still leave a way out.
 */
export function ScreenHeader({
  title,
  subtitle,
  fallback = '/',
  trailing,
}: {
  title: string;
  subtitle?: string;
  fallback?: Href;
  trailing?: ReactNode;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-row items-center">
      <Pressable
        className="h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={18} color={brandColors.navy} />
      </Pressable>

      <View className="ml-3 flex-1">
        <Text weight="bold" className="text-2xl text-brand-navy" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-brand-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing}
    </View>
  );
}
