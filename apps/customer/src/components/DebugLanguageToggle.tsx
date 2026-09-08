import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@sahayo/ui-native';

import { SUPPORTED_LANGUAGES } from '../i18n';
import { useAuthStore } from '../store/auth';

/**
 * TEMPORARY. Delete once profile/language.tsx is built for real in a later
 * sub-phase — that screen is where a user is meant to change language.
 *
 * It exists so the whole i18n and font pipeline can be checked from any
 * screen without first navigating to Profile, which is still a placeholder.
 * It floats above the navigator, inside the safe area, deliberately small.
 *
 * Language names are endonyms — "English" and "हिन्दी" — and are therefore
 * identical in both catalogues. That is not a missing translation: a language
 * picker that renders every option in the language you already understand is
 * useless to the person who needs it.
 */
export function DebugLanguageToggle() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useAuthStore((state) => state.language);
  const setLanguage = useAuthStore((state) => state.setLanguage);

  return (
    <View
      className="absolute left-3 flex-row overflow-hidden rounded-full border border-brand-border bg-brand-surface"
      // Bottom-left, clear of the tab bar. It used to sit top-right, which is
      // exactly where Home's notification bell now is.
      style={{ bottom: insets.bottom + 78 }}
    >
      {SUPPORTED_LANGUAGES.map((code) => {
        const active = language === code;
        return (
          <Pressable
            key={code}
            onPress={() => setLanguage(code)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={active ? 'bg-brand-primary px-3 py-1.5' : 'px-3 py-1.5'}
          >
            <Text
              weight="medium"
              className={active ? 'text-xs text-white' : 'text-xs text-brand-muted'}
            >
              {t(`common.languages.${code}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
