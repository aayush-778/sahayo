import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Image,
  Pressable,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@sahayo/ui-native';

import { bannerPromotions, localized, type Promotion } from '../../mocks';
import { useAuthStore } from '../../store/auth';

/** Matches the screen's px-6 so the first card lines up with the headings. */
const SCREEN_PADDING = 24;
const GAP = 12;
/** How much of the next card shows, which is what signals "swipe me". */
const PEEK = 28;
const ADVANCE_MS = 4000;

/**
 * The offers carousel.
 *
 * Auto-advances, snaps, and lets the next card peek at the right edge. The
 * peek matters more than the dots: a card that fills the width with no
 * neighbour visible reads as a static banner, and nobody swipes it.
 *
 * Photographs come from a CDN, so each card is painted on solid brand navy
 * first. A slow or failed load then shows a dark card with legible white
 * text rather than a hole — the scrim the text sits on is the same colour
 * either way, so the type never becomes unreadable mid-load.
 */
export function PromoCarousel() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);
  const { width } = useWindowDimensions();

  const cardWidth = width - SCREEN_PADDING * 2 - PEEK;
  const snapInterval = cardWidth + GAP;

  const listRef = useRef<FlatList<Promotion>>(null);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const goTo = useCallback(
    (next: number) => {
      indexRef.current = next;
      setActiveIndex(next);
      listRef.current?.scrollToOffset({ offset: next * snapInterval, animated: true });
    },
    [snapInterval],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      // Advancing under the user's finger fights the gesture, so the timer
      // stands down between the start of a drag and the end of its momentum.
      if (pausedRef.current) return;
      goTo((indexRef.current + 1) % bannerPromotions.length);
    }, ADVANCE_MS);

    return () => clearInterval(timer);
  }, [goTo]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    indexRef.current = next;
    setActiveIndex(next);
    pausedRef.current = false;
  };

  return (
    <View>
      <FlatList
        ref={listRef}
        data={bannerPromotions}
        keyExtractor={(promotion) => promotion.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        // Bleeds past the screen padding so cards can scroll edge to edge.
        className="-mx-6"
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, gap: GAP }}
        // Card width is computed from the viewport, which no utility class can
        // express. getItemLayout keeps scrollToOffset exact regardless of how
        // much of the list has actually been measured.
        getItemLayout={(_, index) => ({
          length: snapInterval,
          offset: snapInterval * index,
          index,
        })}
        onScrollBeginDrag={() => {
          pausedRef.current = true;
        }}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => {
          const title = localized(item.title, item.titleLocalized, locale);
          const subtitle = localized(item.subtitle, item.subtitleLocalized, locale);

          return (
            <Pressable
              style={{ width: cardWidth }}
              className="h-44 overflow-hidden rounded-2xl bg-brand-navy"
              onPress={() => router.push(`/category/${item.categoryId}`)}
              accessibilityRole="button"
              accessibilityLabel={`${title}. ${t('home.percentOff', {
                percent: item.discountPercent,
              })}. ${subtitle}`}
            >
              <Image
                source={{ uri: item.imageUrl }}
                className="absolute inset-0 h-full w-full"
                resizeMode="cover"
                accessible={false}
              />
              {/* Darkens the photograph so white type clears contrast over
                  whatever the image happens to be. */}
              <View className="absolute inset-0 bg-brand-navy/60" />

              <View className="flex-1 justify-center p-5">
                <Text className="text-xs uppercase tracking-widest text-white/80">{title}</Text>
                <Text weight="bold" className="mt-1 text-3xl text-white">
                  {t('home.percentOff', { percent: item.discountPercent })}
                </Text>
                <Text className="mt-1 text-sm text-white/90">{subtitle}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <View className="mt-3 flex-row items-center justify-center">
        {bannerPromotions.map((promotion, index) => (
          <View
            key={promotion.id}
            className={
              index === activeIndex
                ? 'mx-0.5 h-1.5 w-5 rounded-full bg-brand-primary'
                : 'mx-0.5 h-1.5 w-1.5 rounded-full bg-brand-border'
            }
          />
        ))}
      </View>
    </View>
  );
}
