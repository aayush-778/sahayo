import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, Text } from '@sahayo/ui-native';

/**
 * The search field — presentation only in this sub-phase.
 *
 * Search behaviour is not in 2.2's brief, so this deliberately does not
 * accept input. It is rendered as a View rather than as a disabled TextInput
 * on purpose: a real input would open the keyboard and then do nothing, which
 * reads as a broken feature rather than as an unfinished one.
 *
 * Wiring it to filter the mock catalogue client-side is a small change when
 * the time comes — the field becomes a TextInput and Home passes the query
 * down to the best-services list.
 */
export function HomeSearchBar() {
  const { t } = useTranslation();

  return (
    <View
      className="h-12 flex-row items-center rounded-2xl border border-brand-border bg-brand-surface px-4"
      accessibilityRole="search"
      accessibilityLabel={t('home.searchPlaceholder')}
    >
      <Ionicons name="search-outline" size={18} color={brandColors.muted} />
      <Text className="ml-3 flex-1 text-base text-brand-muted">
        {t('home.searchPlaceholder')}
      </Text>
      <Ionicons name="options-outline" size={18} color={brandColors.navy} />
    </View>
  );
}
