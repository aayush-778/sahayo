import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, SearchField } from '@sahayo/ui-native';

import { BestServices } from '../../src/components/home/BestServices';
import { CategoryChips } from '../../src/components/home/CategoryChips';
import { HomeHeader } from '../../src/components/home/HomeHeader';
import { HomeSearchResults } from '../../src/components/home/HomeSearchResults';
import { LiveOrderCard } from '../../src/components/home/LiveOrderCard';
import { PromoCarousel } from '../../src/components/PromoCarousel';
import { SectionHeader } from '../../src/components/home/SectionHeader';
import { getLiveOrders, homeCategories } from '../../src/mocks';

/**
 * Home.
 *
 * Composition only — every section owns its own data and layout, so this file
 * stays a readable table of contents for the screen. The order matches the
 * workflow sketch top to bottom.
 *
 * The live-order card appears only when something is actually in flight. It
 * is not a placeholder that empties out: with no live booking the section and
 * its spacing are absent entirely, and the carousel runs straight into "Best
 * services". Log out, sign up again and it is still there, because the mocks
 * are static — Phase 5 is where it starts and stops with the socket.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;

  // Only the first one. Two stacked cards eat most of the fold on the screen
  // that has the most to say.
  const [liveOrder] = getLiveOrders();

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        // The tab bar floats over the content, so the last card needs to
        // clear it as well as the home indicator.
        paddingBottom: insets.bottom + 24,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6">
        <HomeHeader />

        <SearchField
          className="mt-5"
          placeholder={t('home.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel={t('home.searchPlaceholder')}
          leadingIcon={<Ionicons name="search-outline" size={18} color={brandColors.muted} />}
          trailingIcon={
            searching ? (
              <Pressable
                onPress={() => setQuery('')}
                accessibilityRole="button"
                accessibilityLabel={t('categories.clearSearch')}
                hitSlop={10}
              >
                <Ionicons name="close-circle" size={18} color={brandColors.muted} />
              </Pressable>
            ) : (
              <Ionicons name="options-outline" size={18} color={brandColors.navy} />
            )
          }
        />

        {searching ? <HomeSearchResults query={query} /> : null}

        {searching ? null : (
          <>
            <SectionHeader
              className="mt-7"
              title={t('home.allCategories')}
              actionLabel={t('home.viewAll')}
              actionHref="/categories"
            />
            <View className="mt-3">
              <CategoryChips categories={homeCategories()} />
            </View>

            <View className="mt-7">
              <PromoCarousel />
            </View>

            {liveOrder ? (
              <View className="mt-6">
                <LiveOrderCard order={liveOrder} />
              </View>
            ) : null}

            <SectionHeader
              className="mt-7"
              title={t('home.bestServices')}
              actionLabel={t('home.viewAll')}
              actionHref="/categories"
            />
            <View className="mt-3">
              <BestServices />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
