import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, formatPaise, Text } from '@sahayo/ui-native';

import { getFeaturedServices, localizedName } from '../../mocks';
import { useAuthStore } from '../../store/auth';

/**
 * The discounted-services rail.
 *
 * Every fare on screen goes through `formatPaise`. The discounted figure is
 * computed in integer paise in the mock layer, never by dividing here — the
 * render edge formats money, it does not do arithmetic on it.
 *
 * The heart is local, per-session state. There is no favourites store and no
 * backend to persist to, and inventing one would be building 2.3 early; it is
 * here because the reference has it and because a card that cannot be
 * touched looks dead next to one that can.
 */
export function BestServices() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  const [favourites, setFavourites] = useState<ReadonlySet<string>>(new Set());
  const featured = getFeaturedServices();

  function toggleFavourite(id: string) {
    setFavourites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-6"
      contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
    >
      {featured.map((service) => {
        const isFavourite = favourites.has(service.id);
        const name = localizedName(service.item, locale);

        return (
          <Pressable
            key={service.id}
            className="w-44 overflow-hidden rounded-2xl border border-brand-border bg-brand-surface"
            onPress={() => router.push(`/subcategory/${service.item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${name}. ${formatPaise(service.discountedFare, locale)}`}
          >
            {/* Solid tint beneath the photograph, so a slow or failed remote
                load leaves a coloured panel rather than a white gap. */}
            <View className="h-28 w-full bg-brand-primary-tint">
              <Image
                source={{ uri: service.imageUrl }}
                className="h-full w-full"
                resizeMode="cover"
                accessible={false}
              />

              <View className="absolute left-2 top-2 rounded-full bg-brand-primary px-2 py-0.5">
                <Text weight="semibold" className="text-xs text-white">
                  {t('home.percentOff', { percent: service.discountPercent })}
                </Text>
              </View>

              <Pressable
                className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-brand-surface"
                onPress={() => toggleFavourite(service.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isFavourite }}
                accessibilityLabel={t(
                  isFavourite ? 'home.removeFromFavourites' : 'home.addToFavourites',
                )}
                hitSlop={6}
              >
                <Ionicons
                  name={isFavourite ? 'heart' : 'heart-outline'}
                  size={15}
                  color={isFavourite ? brandColors.danger : brandColors.muted}
                />
              </Pressable>
            </View>

            <View className="p-3">
              <Text weight="semibold" className="text-sm text-brand-navy" numberOfLines={2}>
                {name}
              </Text>

              <View className="mt-2 flex-row items-baseline">
                <Text weight="bold" className="text-base text-brand-navy">
                  {formatPaise(service.discountedFare, locale)}
                </Text>
                <Text className="ml-2 text-xs text-brand-muted line-through">
                  {formatPaise(service.originalFare, locale)}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
