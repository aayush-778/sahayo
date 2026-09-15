import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { LanguageToggle } from './LanguageToggle';

/**
 * Back, title, and the language toggle — the header of every pushed screen.
 *
 * `fallback` is where Back goes when there is no history, so a screen opened
 * straight from a link still has a way out. The back target is 48dp even
 * though the arrow is small.
 */
export function ScreenHeader({
  title,
  fallback = '/',
  onBack,
  trailing,
}: {
  title: string;
  fallback?: Href;
  onBack?: () => void;
  /** Defaults to the language toggle. Pass null for nothing. */
  trailing?: ReactNode;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(fallback)));

  return (
    <View
      className="flex-row items-center border-b border-worker-border bg-worker-surface px-2 pb-1"
      style={{ paddingTop: insets.top + 4 }}
    >
      <Pressable
        className="h-12 w-12 items-center justify-center"
        onPress={back}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
      </Pressable>
      <Text
        weight="bold"
        className="flex-1 px-1 text-lg text-worker-ink"
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {trailing === undefined ? <LanguageToggle /> : trailing}
    </View>
  );
}
