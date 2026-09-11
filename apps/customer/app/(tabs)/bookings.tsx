import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, SkeletonCard, Text } from '@sahayo/ui-native';

import { BookingCard } from '../../src/components/bookings/BookingCard';
import { FilterChips } from '../../src/components/FilterChips';
import { BOOKING_GROUPS, groupOf, type BookingGroup } from '../../src/lib/bookingStatus';
import { useResourceLoading } from '../../src/lib/loading';
import { useBookingViews } from '../../src/store/bookings';

const EMPTY_ICON: Record<BookingGroup, 'flash-outline' | 'calendar-outline' | 'archive-outline'> = {
  active: 'flash-outline',
  upcoming: 'calendar-outline',
  past: 'archive-outline',
};

/**
 * Bookings.
 *
 * Three tabs, no pinned live section. A live booking pinned above a tab that
 * also contains it means the same card twice on one screen; making Active the
 * default tab puts it first anyway, at no cost.
 *
 * The tabs are a partition of the state machine, not a hand-kept list:
 * `groupOf` decides from status plus `scheduledFor`, so a booking scheduled
 * for Friday moves from Upcoming to Active on Friday with no state change and
 * nothing to remember to update.
 *
 * Bookings created in this session and the seeded history are merged by the
 * store and sorted newest first, so something booked a minute ago is the top
 * card without the screen knowing there were ever two sources.
 */
export default function BookingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<BookingGroup>('active');
  const views = useBookingViews();
  const loading = useResourceLoading('bookings');

  const buckets = useMemo(() => {
    const now = Date.now();
    const out: Record<BookingGroup, typeof views> = { active: [], upcoming: [], past: [] };
    for (const view of views) {
      out[groupOf(view.status, view.booking.scheduledFor, now)].push(view);
    }
    return out;
  }, [views]);

  const chips = BOOKING_GROUPS.map((entry) => ({
    key: entry,
    // `n`, not `count`: an option named `count` switches i18next onto
    // plural resolution, which needs Intl.PluralRules.
    label: t(`bookings.groups.${entry}`, { n: buckets[entry].length }),
  }));

  const visible = buckets[group];

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 px-6">
        <Text weight="bold" className="text-2xl text-brand-navy">
          {t('bookings.title')}
        </Text>

        <View className="mt-4">
          {/* `FilterChips` treats "all" as the absence of a filter and hands
              back null for it. No group here is an absence, so the null is
              folded back to the current tab — these are tabs wearing the
              chip's clothes, and the row should not be able to select
              nothing. */}
          <FilterChips
            chips={chips}
            selected={group}
            onSelect={(key) => setGroup((current) => (key as BookingGroup | null) ?? current)}
          />
        </View>

        {loading ? (
          <View className="mt-5">
            <SkeletonCard className="mb-3" />
            <SkeletonCard className="mb-3" />
            <SkeletonCard />
          </View>
        ) : visible.length > 0 ? (
          <View className="mt-5">
            {visible.map((view) => (
              <BookingCard key={view.booking.id} view={view} showBookAgain={group === 'past'} />
            ))}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-primary-tint">
              <Ionicons name={EMPTY_ICON[group]} size={28} color={brandColors.primary} />
            </View>
            <Text weight="semibold" className="mt-4 text-center text-lg text-brand-navy">
              {t(`bookings.empty.${group}.title`)}
            </Text>
            <Text className="mt-1 text-center text-sm text-brand-muted">
              {t(`bookings.empty.${group}.body`)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
