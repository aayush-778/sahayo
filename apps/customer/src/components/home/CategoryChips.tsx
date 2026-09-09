import type { ComponentProps } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { ServiceCategory } from '@sahayo/shared';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, Text } from '@sahayo/ui-native';

import { localizedName } from '../../mocks';
import { useAuthStore } from '../../store/auth';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * `ServiceCategory.iconKey` is a plain string in @sahayo/shared, because the
 * shared package has no business knowing which icon set a client uses. The
 * cast is the seam between the two, and the fallback means a typo in the
 * catalogue costs one glyph rather than a red screen.
 */
function iconFor(iconKey: string | undefined): IoniconName {
  return (iconKey ?? 'ellipse-outline') as IoniconName;
}

/**
 * The horizontally scrolling category row.
 *
 * Icons are the catalogue's own `iconKey` in brand green on a pale green
 * tile, matching the tab bar's icon family so the screen reads as one system
 * rather than as stock art dropped into a layout.
 *
 * The list is a prop rather than the whole catalogue: Home shows only the
 * five worker types in `homeCategoryIds` and sends the rest to the All
 * Categories tab through its "View all" link.
 */
export function CategoryChips({ categories }: { categories: ServiceCategory[] }) {
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Bleeds past the screen's px-6 so the row can scroll edge to edge
      // while the first card still lines up with the headings above it.
      className="-mx-6"
      contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
    >
      {categories.map((category) => (
        <Pressable
          key={category.id}
          className="w-24 items-center rounded-2xl border border-brand-border bg-brand-surface px-2 py-3"
          onPress={() => router.push(`/category/${category.id}`)}
          accessibilityRole="button"
          accessibilityLabel={localizedName(category, locale)}
        >
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-primary-tint">
            <Ionicons name={iconFor(category.iconKey)} size={22} color={brandColors.primary} />
          </View>

          <Text
            weight="medium"
            className="mt-2 text-center text-xs text-brand-navy"
            numberOfLines={2}
          >
            {localizedName(category, locale)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
