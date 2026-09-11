import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, SearchField, Text } from '@sahayo/ui-native';

import { FilterChips } from '../../src/components/FilterChips';
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher';
import { PromoCarousel } from '../../src/components/PromoCarousel';
import { SubCategoryGrid } from '../../src/components/categories/SubCategoryGrid';
import {
  chipOf,
  chipsFor,
  findCategoryById,
  localized,
  localizedName,
  subCategoriesFor,
  subCategoryMatchesQuery,
} from '../../src/mocks';
import { useAuthStore } from '../../src/store/auth';

/**
 * The sub-category screen for one worker type.
 *
 * Same visual language as All Categories — heading row, search field, chip
 * row, grid, banner strip — with two differences that both follow from the
 * content: the grid is two columns because these cards carry a description,
 * and the chips come from the category record rather than from a global
 * grouping, because "New Wiring" means nothing outside Electricians.
 *
 * The banner strip sits BELOW the grid here and above it on All Categories.
 * That is the sketch's order: someone who has already chosen a worker type
 * came to pick a job, so the grid gets the fold and the offers get the
 * scroll.
 */
export default function CategoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const category = findCategoryById(categoryId);

  const [chip, setChip] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const chips = useMemo(
    () =>
      category
        ? chipsFor(category.id).map((entry) => ({
            key: entry.key,
            label: localized(entry.label, entry.labelLocalized, locale),
          }))
        : [],
    [category, locale],
  );

  const visible = useMemo(() => {
    if (!category) return [];
    return subCategoriesFor(category.id)
      .filter((sub) => chip === null || chipOf(sub.id) === chip)
      .filter((sub) => subCategoryMatchesQuery(sub, query));
  }, [category, chip, query]);

  // An unknown id can only arrive from a stale deep link. Bouncing to the
  // full list is friendlier than a blank screen and needs no error copy.
  if (!category) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream px-6">
        <Text className="text-center text-base text-brand-muted">
          {t('categories.noResultsHint')}
        </Text>
        <Pressable
          className="mt-4 rounded-xl bg-brand-primary px-6 py-3"
          onPress={() => router.replace('/categories')}
          accessibilityRole="button"
          accessibilityLabel={t('categories.title')}
        >
          <Text weight="semibold" className="text-base text-white">
            {t('categories.title')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const categoryName = localizedName(category, locale);

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
        <View className="flex-row items-center">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/categories'))}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={18} color={brandColors.navy} />
          </Pressable>

          <Text
            weight="bold"
            className="ml-3 flex-1 text-2xl text-brand-navy"
            numberOfLines={1}
          >
            {categoryName}
          </Text>

          <LanguageSwitcher />
        </View>

        <SearchField
          className="mt-4"
          placeholder={t('subcategory.searchPlaceholder', { category: categoryName })}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel={t('subcategory.searchPlaceholder', { category: categoryName })}
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
          <FilterChips chips={chips} selected={chip} onSelect={setChip} />
        </View>

        <View className="mt-5">
          {visible.length > 0 ? (
            <SubCategoryGrid subCategories={visible} />
          ) : (
            <View className="items-center rounded-2xl border border-brand-border bg-brand-surface px-6 py-10">
              <Ionicons name="search-outline" size={28} color={brandColors.muted} />
              <Text weight="semibold" className="mt-3 text-center text-base text-brand-navy">
                {t('subcategory.noResults', { query })}
              </Text>
              <Text className="mt-1 text-center text-sm text-brand-muted">
                {t('subcategory.noResultsHint')}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-4">
          <PromoCarousel compact />
        </View>
      </View>
    </ScrollView>
  );
}
