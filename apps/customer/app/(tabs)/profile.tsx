import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, brandColors, Text } from '@sahayo/ui-native';

import { SettingsRow } from '../../src/components/profile/SettingsRow';
import { resetDemo } from '../../src/lib/demo';
import { useAuthStore } from '../../src/store/auth';

/**
 * Profile.
 *
 * Every row goes somewhere real. The sub-screens vary in depth — some are
 * fully working, some are read-only lists over mock data — but none of them
 * is a dead end, because a menu item that does nothing when tapped is worse
 * than an item that was never on the menu.
 *
 * NO DARK-MODE TOGGLE. The sketch has one; the honest estimate for making it
 * work rather than merely exist is well past the hour that was budgeted, and
 * shipping a switch that half-darkens the app is worse than not shipping one.
 * The reason and the real fix are written up in the sub-phase notes; the slot
 * is left empty rather than filled with a control that lies.
 */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const name = useAuthStore((state) => state.name);
  const phone = useAuthStore((state) => state.phone);
  const language = useAuthStore((state) => state.language);
  const logout = useAuthStore((state) => state.logout);

  function confirmReset() {
    Alert.alert(t('profile.resetTitle'), t('profile.resetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.resetConfirm'),
        style: 'destructive',
        onPress: () => {
          void resetDemo().then(() => router.replace('/signup'));
        },
      },
    ]);
  }

  function confirmLogout() {
    Alert.alert(t('profile.logoutTitle'), t('profile.logoutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6">
        <Text weight="bold" className="text-2xl text-brand-navy">
          {t('profile.title')}
        </Text>

        <View className="mt-4 flex-row items-center rounded-2xl border border-brand-border bg-brand-surface p-4">
          <Avatar name={name || t('profile.noName')} size="lg" />
          <View className="ml-3 flex-1">
            <Text weight="bold" className="text-lg text-brand-navy" numberOfLines={1}>
              {name || t('profile.noName')}
            </Text>
            <Text className="text-sm text-brand-muted" numberOfLines={1}>
              {phone || t('profile.noPhone')}
            </Text>
          </View>
          <Pressable
            className="rounded-xl border border-brand-primary px-3 py-2"
            onPress={() => router.push('/profile/edit')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.edit')}
          >
            <Text weight="medium" className="text-xs text-brand-primary">
              {t('profile.edit')}
            </Text>
          </Pressable>
        </View>

        <Text weight="semibold" className="mt-6 text-sm text-brand-muted">
          {t('profile.sections.account')}
        </Text>
        <View className="mt-2 overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
          <SettingsRow
            icon="person-outline"
            label={t('profile.edit')}
            href="/profile/edit"
          />
          <SettingsRow
            icon="lock-closed-outline"
            label={t('profile.passwords')}
            href="/profile/passwords"
          />
          <SettingsRow icon="card-outline" label={t('profile.cards')} href="/profile/cards" />
          <SettingsRow
            icon="location-outline"
            label={t('profile.addresses')}
            href="/profile/addresses"
            last
          />
        </View>

        <Text weight="semibold" className="mt-6 text-sm text-brand-muted">
          {t('profile.sections.preferences')}
        </Text>
        <View className="mt-2 overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
          <SettingsRow
            icon="globe-outline"
            label={t('profile.language')}
            value={t(`common.languages.${language}`)}
            href="/profile/language"
            last
          />
        </View>

        <Text weight="semibold" className="mt-6 text-sm text-brand-muted">
          {t('profile.sections.legal')}
        </Text>
        <View className="mt-2 overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
          <SettingsRow
            icon="shield-checkmark-outline"
            label={t('profile.privacy')}
            href="/profile/privacy"
          />
          <SettingsRow
            icon="document-text-outline"
            label={t('profile.terms')}
            href="/profile/terms"
            last
          />
        </View>

        <Pressable
          className="mt-6 h-14 flex-row items-center justify-center rounded-xl border border-brand-danger bg-brand-danger-soft"
          onPress={confirmLogout}
          accessibilityRole="button"
          accessibilityLabel={t('common.logout')}
        >
          <Ionicons name="log-out-outline" size={18} color={brandColors.danger} />
          <Text weight="semibold" className="ml-2 text-base text-brand-danger">
            {t('common.logout')}
          </Text>
        </Pressable>

        {/* Long-press to reset the demo. Hidden rather than absent, for the
            same reason the tracker's status advance is: whoever is presenting
            needs it between runs, and a judge holding the phone must not be
            able to wipe the account by tapping something. */}
        <Pressable
          onLongPress={confirmReset}
          delayLongPress={800}
          accessibilityRole="text"
          accessibilityLabel={t('profile.version')}
        >
          <Text className="mt-4 text-center text-xs text-brand-muted">
            {t('profile.version')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
