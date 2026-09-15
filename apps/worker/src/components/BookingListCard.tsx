import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Booking } from '@sahayo/shared';
import { formatPaise, Text, useThemeColors } from '@sahayo/ui-native';

import { formatWhen, jobCode } from '../lib/datetime';
import { toneForStatus, type BadgeTone } from '../lib/status';
import {
  CANCELLED_STATUSES,
  COMPLETED_STATUSES,
  findSubCategory,
  localizedName,
  PENDING_STATUSES,
  useLanguage,
  type BoardItem,
} from '../services';
import type { JobRequest } from '../types';
import { StatusBadge } from './StatusBadge';

/**
 * One card on the Bookings tab, in three shapes:
 *
 *   an offer      Pending badge, Accept and Reject; tapping opens the offer
 *   a booking     its status; ongoing work shows View details, finished and
 *                 cancelled work open their summary
 *   a rejection   Rejected badge and the reason given; nothing to open
 *
 * Customer, job id, service, time, place and fare sit in the same spots in all
 * three, so a scrolling eye does not have to re-learn each card.
 */
export function BookingListCard({
  item,
  canAccept,
  accepting,
  onAccept,
  onReject,
}: {
  item: BoardItem;
  canAccept: boolean;
  accepting: boolean;
  onAccept: (request: JobRequest) => void;
  onReject: (request: JobRequest) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const language = useLanguage();

  let booking: Booking;
  let customerName: string;
  let badge: { label: string; tone: BadgeTone };
  let whenIso: string;
  let open: (() => void) | undefined;

  if (item.kind === 'request') {
    const { request } = item;
    booking = request.booking;
    customerName = request.customer.name;
    badge = { label: t('worker.status.PENDING_REQUEST'), tone: 'warning' };
    whenIso = booking.scheduledFor ?? booking.createdAt;
    open = () => router.push(`/job/${request.id}`);
  } else if (item.kind === 'declined') {
    booking = item.record.request.booking;
    customerName = item.record.request.customer.name;
    badge = { label: t('worker.status.DECLINED'), tone: 'danger' };
    whenIso = item.record.declinedAt;
  } else {
    const current = item.booking;
    booking = current;
    customerName = item.customer?.name ?? '—';
    badge = { label: t(`worker.status.${current.status}`), tone: toneForStatus(current.status) };
    whenIso =
      COMPLETED_STATUSES.has(current.status) || CANCELLED_STATUSES.has(current.status)
        ? current.updatedAt
        : (current.scheduledFor ?? current.createdAt);
    open = () => router.push(`/job/active/${current.id}`);
  }

  const service = findSubCategory(booking.serviceCategoryId);
  const fare = booking.fare;
  const address = booking.address;
  const ongoing = item.kind === 'booking' && PENDING_STATUSES.has(booking.status);
  const history = item.kind === 'booking' && !ongoing;

  const summary: ReactNode = (
    <>
      <View className="flex-row items-start">
        <View className="flex-1 pr-2">
          <Text weight="semibold" className="text-base text-worker-ink" numberOfLines={1}>
            {customerName}
          </Text>
          <Text className="text-xs text-worker-muted">{jobCode(booking.id)}</Text>
        </View>
        <StatusBadge label={badge.label} tone={badge.tone} />
      </View>

      <View className="mt-2 flex-row items-end">
        <View className="flex-1 pr-2">
          <Text weight="semibold" className="text-sm text-worker-primary" numberOfLines={1}>
            {service ? localizedName(service, language) : booking.serviceCategoryId}
          </Text>
          <View className="mt-1 flex-row items-center">
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <Text className="ml-1.5 flex-1 text-xs text-worker-muted" numberOfLines={1}>
              {formatWhen(whenIso, t)}
            </Text>
          </View>
          <View className="mt-0.5 flex-row items-center">
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text className="ml-1.5 flex-1 text-xs text-worker-muted" numberOfLines={1}>
              {`${address.line2 ?? address.line1}, ${address.city}`}
            </Text>
          </View>
        </View>
        {fare ? (
          <View className="items-end">
            <Text weight="bold" className="text-lg text-worker-ink">
              {formatPaise(fare.total, language)}
            </Text>
            <Text className="text-xs text-worker-success">
              {t('worker.dashboard.request.youGet', { amount: formatPaise(fare.workerShare, language) })}
            </Text>
          </View>
        ) : null}
      </View>

      {item.kind === 'declined' ? (
        <Text className="mt-2 text-xs text-worker-muted">
          {t('worker.bookings.declineReason', { reason: t(`worker.job.decline.reasons.${item.record.reason}`) })}
        </Text>
      ) : null}
    </>
  );

  const shell = 'rounded-2xl border border-worker-border bg-worker-surface p-4';

  if (item.kind === 'declined') {
    return <View className={shell}>{summary}</View>;
  }

  if (item.kind === 'request') {
    const request = item.request;
    const disabled = !canAccept || accepting;
    return (
      <View className={shell}>
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${customerName}. ${badge.label}`}>
          {summary}
        </Pressable>
        <View className="mt-3 flex-row gap-3">
          <Pressable
            className={`h-12 flex-1 flex-row items-center justify-center rounded-xl ${
              canAccept ? 'bg-worker-primary' : 'bg-worker-primary-soft'
            }`}
            onPress={() => onAccept(request)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled, busy: accepting }}
            accessibilityLabel={t('worker.dashboard.request.accept')}
          >
            {accepting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={canAccept ? colors.onPrimary : colors.muted}
                />
                <Text weight="semibold" className={`ml-1.5 text-sm ${canAccept ? 'text-white' : 'text-worker-muted'}`}>
                  {t('worker.dashboard.request.accept')}
                </Text>
              </>
            )}
          </Pressable>
          <Pressable
            className="h-12 flex-1 flex-row items-center justify-center rounded-xl border-2 border-worker-danger bg-worker-surface"
            onPress={() => onReject(request)}
            disabled={accepting}
            accessibilityRole="button"
            accessibilityLabel={t('worker.dashboard.request.reject')}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
            <Text weight="semibold" className="ml-1.5 text-sm text-worker-danger">
              {t('worker.dashboard.request.reject')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      className={shell}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${customerName}. ${badge.label}`}
    >
      {summary}
      {ongoing ? (
        <View className="mt-3 h-11 flex-row items-center justify-center rounded-xl border-2 border-worker-primary">
          <Text weight="semibold" className="text-sm text-worker-primary">
            {t('worker.bookings.viewDetails')}
          </Text>
        </View>
      ) : null}
      {history ? (
        <View className="mt-2 flex-row items-center justify-end">
          <Text weight="semibold" className="text-sm text-worker-primary">
            {t('worker.bookings.viewSummary')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      ) : null}
    </Pressable>
  );
}
