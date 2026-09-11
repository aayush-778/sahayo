import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, SearchField, Skeleton, Text } from '@sahayo/ui-native';

import { useResourceLoading } from '../../src/lib/loading';
import { CategoryGrid } from '../../src/components/categories/CategoryGrid';
import { FilterChips } from '../../src/components/FilterChips';
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher';
import { PromoCarousel } from '../../src/components/PromoCarousel';
import {
  CATEGORY_GROUPS,
  categoriesInGroup,
  categoryMatchesQuery,
  serviceCategories,
  type CategoryGroup,
} from '../../src/mocks';

/** Narrows a chip key back to a group. The chip row is built from
 *  CATEGORY_GROUPS, so anything else can only be "all", i.e. no filter. */
function asGroup(key: string | null): CategoryGroup | null {
  return CATEGORY_GROUPS.find((group) => group === key) ?? null;
}

/**
 * All Categories.
 *
 * Two independent filters compose: the chip narrows to a group, the query
 * narrows by name. Applying the chip first is deliberate — searching inside
 * the group you are looking at is what the chip being lit implies, and the
 * empty state can then say honestly that nothing in THIS group matched.
 *
 * Search matches every language a category has, not just the one on screen,
 * so "carp" finds बढ़ई and "बढ़" finds Carpenters regardless of which
 * language the UI is in. See `normalizeForSearch` for why Devanagari needs
 * more than a `toLowerCase`.
 */
export default function CategoriesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const loading = useResourceLoading('categories');

  const chips = [
    { key: 'all', label: t('categories.groups.all') },
    ...CATEGORY_GROUPS.map((entry) => ({
      key: entry,
      label: t(`categories.groups.${entry}`),
    })),
  ];

  const visible = useMemo(() => {
    const selected = asGroup(group);
    const inGroup = selected === null ? serviceCategories : categoriesInGroup(selected);
    return inGroup.filter((category) => categoryMatchesQuery(category, query));
  }, [group, query]);

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6">
        <View className="flex-row items-center justify-between">
          <Text weight="bold" className="text-2xl text-brand-navy">
            {t('categories.title')}
          </Text>
          <LanguageSwitcher />
        </View>

        <SearchField
          className="mt-4"
          placeholder={t('categories.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel={t('categories.searchPlaceholder')}
          leadingIcon={<Ionicons name="search-outline" size={18} color={brandColors.muted} />}
          trailingIcon={
            query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                accessibilityRole="button"
                accessibilityLabel={t('categories.clearSearch')}
                hitSlop={10}
              >
                <Ionicons name="close-circle" size={18} color={brandColors.muted} />
              </Pressable>
            ) : null
          }
        />

        <View className="mt-4">
          <FilterChips chips={chips} selected={group} onSelect={setGroup} />
        </View>

        <View className="mt-5">
          <PromoCarousel compact />
        </View>

        <View className="mt-6">
          {loading ? (
            <View className="-mx-1.5 flex-row flex-wrap">
              {[0, 1, 2, 3, 4, 5].map((slot) => (
                <View key={slot} className="w-1/3 px-1.5 pb-3">
                  <Skeleton className="h-28 rounded-2xl" />
                </View>
              ))}
            </View>
          ) : visible.length > 0 ? (
            <CategoryGrid categories={visible} />
          ) : (
            <View className="items-center rounded-2xl border border-brand-border bg-brand-surface px-6 py-10">
              <Ionicons name="search-outline" size={28} color={brandColors.muted} />
              <Text weight="semibold" className="mt-3 text-center text-base text-brand-navy">
                {t('categories.noResults', { query })}
              </Text>
              <Text className="mt-1 text-center text-sm text-brand-muted">
                {t('categories.noResultsHint')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
