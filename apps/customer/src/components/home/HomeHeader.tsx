import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, brandColors, Text } from '@sahayo/ui-native';

import { LanguageSwitcher } from '../LanguageSwitcher';
import { localized, mockServiceLocation } from '../../mocks';
import { mockNotifications } from '../../mocks/notifications';
import { useAuthStore } from '../../store/auth';

/**
 * Avatar, greeting, service area, notification bell.
 *
 * The name is the one typed at signup — it is the single thread tying the
 * dummy auth store to the rest of the app, and the reason signup is the entry
 * point rather than login.
 *
 * The bell now opens /notifications. The location chevron is still inert —
 * there is no address picker in the route tree, and a control that navigates
 * somewhere unbuilt is worse in a demo than one that visibly waits its turn.
 *
 * The language switcher sits immediately left of the bell. It replaced a
 * floating debug pill: language is a first-class control on this product, not
 * a setting buried three taps deep in Profile, and a Hindi-first user should
 * meet it on the first screen after signing in.
 */
export function HomeHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const name = useAuthStore((state) => state.name);
  const locale = useAuthStore((state) => state.language);

  const hasUnread = mockNotifications.some((notification) => !notification.read);

  const greeting = name
    ? t('home.greeting', { name: name.split(/\s+/)[0] })
    : t('home.greetingAnonymous');

  return (
    <View className="flex-row items-center">
      <Avatar name={name || '?'} size="md" />

      <View className="ml-3 flex-1">
        <Text weight="bold" className="text-lg text-brand-navy" numberOfLines={1}>
          {greeting}
        </Text>

        <View className="mt-0.5 flex-row items-center">
          <Ionicons name="location-outline" size={13} color={brandColors.muted} />
          <Text className="ml-1 text-xs text-brand-muted" numberOfLines={1}>
            {localized(
              mockServiceLocation.label,
              mockServiceLocation.labelLocalized,
              locale,
            )}
          </Text>
          <Ionicons name="chevron-down" size={13} color={brandColors.muted} />
        </View>
      </View>

      <LanguageSwitcher />

      <Pressable
        className="ml-3 h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
        onPress={() => router.push('/notifications')}
        accessibilityRole="button"
        accessibilityLabel={t('home.notifications')}
      >
        <Ionicons name="notifications-outline" size={20} color={brandColors.navy} />
        {/* Unread marker. Sits proud of the circle's edge, hence absolute.
            Read state lives on the notifications screen and is not persisted,
            so this reflects the mock feed rather than what you last opened. */}
        {hasUnread ? (
          <View className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-danger" />
        ) : null}
      </Pressable>
    </View>
  );
}
