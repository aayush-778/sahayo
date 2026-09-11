import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, formatPaise, FundHighlight, Text } from '@sahayo/ui-native';

import { periodOf, twelveHour } from '../../src/lib/schedule';
import { useHardwareBack } from '../../src/lib/useHardwareBack';
import { useBookingView } from '../../src/store/bookings';
import { useAuthStore } from '../../src/store/auth';
import { useBookingDraftStore } from '../../src/store/bookingDraft';
import { fareFromItemTotal } from '../../src/lib/fare';

/**
 * Booking confirmed.
 *
 * The fund block is given the same weight as the confirmation mark itself,
 * which is the point of the screen: this is the moment the customer finds out
 * that choosing a cooperative did something, and it should not be a footnote
 * under a receipt.
 *
 * PAST OR FUTURE TENSE, depending on how they paid. A cash booking has not
 * settled — nothing has reached the fund yet — so it says the money *will*
 * go, and the headline amount is what is owed rather than what was paid.
 * Congratulating someone for a contribution they have not made yet is the one
 * thing that would make this screen dishonest.
 *
 * The draft is cleared on arrival so the next booking starts from nothing.
 * The created booking lives in its own store and is read back by id, so this
 * screen survives a reload and the Track button has something real to open.
 */
export default function BookingSuccessScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const entry = useBookingView(bookingId);
  const clearDraft = useBookingDraftStore((state) => state.clear);

  useEffect(() => {
    clearDraft();
  }, [clearDraft]);

  // Payment `replace`s its way here, so the entry underneath in the stack is
  // the booking screen whose draft was just cleared. Popping to it would show
  // "pick a service first" to someone who has just paid, so hardware back
  // goes home instead — which is what a confirmation screen should do anyway.
  useHardwareBack(
    useCallback(() => {
      router.replace('/');
      return true;
    }, [router]),
  );

  // Only reachable by opening the route directly, or after a reload that
  // emptied the in-memory store.
  if (!entry) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream px-6">
        <Ionicons name="receipt-outline" size={32} color={brandColors.muted} />
        <Text className="mt-3 text-center text-base text-brand-muted">
          {t('booking.success.missing')}
        </Text>
        <Pressable
          className="mt-4 rounded-xl bg-brand-primary px-6 py-3"
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel={t('booking.success.home')}
        >
          <Text weight="semibold" className="text-base text-white">
            {t('booking.success.home')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const { booking, payment, serviceName } = entry;
  const paid = payment?.paid ?? false;
  const method = payment?.method ?? 'upi';
  const transactionId = payment?.transactionId;

  // A booking created at checkout carries the amount it was charged. One
  // settled later does not, so it is rebuilt from the split the booking
  // already holds rather than re-priced from the catalogue.
  const amountChargedPaise =
    entry.amountChargedPaise ?? fareFromItemTotal(booking.fare?.total ?? 0).total;
  const fundAmount = booking.fare?.coopFundShare ?? 0;
  const scheduled = booking.scheduledFor ? new Date(booking.scheduledFor) : null;

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 px-6">
        <View className="items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-success-soft">
            <Ionicons name="checkmark-circle" size={56} color={brandColors.success} />
          </View>

          <Text weight="bold" className="mt-4 text-center text-2xl text-brand-navy">
            {t('booking.success.title')}
          </Text>

          <Text className="mt-1 text-center text-sm text-brand-muted">{serviceName}</Text>

          <Text weight="bold" className="mt-5 text-center text-4xl text-brand-navy">
            {formatPaise(amountChargedPaise, locale)}
          </Text>
          <Text className="mt-1 text-center text-sm text-brand-muted">
            {paid
              ? t('booking.success.paidWith', {
                  method: t(`booking.payment.methods.${method}`),
                })
              : t('booking.success.dueOnCompletion', {
                  amount: formatPaise(amountChargedPaise, locale),
                })}
          </Text>
        </View>

        {scheduled ? (
          <View className="mt-5 flex-row items-center rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
            <Ionicons name="calendar-outline" size={16} color={brandColors.primary} />
            <Text className="ml-2 flex-1 text-sm text-brand-navy">
              {t('booking.schedule.chosen', {
                day: t(`booking.schedule.weekdays.${scheduled.getDay()}`),
                date: scheduled.getDate(),
                month: t(`booking.schedule.months.${scheduled.getMonth()}`),
                time: t('booking.schedule.timeFormat', {
                  hour: twelveHour(scheduled.getHours()),
                  period: t(`booking.schedule.periods.${periodOf(scheduled.getHours())}`),
                }),
              })}
            </Text>
          </View>
        ) : null}

        <FundHighlight
          className="mt-5"
          amount={fundAmount}
          title={
            paid
              ? t('booking.success.fundTitlePaid')
              : t('booking.success.fundTitlePending')
          }
          body={
            paid ? t('booking.success.fundBodyPaid') : t('booking.success.fundBodyPending')
          }
          locale={locale}
          icon={<Ionicons name="people" size={24} color={brandColors.surface} />}
        />

        <View className="mt-4 rounded-2xl border border-brand-border bg-brand-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-brand-muted">{t('booking.success.reference')}</Text>
            <Text weight="medium" className="ml-3 text-sm text-brand-navy">
              {booking.id}
            </Text>
          </View>
          {transactionId ? (
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-sm text-brand-muted">
                {t('booking.success.transaction')}
              </Text>
              <Text weight="medium" className="ml-3 text-sm text-brand-navy">
                {transactionId}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-1" />

        <Pressable
          className="mt-6 h-14 flex-row items-center justify-center rounded-xl bg-brand-primary"
          onPress={() => router.push(`/track/${booking.id}`)}
          accessibilityRole="button"
          accessibilityLabel={t('booking.success.track')}
        >
          <Text weight="semibold" className="text-base text-white">
            {t('booking.success.track')}
          </Text>
        </Pressable>

        <Pressable
          className="mt-3 h-14 flex-row items-center justify-center rounded-xl border border-brand-border bg-brand-surface"
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel={t('booking.success.home')}
        >
          <Text weight="semibold" className="text-base text-brand-navy">
            {t('booking.success.home')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
