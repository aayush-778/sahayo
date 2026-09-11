import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookingStatus } from '@sahayo/shared';
import { Avatar, brandColors, formatDistance, formatPaise, Text } from '@sahayo/ui-native';

import { chipToneFor } from '../../lib/bookingStatus';
import { periodOf, twelveHour } from '../../lib/schedule';
import type { BookingView } from '../../store/bookings';
import { useAuthStore } from '../../store/auth';

const CHIP_CLASS: Record<'success' | 'danger' | 'muted', string> = {
  success: 'bg-brand-success-soft',
  danger: 'bg-brand-danger-soft',
  muted: 'bg-brand-primary-tint',
};

const CHIP_TEXT: Record<'success' | 'danger' | 'muted', string> = {
  success: 'text-brand-success',
  danger: 'text-brand-danger',
  muted: 'text-brand-primary',
};

/**
 * One booking in the list.
 *
 * Service name on its own line, then the worker — name, rating and distance —
 * on the second. That ordering is the cooperative narrative in miniature: the
 * customer booked a job, but a person is doing it, and the person should not
 * be a footnote under the SKU.
 *
 * The whole card is the tap target. A separate "Details" button would be a
 * second way to do the one thing the card already does. "Book again" is the
 * exception: it is a different action, so it gets a button, and only on past
 * bookings where repeating the job makes sense.
 */
export function BookingCard({
  view,
  showBookAgain,
}: {
  view: BookingView;
  showBookAgain: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  const { booking, status, worker, serviceName, fare, payment } = view;
  const tone = chipToneFor(status);
  const when = booking.scheduledFor ? new Date(booking.scheduledFor) : new Date(booking.createdAt);
  const owesMoney = payment?.paid === false;

  return (
    <Pressable
      className="mb-3 rounded-2xl border border-brand-border bg-brand-surface p-4"
      onPress={() => router.push(`/track/${booking.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${serviceName}. ${t(`booking.status.${status}`)}`}
    >
      <View className="flex-row items-center">
        <Ionicons name="calendar-outline" size={14} color={brandColors.muted} />
        <Text className="ml-1.5 flex-1 text-xs text-brand-muted">
          {t('bookings.when', {
            day: when.getDate(),
            month: t(`booking.schedule.months.${when.getMonth()}`),
            time: t('booking.schedule.timeFormat', {
              hour: twelveHour(when.getHours()),
              period: t(`booking.schedule.periods.${periodOf(when.getHours())}`),
            }),
          })}
        </Text>

        <View className={`rounded-full px-2.5 py-1 ${CHIP_CLASS[tone]}`}>
          <Text weight="medium" className={`text-xs ${CHIP_TEXT[tone]}`}>
            {t(`booking.status.${status}`)}
          </Text>
        </View>
      </View>

      <Text weight="semibold" className="mt-2.5 text-base text-brand-navy" numberOfLines={2}>
        {serviceName}
      </Text>

      {worker ? (
        <View className="mt-2.5 flex-row items-center">
          <Avatar name={worker.user.name} size="md" />
          <View className="ml-2.5 flex-1">
            <Text weight="medium" className="text-sm text-brand-navy" numberOfLines={1}>
              {worker.user.name}
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="star" size={11} color={brandColors.warning} />
              <Text className="ml-1 text-xs text-brand-muted">
                {worker.profile.ratingAvg.toFixed(1)}
              </Text>
              <Text className="mx-1.5 text-xs text-brand-border">|</Text>
              <Text className="text-xs text-brand-muted">
                {formatDistance(worker.distanceM, locale)}
              </Text>
            </View>
          </View>
          {fare ? (
            <Text weight="semibold" className="ml-2 text-sm text-brand-navy">
              {formatPaise(fare.total, locale)}
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="mt-2.5 flex-row items-center">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-primary-tint">
            <Ionicons name="search-outline" size={15} color={brandColors.primary} />
          </View>
          <Text className="ml-2.5 flex-1 text-sm text-brand-muted">
            {status === BookingStatus.REQUESTED || status === BookingStatus.BROADCAST
              ? t('bookings.findingWorker')
              : t('bookings.noWorker')}
          </Text>
          {fare ? (
            <Text weight="semibold" className="ml-2 text-sm text-brand-navy">
              {formatPaise(fare.total, locale)}
            </Text>
          ) : null}
        </View>
      )}

      {owesMoney ? (
        <View className="mt-2.5 flex-row items-center rounded-lg bg-brand-warning-soft px-2.5 py-1.5">
          <Ionicons name="cash-outline" size={13} color={brandColors.warning} />
          <Text weight="medium" className="ml-1.5 flex-1 text-xs text-brand-warning">
            {t('bookings.cashPending')}
          </Text>
        </View>
      ) : null}

      {showBookAgain && view.subCategoryId ? (
        <Pressable
          className="mt-3 h-11 items-center justify-center rounded-xl border-2 border-brand-primary bg-brand-surface"
          onPress={() => view.subCategoryId && router.push(`/subcategory/${view.subCategoryId}`)}
          accessibilityRole="button"
          accessibilityLabel={t('bookings.bookAgain')}
        >
          <Text weight="semibold" className="text-sm text-brand-primary">
            {t('bookings.bookAgain')}
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}
