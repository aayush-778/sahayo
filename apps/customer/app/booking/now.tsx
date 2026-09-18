import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  COOP_FUND_SHARE,
  DEFAULT_RADIUS_M,
  GST_RATE,
  PLATFORM_SHARE,
} from '@sahayo/shared';
import {
  brandColors,
  FarePanel,
  formatDistance,
  formatPaise,
  FundHighlight,
  Text,
  type FareRow,
} from '@sahayo/ui-native';

import { WorkerMap } from '../../src/components/booking/WorkerMap';
import {
  findParentCategory,
  localizedName,
  mockServiceLocation,
  workersNear,
} from '../../src/mocks';
import { etaMinutesFor } from '../../src/lib/fare';
import { bookLive, useFareQuote, useServerBacked } from '../../src/services/live';
import { useAuthStore } from '../../src/store/auth';
import { useBookingDraftStore, useDraftedServiceItem } from '../../src/store/bookingDraft';

/** A percentage, for a label like "Platform fee (5%)". */
function percent(share: number): string {
  return String(Math.round(share * 100));
}

/**
 * Book now — the broadcast map and the fare.
 *
 * THE FARE MODEL. The platform fee and the community fund are shares taken
 * OUT of the item total, not fees added to it; only GST is added on top. That
 * is why those rows sit indented under "Included in the item total" and do
 * not participate in the sum down to "Total payable" — a customer who tries
 * to add the column should still arrive at the right number. See
 * `src/lib/fare.ts`, which owns the arithmetic and explains the choice.
 *
 * The worker's share is shown alongside the other two for the same reason:
 * with only the platform fee and the fund visible, the indented group looks
 * like it ought to sum to the item total and conspicuously does not. All
 * three together do, exactly.
 *
 * The panel itself lives in `@sahayo/ui-native` — `booking/schedule.tsx`
 * quotes the identical breakdown, and two screens is the threshold for
 * promoting a component out of the app.
 *
 * Every percentage is read from @sahayo/shared. There is no literal 5, 18 or
 * 1.5 anywhere in this file.
 *
 * THE PRICE IS THE SERVER'S. Connected, the fare comes from /pricing/quote — urgency,
 * weather and demand, capped — and Book creates the booking there and goes straight to
 * tracking; the customer pays once the job is done. Offline, the old local calculation
 * stands in, marked as an estimate, and the demo flow through payment runs as before.
 */
