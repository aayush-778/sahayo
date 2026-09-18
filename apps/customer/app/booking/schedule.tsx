import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COOP_FUND_SHARE, GST_RATE, PLATFORM_SHARE } from '@sahayo/shared';
import {
  brandColors,
  FarePanel,
  formatPaise,
  FundHighlight,
  Text,
  type FareRow,
} from '@sahayo/ui-native';

import { DateStrip } from '../../src/components/booking/DateStrip';
import { TimeSlots, useSlotLabel } from '../../src/components/booking/TimeSlots';
import { bookLive, useFareQuote, useServerBacked } from '../../src/services/live';
import {
  buildSchedule,
  firstBookableDay,
  firstBookableHour,
  slotToIso,
  type ScheduleDay,
} from '../../src/lib/schedule';
import { useAuthStore } from '../../src/store/auth';
import { useBookingDraftStore, useDraftedServiceItem } from '../../src/store/bookingDraft';

/** A percentage, for a label like "Platform fee (5%)". */
function percent(share: number): string {
  return String(Math.round(share * 100));
}

/**
 * Schedule — pick a day and a slot, then the same fare as booking now.
 *
 * NO SURGE. A scheduled booking is quoted with a `scheduledFor`, which the server
 * prices with no urgency, weather or demand term, deliberately and not as an
 * oversight: those are statements about right now, and charging Friday afternoon
 * at today's multiplier is not defensible. So the total here is lower than the
 * same item booked immediately. Offline, the local estimate is taken without
 * surge for the same reason.
 *
 * NO MAP. Which worker takes a job three days out is not decided now, so a
 * map of who happens to be online this minute would be telling the customer
 * something untrue. `booking/now.tsx` shows one because there it is the
 * actual broadcast.
 *
 * The fare panel and the fund block are the same `@sahayo/ui-native`
 * components this screen's sibling uses, so the two cannot drift.
 */
export default function ScheduleScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);
  const slotLabel = useSlotLabel();

  const item = useDraftedServiceItem();
  const setSchedule = useBookingDraftStore((state) => state.setSchedule);
  const draftSlot = useBookingDraftStore((state) => state.scheduledFor);
  const serverBacked = useServerBacked();
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  // Any slot prices the same, so the quote is taken for a stand-in slot until one is
  // chosen — never for "now", which would show a surge a scheduled job does not pay.
  const standInSlot = useMemo(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), []);
  const quote = useFareQuote(item, draftSlot ?? standInSlot);

  // Built once per mount, from the device clock. Rebuilding on every render
  // would let the strip shift under the customer's finger at a slot boundary.
  const days = useMemo(() => buildSchedule(), []);

  const initialDay = firstBookableDay(days) ?? days[0];
  const [selectedKey, setSelectedKey] = useState(initialDay?.key ?? null);
  const [selectedHour, setSelectedHour] = useState<number | null>(
    initialDay ? (firstBookableHour(initialDay) ?? null) : null,
  );

  const selectedDay = days.find((day) => day.key === selectedKey);

  // Keep the store in step with the selection, so payment reads one source of
  // truth rather than being handed the slot as a route param.
  useEffect(() => {
    setSchedule(selectedDay && selectedHour !== null ? slotToIso(selectedDay, selectedHour) : null);
  }, [selectedDay, selectedHour, setSchedule]);

  function chooseDay(day: ScheduleDay) {
    setSelectedKey(day.key);
    // Carry the time across where the new day also offers it; otherwise fall
    // to that day's first free slot. Silently keeping a slot the new day has
    // taken would let the customer confirm a booking nobody can fulfil.
    const stillFree = day.slots.some((slot) => slot.hour === selectedHour && !slot.unavailable);
    setSelectedHour(stillFree ? selectedHour : (firstBookableHour(day) ?? null));
  }

  if (!item || !quote) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream px-6">
        <Ionicons name="calendar-outline" size={32} color={brandColors.muted} />
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
  const ready = selectedDay !== undefined && selectedHour !== null && !(serverBacked && quote.loading) && !booking;
  const ctaLabel = serverBacked
    ? t('booking.schedule.bookNow', { amount: totalLabel })
    : t('booking.schedule.confirm', { amount: totalLabel });

  async function book() {
    if (!item || !selectedDay || selectedHour === null) return;
    if (!serverBacked) {
      router.push('/booking/payment');
      return;
    }
    setBooking(true);
    setBookError(null);
    const result = await bookLive(item, slotToIso(selectedDay, selectedHour));
    setBooking(false);
    if (result.ok) router.replace(`/track/${result.bookingId}`);
    else setBookError(result.message);
  }

  const rows: FareRow[] = [
    { kind: 'amount', key: 'item', label: t('booking.now.itemPrice'), amount: fare.base },
    { kind: 'divider', key: 'before-item-total' },
    {
      kind: 'amount',
      key: 'item-total',
      label: t('booking.now.itemTotal'),
      amount: fare.itemTotal,
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
  ];

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
              {t('booking.schedule.title')}
            </Text>
            <Text className="text-xs text-brand-muted" numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>

        <Text weight="semibold" className="mt-6 text-base text-brand-navy">
          {t('booking.schedule.selectDate')}
        </Text>
        <View className="mt-2">
          <DateStrip days={days} selectedKey={selectedKey} onSelect={chooseDay} />
        </View>

        <Text weight="semibold" className="mt-6 text-base text-brand-navy">
          {t('booking.schedule.selectTime')}
        </Text>
        <View className="mt-3">
          <TimeSlots
            slots={selectedDay?.slots ?? []}
            selectedHour={selectedHour}
            onSelect={setSelectedHour}
          />
        </View>

        {ready ? (
          <View className="mt-4 flex-row items-center rounded-xl border border-brand-primary-soft bg-brand-primary-tint px-4 py-3">
            <Ionicons name="calendar" size={16} color={brandColors.primary} />
            <Text weight="medium" className="ml-2 flex-1 text-sm text-brand-navy">
              {t('booking.schedule.chosen', {
                day: selectedDay.isToday
                  ? t('booking.schedule.today')
                  : t(`booking.schedule.weekdays.${selectedDay.weekday}`),
                date: selectedDay.dayOfMonth,
                month: t(`booking.schedule.months.${selectedDay.month}`),
                time: slotLabel(selectedHour),
              })}
            </Text>
          </View>
        ) : null}

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

        <Pressable
          className={`mt-5 h-14 flex-row items-center justify-center rounded-xl ${
            ready ? 'bg-brand-primary' : 'bg-brand-primary-soft'
          }`}
          disabled={!ready}
          onPress={() => void book()}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy: booking }}
          accessibilityLabel={ctaLabel}
        >
          {booking ? (
            <ActivityIndicator color={brandColors.surface} />
          ) : (
            <Text
              weight="semibold"
              className={`text-base ${ready ? 'text-white' : 'text-brand-muted'}`}
            >
              {ctaLabel}
            </Text>
          )}
        </Pressable>
        {bookError ? <Text className="mt-3 text-center text-sm text-brand-danger">{bookError}</Text> : null}
      </View>
    </ScrollView>
  );
}
