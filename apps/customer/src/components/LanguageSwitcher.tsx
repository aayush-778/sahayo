import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, Text } from '@sahayo/ui-native';

import { SUPPORTED_LANGUAGES } from '../i18n';
import { useAuthStore } from '../store/auth';

/**
 * Globe plus the language you are currently reading, top-right of the auth
 * header.
 *
 * It sits on the first screen a new user sees, before any other content, and
 * that is a product decision rather than a layout convenience: a Hindi-first
 * user should not have to read an English screen to find out how to stop
 * reading English screens.
 *
 * Tapping cycles rather than opening a picker. With exactly two languages a
 * picker is a sheet to dismiss for no added information, and cycling keeps
 * the whole interaction to one tap. If a third language is ever added this
 * has to become a picker — cycling past two options stops being predictable.
 */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language);
  const setLanguage = useAuthStore((state) => state.setLanguage);

  const nextIndex = (SUPPORTED_LANGUAGES.indexOf(language) + 1) % SUPPORTED_LANGUAGES.length;
  const nextLanguage = SUPPORTED_LANGUAGES[nextIndex];

  return (
    <Pressable
      className="flex-row items-center"
      onPress={() => setLanguage(nextLanguage)}
      accessibilityRole="button"
      accessibilityLabel={t('common.changeLanguage')}
      accessibilityHint={t('common.switchToLanguage', {
        language: t(`common.languages.${nextLanguage}`),
      })}
      hitSlop={10}
    >
      <Ionicons name="globe-outline" size={18} color={brandColors.primary} />
      <Text weight="medium" className="ml-1.5 text-sm text-brand-primary">
        {t(`common.languages.${language}`)}
      </Text>
    </Pressable>
  );
}
