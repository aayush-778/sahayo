import { useTranslation } from 'react-i18next';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, Text } from '@sahayo/ui-native';

import {
  categoryMatchesQuery,
  localizedName,
  searchSubCategories,
  serviceCategories,
} from '../../mocks';
import { useAuthStore } from '../../store/auth';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function iconFor(iconKey: string | undefined): IoniconName {
  return (iconKey ?? 'ellipse-outline') as IoniconName;
}

/**
 * Home's inline search results — worker types first, then sub-categories.
 *
 * Worker types lead because they are the coarser answer: someone typing "wir"
 * who is shown Electricians before Wiring & New Installation can stop reading
 * one line sooner. Each sub-category row names its parent underneath, so a
 * bare "Repairs & Fixing" is never ambiguous between Carpenters and Plumbers.
 *
 * This replaces the body of Home rather than floating over it, so there is
 * only ever one scrollable thing on screen and no dismiss gesture to learn.
 */
export function HomeSearchResults({ query }: { query: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  const categories = serviceCategories.filter((category) =>
    categoryMatchesQuery(category, query),
  );
  const subCategories = searchSubCategories(query);

  if (categories.length === 0 && subCategories.length === 0) {
    return (
      <View className="mt-6 items-center rounded-2xl border border-brand-border bg-brand-surface px-6 py-10">
        <Ionicons name="search-outline" size={28} color={brandColors.muted} />
        <Text weight="semibold" className="mt-3 text-center text-base text-brand-navy">
          {t('categories.noResults', { query })}
        </Text>
        <Text className="mt-1 text-center text-sm text-brand-muted">
          {t('categories.noResultsHint')}
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-5">
      {categories.map((category) => (
        <Pressable
          key={category.id}
          className="mb-2 flex-row items-center rounded-2xl border border-brand-border bg-brand-surface p-3"
          onPress={() => router.push(`/category/${category.id}`)}
          accessibilityRole="button"
          accessibilityLabel={localizedName(category, locale)}
        >
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-primary-tint">
            <Ionicons name={iconFor(category.iconKey)} size={18} color={brandColors.primary} />
          </View>
          <Text weight="semibold" className="ml-3 flex-1 text-sm text-brand-navy">
            {localizedName(category, locale)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={brandColors.muted} />
        </Pressable>
      ))}

      {subCategories.map(({ sub, category }) => (
        <Pressable
          key={sub.id}
          className="mb-2 flex-row items-center rounded-2xl border border-brand-border bg-brand-surface p-3"
          onPress={() => router.push(`/subcategory/${sub.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`${localizedName(sub, locale)}, ${localizedName(category, locale)}`}
        >
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-primary-tint">
            <Ionicons name={iconFor(sub.iconKey)} size={18} color={brandColors.primary} />
          </View>
          <View className="ml-3 flex-1">
            <Text weight="semibold" className="text-sm text-brand-navy" numberOfLines={1}>
              {localizedName(sub, locale)}
            </Text>
            <Text className="text-xs text-brand-muted" numberOfLines={1}>
              {localizedName(category, locale)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={brandColors.muted} />
        </Pressable>
      ))}
    </View>
  );
}
