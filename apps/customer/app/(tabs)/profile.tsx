import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { Text } from '@sahayo/ui-native';

import { PlaceholderScreen } from '../../src/components/PlaceholderScreen';
import { useAuthStore } from '../../src/store/auth';

/**
 * TEMPORARY scaffold for the Profile tab.
 *
 * The logout button is here so the auth gate can be exercised in both
 * directions: without it, once you have signed up there is no way back to the
 * signed-out screens short of clearing the app's data.
 */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const logout = useAuthStore((state) => state.logout);

  return (
    <PlaceholderScreen
      links={[
        { href: '/profile/edit', label: '/profile/edit' },
        { href: '/profile/passwords', label: '/profile/passwords' },
        { href: '/profile/cards', label: '/profile/cards' },
        { href: '/profile/addresses', label: '/profile/addresses' },
        { href: '/profile/language', label: '/profile/language' },
        { href: '/profile/privacy', label: '/profile/privacy' },
        { href: '/profile/terms', label: '/profile/terms' },
      ]}
    >
      <Pressable
        className="self-start rounded-2xl border border-brand-danger px-6 py-4"
        accessibilityRole="button"
        onPress={logout}
      >
        <Text weight="semibold" className="text-base text-brand-danger">
          {t('common.logout')}
        </Text>
      </Pressable>
    </PlaceholderScreen>
  );
}