export default function BookNowScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  const subCategoryId = useBookingDraftStore((state) => state.subCategoryId);
  const item = useDraftedServiceItem();
  const quote = useFareQuote(item, null);
  const serverBacked = useServerBacked();
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const category = subCategoryId ? findParentCategory(subCategoryId) : undefined;
  const nearby = category ? workersNear(category.id) : [];
  const etaMinutes = nearby.length > 0 ? etaMinutesFor(nearby[0].distanceM) : undefined;

  // Reachable only by opening /booking/now directly, with no row tapped.
  if (!item || !category || !quote) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream px-6">
        <Ionicons name="cart-outline" size={32} color={brandColors.muted} />
        <Text className="mt-3 text-center text-base text-brand-muted">
          {t('booking.now.noDraft')}
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

  const { fare } = quote;
  const totalLabel = formatPaise(fare.total, locale);

  async function book() {
    if (!item) return;
    if (!serverBacked) {
      router.push('/booking/payment');
      return;
    }
    setBooking(true);
    setBookError(null);
    const result = await bookLive(item, null);
    setBooking(false);
    if (result.ok) router.replace(`/track/${result.bookingId}`);
    else setBookError(result.message);
  }

  const rows: FareRow[] = [
    { kind: 'amount', key: 'item', label: t('booking.now.itemPrice'), amount: fare.base },
    ...(fare.surge > 0
      ? ([
          {
            kind: 'amount',
            key: 'surge',
            label: t('booking.now.surge', { multiplier: quote.multiplier }),
            amount: fare.surge,
          },
        ] as FareRow[])
      : []),
    { kind: 'divider', key: 'before-item-total' },
    {
      kind: 'amount',
      key: 'item-total',
      label: t('booking.now.itemTotal'),
      amount: fare.itemTotal,
    },
    { kind: 'caption', key: 'included', label: t('booking.now.includedNote') },
    {
      kind: 'amount',
      key: 'worker',
      label: t('booking.now.workerEarns', {
        percent: percent(1 - PLATFORM_SHARE - COOP_FUND_SHARE),
      }),
      amount: fare.workerEarns,
      tone: 'muted',
      indented: true,
    },
    {
      kind: 'amount',
      key: 'platform',
      label: t('booking.now.platformFee', { percent: percent(PLATFORM_SHARE) }),
      amount: fare.platformFee,
      tone: 'muted',
      indented: true,
    },
    {
      kind: 'amount',
      key: 'fund',
      label: t('booking.now.coopFund', { percent: percent(COOP_FUND_SHARE) }),
      amount: fare.coopFund,
      tone: 'fund',
      indented: true,
      icon: <Ionicons name="people" size={14} color={brandColors.success} />,
    },
    { kind: 'divider', key: 'before-gst' },
    {
      kind: 'amount',
      key: 'gst',
      label: t('booking.now.gst', { percent: percent(GST_RATE) }),
      amount: fare.gst,
    },
    ...(quote.source === 'estimate'
      ? ([
          {
            kind: 'caption',
            key: 'estimate',
            label: quote.loading ? t('booking.now.quoting') : t('booking.now.offlineEstimate'),
          },
        ] as FareRow[])
      : []),
  ];

  const ctaLabel = serverBacked ? t('booking.now.bookNow', { amount: totalLabel }) : t('booking.now.confirm', { amount: totalLabel });

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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/categories'))}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={18} color={brandColors.navy} />
          </Pressable>

          <View className="ml-3 flex-1">
            <Text weight="bold" className="text-2xl text-brand-navy" numberOfLines={1}>
              {t('booking.now.title')}
            </Text>
            <Text className="text-xs text-brand-muted" numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>

        <View className="mt-5">
          <WorkerMap
            workers={nearby}
            centre={mockServiceLocation.point}
            radiusM={DEFAULT_RADIUS_M}
            etaMinutes={etaMinutes}
          />
        </View>

        <View className="mt-3 flex-row items-center">
          <View className="h-2 w-2 rounded-full bg-brand-success" />
          <Text className="ml-2 flex-1 text-sm text-brand-muted">
            {t('booking.now.available', {
              workers: nearby.length,
              category: localizedName(category, locale),
              radius: formatDistance(DEFAULT_RADIUS_M, locale),
            })}
          </Text>
        </View>

        <FarePanel
          className="mt-5"
          title={t('booking.now.fareTitle')}
          rows={rows}
          totalLabel={t('booking.now.total')}
          totalAmount={fare.total}
          locale={locale}
        />

        <FundHighlight
          className="mt-4"
          amount={fare.coopFund}
          title={t('booking.now.fundStripTitle')}
          body={t('booking.now.fundStripBody')}
          locale={locale}
          icon={<Ionicons name="people" size={24} color={brandColors.surface} />}
        />

        {bookError ? (
          <Text className="mt-4 text-center text-sm text-brand-danger">{bookError}</Text>
        ) : null}

        <Pressable
          className="mt-5 h-14 flex-row items-center justify-center rounded-xl bg-brand-primary"
          onPress={() => void book()}
          disabled={booking || (serverBacked && quote.loading)}
          accessibilityRole="button"
          accessibilityState={{ disabled: booking || (serverBacked && quote.loading), busy: booking }}
          accessibilityLabel={ctaLabel}
        >
          {booking ? (
            <ActivityIndicator color={brandColors.surface} />
          ) : (
            <Text weight="semibold" className="text-base text-white">
              {ctaLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
