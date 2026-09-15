import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUPPORTED_LANGUAGES, Text, useThemeColors } from '@sahayo/ui-native';

import { setLanguage, useLanguage } from '../services';

/**
 * Globe plus the language being read, one tap to switch.
 *
 * On every screen, not only in Profile. The premise of this app is that a
 * worker may not read English; the way out of English must never be behind
 * English. Cycling rather than a picker, because with two languages a picker is
 * a sheet to dismiss for no extra information.
 *
 * 48dp tall, the floor for every control in this app.
 */
export function LanguageToggle() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const language = useLanguage();
  const next = SUPPORTED_LANGUAGES[(SUPPORTED_LANGUAGES.indexOf(language) + 1) % SUPPORTED_LANGUAGES.length];

  return (
    <Pressable
      className="h-12 flex-row items-center rounded-full border border-worker-outline bg-worker-surface px-4"
      onPress={() => void setLanguage(next)}
      accessibilityRole="button"
      accessibilityLabel={t('common.changeLanguage')}
      accessibilityHint={t('common.switchToLanguage', { language: t(`common.languages.${next}`) })}
    >
      <Ionicons name="globe-outline" size={16} color={colors.primary} />
      <Text weight="semibold" className="ml-2 text-sm text-worker-primary">
        {t(`common.languages.${language}`)}
      </Text>
    </Pressable>
  );
}
