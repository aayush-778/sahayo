import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ServiceCategory } from '@sahayo/shared';
import { brandColors, Text } from '@sahayo/ui-native';

import { localizedName } from '../../mocks';
import { useAuthStore } from '../../store/auth';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * `ServiceCategory.iconKey` is a plain string in @sahayo/shared, because the
 * shared package has no business knowing which icon set a client uses. The
 * cast is the seam between the two; the fallback means a typo in the
 * catalogue costs one glyph rather than a red screen.
 */
function iconFor(iconKey: string | undefined): IoniconName {
  return (iconKey ?? 'ellipse-outline') as IoniconName;
}

/**
 * The three-column grid of worker types.
 *
 * Ten categories in three columns leaves one card alone on the fourth row.
 * That orphan is left-aligned rather than centred or stretched, for a reason
 * that outlives the count of ten: the filter chips make ragged rows ROUTINE.
 * Repairs shows four (3 + 1), Upkeep and Home Support show three (a clean
 * row), and a search query can leave any number at all. Special-casing the
 * last card would mean special-casing it on every filter change; plain
 * `flex-wrap` handles every state with no branching, and it is what the
 * design reference itself does with its own nineteen cards.
 *
 * Cards are a fixed height so a two-line Hindi label — "घरेलू सहायक" wraps,
 * "इलेक्ट्रीशियन" does not — never staggers the row beside it.
 */
export function CategoryGrid({ categories }: { categories: ServiceCategory[] }) {
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  return (
    <View className="-mx-1.5 flex-row flex-wrap">
      {categories.map((category) => {
        const name = localizedName(category, locale);

        return (
          <View key={category.id} className="w-1/3 px-1.5 pb-3">
            <Pressable
              className="h-28 justify-between rounded-2xl border border-brand-border bg-brand-surface p-3"
              onPress={() => router.push(`/category/${category.id}`)}
              accessibilityRole="button"
              accessibilityLabel={name}
            >
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-primary-tint">
                <Ionicons name={iconFor(category.iconKey)} size={19} color={brandColors.primary} />
              </View>

              {/* Two lines, no auto-shrink. `adjustsFontSizeToFit` is
                  unreliable on Android and would size each card's label
                  independently, leaving the grid visibly ragged. Most Hindi
                  labels contain a space and wrap ("घरेलू सहायक"); the one to
                  watch is "इलेक्ट्रीशियन", which is a single unbreakable
                  word and will ellipsise rather than shrink if it overruns. */}
              <Text weight="medium" className="text-xs text-brand-navy" numberOfLines={2}>
                {name}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
