import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@sahayo/ui-native';

import { ScreenHeader } from '../ScreenHeader';

/**
 * The shared body for Privacy Policy and Terms.
 *
 * Both are the same shape — a title, a last-updated line, and numbered
 * sections — so they share a component and differ only in which catalogue
 * namespace they read. Section copy lives in the i18n catalogue like every
 * other display string; a policy is prose the user reads, and prose that only
 * exists in English is not a policy a Hindi-first user has agreed to.
 *
 * Sections are addressed by key rather than pulled out with i18next's
 * `returnObjects`, which hands back `unknown` and would need a cast at the
 * one place in the app where the text has to be exactly what was written.
 *
 * These two routes are reachable while signed out — the signup consent line
 * links straight here — so neither may read from the auth store.
 */
export function LegalScreen({
  namespace,
  sections,
}: {
  /** Catalogue namespace: 'privacy' or 'terms'. */
  namespace: string;
  /** Section keys, in the order they should be read. */
  sections: readonly string[];
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6">
        <ScreenHeader title={t(`${namespace}.title`)} fallback="/profile" />

        <Text className="mt-4 text-xs text-brand-muted">{t(`${namespace}.updated`)}</Text>

        <Text className="mt-4 text-sm text-brand-navy">{t(`${namespace}.intro`)}</Text>

        <View className="mt-2">
          {sections.map((section, index) => (
            <View
              key={section}
              className="mt-4 rounded-2xl border border-brand-border bg-brand-surface p-4"
            >
              <Text weight="semibold" className="text-base text-brand-navy">
                {`${index + 1}. ${t(`${namespace}.sections.${section}.title`)}`}
              </Text>
              <Text className="mt-2 text-sm text-brand-muted">
                {t(`${namespace}.sections.${section}.body`)}
              </Text>
            </View>
          ))}
        </View>

        <Text className="mt-6 text-xs text-brand-muted">{t(`${namespace}.contact`)}</Text>
      </View>
    </ScrollView>
  );
}
