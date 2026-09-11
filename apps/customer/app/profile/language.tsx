import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, Text } from '@sahayo/ui-native';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SUPPORTED_LANGUAGES, type AppLanguage } from '../../src/i18n';
import { useAuthStore } from '../../src/store/auth';

/** The name of each language, written in that language. */
const ENDONYM: Record<AppLanguage, string> = {
  en: 'English',
  hi: 'हिन्दी',
};

/**
 * Language.
 *
 * SWITCHES IMMEDIATELY, WITH NO RESTART. `setLanguage` calls i18next's
 * `changeLanguage`, which re-renders every subscriber of `useTranslation` —
 * so this screen's own labels, the tab bar behind it and every screen in the
 * stack change on the same frame as the tap.
 *
 * PERSISTS ACROSS RESTARTS. The same call writes the choice to AsyncStorage
 * under `sahayo.language`, and `initI18n` reads that key BEFORE the first
 * render on the next launch, with the splash held until it resolves. That
 * ordering is the whole reason a Hindi user does not see a frame of English
 * on every cold start.
 *
 * ONE KEY, ONE OWNER. `src/i18n` owns `sahayo.language`; the auth store
 * mirrors the value so components can subscribe to it, but is explicitly
 * excluded from its own persisted set. Two copies in two keys eventually
 * disagree, and the one that loses is always the one the user chose.
 *
 * EACH OPTION IS WRITTEN IN ITS OWN LANGUAGE. "हिन्दी", never "Hindi" — a
 * Hindi-first user scanning this list should not have to read English to
 * find the way out of English.
 */
export default function LanguageScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const language = useAuthStore((state) => state.language);
  const setLanguage = useAuthStore((state) => state.setLanguage);

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
        <ScreenHeader title={t('profile.language')} fallback="/profile" />

        <Text className="mt-4 text-sm text-brand-muted">{t('language.intro')}</Text>

        <View className="mt-4 overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
          {SUPPORTED_LANGUAGES.map((entry, index) => {
            const active = entry === language;

            return (
              <View key={entry}>
                {index > 0 ? <View className="h-px bg-brand-border" /> : null}
                <Pressable
                  className={`flex-row items-center px-4 py-4 ${
                    active ? 'bg-brand-primary-tint' : ''
                  }`}
                  onPress={() => setLanguage(entry)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={ENDONYM[entry]}
                >
                  <View className="flex-1">
                    <Text weight="semibold" className="text-base text-brand-navy">
                      {ENDONYM[entry]}
                    </Text>
                    <Text className="mt-0.5 text-xs text-brand-muted">
                      {t(`language.subtitle.${entry}`)}
                    </Text>
                  </View>

                  {active ? (
                    <Ionicons name="checkmark-circle" size={24} color={brandColors.primary} />
                  ) : (
                    <View className="h-6 w-6 rounded-full border-2 border-brand-border" />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        <View className="mt-4 flex-row items-start rounded-xl border border-brand-primary-soft bg-brand-primary-tint px-4 py-3">
          <Ionicons name="information-circle-outline" size={16} color={brandColors.primary} />
          <Text className="ml-2 flex-1 text-xs text-brand-navy">{t('language.note')}</Text>
        </View>

        {/* The Devanagari conjunct that clips first if the type scale's
            leading is ever tightened. Kept on the language screen on purpose:
            it is the one place a reviewer is already looking at both scripts,
            so a rendering regression is caught here rather than in a demo. */}
        <View className="mt-4 rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
          <Text className="text-xs text-brand-muted">{t('language.sampleLabel')}</Text>
          <Text weight="semibold" className="mt-1 text-lg text-brand-navy">
            {t('language.sample')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
