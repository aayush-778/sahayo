import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookingStatus } from '@sahayo/shared';
import { brandColors, formatDuration, Text } from '@sahayo/ui-native';

import { localizedName, type LiveOrder } from '../../mocks';
import { useAuthStore } from '../../store/auth';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Which `home.status.*` line describes each in-flight state.
 *
 * Only the statuses a customer can actually be looking at are listed. The
 * card is not rendered at all for REQUESTED or BROADCAST — there is no worker
 * to name yet — nor for anything terminal.
 */
const STATUS_KEY: Partial<Record<BookingStatus, string>> = {
  [BookingStatus.ACCEPTED]: 'home.status.ACCEPTED',
  [BookingStatus.EN_ROUTE]: 'home.status.EN_ROUTE',
  [BookingStatus.ARRIVED]: 'home.status.ARRIVED',
  [BookingStatus.IN_PROGRESS]: 'home.status.IN_PROGRESS',
};

/**
 * The live-order card. Rendered only when a booking is actually in flight.
 *
 * The design reference showed a scheduled job with a date and a time slot.
 * That line cannot be truthful here: these bookings are happening now, so
 * there is no future slot to print. It carries the worker's name and their
 * live status instead, which is what someone glancing at their phone mid-job
 * actually wants to know.
 */
export function LiveOrderCard({ order }: { order: LiveOrder }) {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  const statusKey = STATUS_KEY[order.booking.status];
  if (!statusKey) return null;

  const serviceName = order.service ? localizedName(order.service, locale) : '';
  const workerName = order.worker?.user.name ?? '';

  const status = t(statusKey, { worker: workerName });
  const subtitle =
    order.etaMinutes === undefined
      ? status
      : t('home.liveOrderSubtitle', {
          status,
          eta: formatDuration(order.etaMinutes, locale),
        });

  return (
    <Pressable
      className="flex-row items-center rounded-2xl bg-brand-navy p-4"
      onPress={() => router.push(`/track/${order.booking.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${t('home.liveOrder')}. ${serviceName}. ${subtitle}`}
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-white/15">
        <Ionicons
          name={(order.service?.iconKey ?? 'construct-outline') as IoniconName}
          size={22}
          color={brandColors.surface}
        />
      </View>

      <View className="ml-3 flex-1">
        <Text weight="semibold" className="text-base text-white" numberOfLines={1}>
          {serviceName}
        </Text>
        <Text className="mt-0.5 text-sm text-white/75" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={brandColors.surface} />
    </Pressable>
  );
}
