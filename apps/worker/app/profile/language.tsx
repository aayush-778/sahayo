import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUPPORTED_LANGUAGES, Text, useThemeColors } from '@sahayo/ui-native';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { setLanguage, useLanguage } from '../../src/services';

/**
 * Language — English and हिन्दी.
 *
 * Each option is written in its own language and script, with a line of that
 * language under it, so a worker who reads only one of them can find it. The
 * whole app switches on tap, and the choice is saved on the phone, so it is
 * still there after the app is closed and opened again.
 */
export default function LanguageScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const current = useLanguage();

  return (
    <View className="flex-1 bg-worker-ground">
      <ScreenHeader title={t('worker.profile.language.title')} fallback="/profile" trailing={null} />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        <View className="w-full max-w-xl gap-3 self-center px-5">
          <Text className="text-sm text-worker-muted">{t('worker.profile.language.intro')}</Text>

          <View accessibilityRole="radiogroup" className="gap-3">
            {SUPPORTED_LANGUAGES.map((language) => {
              const active = language === current;
              return (
                <Pressable
                  key={language}
                  className={`min-h-16 flex-row items-center rounded-2xl border-2 px-4 py-3 ${
                    active ? 'border-worker-primary bg-worker-primary-tint' : 'border-worker-border bg-worker-surface'
                  }`}
                  onPress={() => void setLanguage(language)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(`common.languages.${language}`)}
                >
                  <View className="flex-1">
                    <Text weight="bold" className="text-lg text-worker-ink">
                      {t(`common.languages.${language}`)}
                    </Text>
                    <Text className="text-sm text-worker-muted">{t(`worker.profile.language.sample.${language}`)}</Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={active ? colors.primary : colors.outline}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
