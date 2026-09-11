import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, Text } from '@sahayo/ui-native';

import { LanguageSwitcher } from '../../src/components/LanguageSwitcher';
import { PromoCarousel } from '../../src/components/PromoCarousel';
import { ServiceItemRow } from '../../src/components/subcategory/ServiceItemRow';
import {
  findParentCategory,
  findSubCategoryById,
  localizedName,
  serviceItemsFor,
} from '../../src/mocks';
import { useAuthStore } from '../../src/store/auth';

/**
 * The priced item list for one sub-category.
 *
 * Order follows the sketch: header, banner, then the items. No search field
 * and no chip row — a sub-category tops out at ten items, and a filter over
 * ten rows costs more attention than it saves. The screen above it already
 * has both.
 *
 * The list is a plain `ScrollView`, not a `FlatList`. Virtualising ten rows
 * buys nothing and costs the ability to scroll the banner and the list as one
 * surface, which is what the sketch shows.
 */
export default function SubCategoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  const { subCategoryId } = useLocalSearchParams<{ subCategoryId: string }>();
  const subCategory = findSubCategoryById(subCategoryId);
  const parent = subCategory ? findParentCategory(subCategory.id) : undefined;

  // Only reachable from a stale deep link. Bouncing to the full list beats a
  // blank screen and needs no error copy of its own.
  if (!subCategory) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream px-6">
        <Text className="text-center text-base text-brand-muted">
          {t('subcategory.noResultsHint')}
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

  const items = serviceItemsFor(subCategory.id);

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
        <View className="flex-row items-center">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace(parent ? `/category/${parent.id}` : '/categories')
            }
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={18} color={brandColors.navy} />
          </Pressable>

          <View className="ml-3 flex-1">
            <Text weight="bold" className="text-2xl text-brand-navy" numberOfLines={1}>
              {localizedName(subCategory, locale)}
            </Text>
            {/* The worker type this sits under. A sub-category name alone is
                ambiguous once you arrive from search — "Repairs & Fixing"
                belongs to both Carpenters and Plumbers. */}
            {parent ? (
              <Text className="text-xs text-brand-muted" numberOfLines={1}>
                {localizedName(parent, locale)}
              </Text>
            ) : null}
          </View>

          <LanguageSwitcher />
        </View>

        <View className="mt-5">
          <PromoCarousel compact />
        </View>

        <View className="mt-5">
          {items.map((item) => (
            <ServiceItemRow key={item.id} item={item} iconKey={subCategory.iconKey} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
