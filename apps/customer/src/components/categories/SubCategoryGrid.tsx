import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ServiceCategory } from '@sahayo/shared';
import { brandColors, Text } from '@sahayo/ui-native';

import { localizedDescription, localizedName } from '../../mocks';
import { useAuthStore } from '../../store/auth';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function iconFor(iconKey: string | undefined): IoniconName {
  return (iconKey ?? 'ellipse-outline') as IoniconName;
}

/**
 * The two-column grid of sub-categories.
 *
 * TWO columns, where All Categories uses three. That is a deliberate
 * difference, not drift: these cards carry a description line under the
 * title, and a third of the screen width cannot hold a readable one. The
 * card treatment — bordered surface, icon in a tinted rounded square, fixed
 * height — is otherwise identical, so the two screens still read as one app.
 *
 * Five sub-categories in two columns leaves an orphan on the third row, and
 * it is left-aligned for the same reason as on All Categories: the chip row
 * makes ragged rows routine, so the last card is not a special case worth
 * branching on.
 *
 * No price appears here. Prices live at SKU level on the next screen.
 */
export function SubCategoryGrid({ subCategories }: { subCategories: ServiceCategory[] }) {
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  return (
    <View className="-mx-1.5 flex-row flex-wrap">
      {subCategories.map((sub) => {
        const name = localizedName(sub, locale);
        const description = localizedDescription(sub, locale);

        return (
          <View key={sub.id} className="w-1/2 px-1.5 pb-3">
            <Pressable
              className="h-36 rounded-2xl border border-brand-border bg-brand-surface p-3"
              onPress={() => router.push(`/subcategory/${sub.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${name}. ${description}`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-primary-tint">
                <Ionicons name={iconFor(sub.iconKey)} size={19} color={brandColors.primary} />
              </View>

              <Text
                weight="semibold"
                className="mt-2 text-sm text-brand-navy"
                numberOfLines={2}
              >
                {name}
              </Text>

              <Text className="mt-1 text-xs text-brand-muted" numberOfLines={2}>
                {description}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
