import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, formatDistance, formatPaise, PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { findSubCategory, getOfferDeadline, localizedName, useLanguage } from '../services';
import type { JobRequest } from '../types';
import { OfferCountdown } from './OfferCountdown';

/**
 * A job offer on the dashboard — half of the demo's key moment.
 *
 * Distance and fare are set in display type on their own tiles, because a
 * judge watches this card from two metres away on a projector and a worker
 * reads it at arm's length. Everything else is secondary and smaller.
 *
 * Accept and Reject act from the card. Reject still asks why (the parent opens
 * the reason sheet), so a worker never has to open the job to turn it down.
 * The fare shown is what the customer pays; what the worker keeps is right
 * under it, and the full split is one tap away in Work details.
 */
export function JobRequestCard({
  request,
  accepting,
  onAccept,
  onReject,
}: {
  request: JobRequest;
  accepting: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const language = useLanguage();

  const service = findSubCategory(request.booking.serviceCategoryId);
  const fare = request.booking.fare;
  const address = request.booking.address;
  const locality = address.line2 ?? address.line1;

  return (
    <View className="rounded-2xl border-2 border-worker-primary bg-worker-surface p-4">
      <OfferCountdown deadline={getOfferDeadline(request.id)} />

      <View className="mt-4 flex-row items-center">
        <Avatar name={request.customer.name} />
        <View className="ml-3 flex-1">
          <Text weight="bold" className="text-lg text-worker-ink" numberOfLines={1}>
            {request.customer.name}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="location-outline" size={16} color={colors.muted} />
            <Text className="ml-1 flex-1 text-sm text-worker-muted" numberOfLines={1}>
              {`${locality}, ${address.city}`}
            </Text>
          </View>
        </View>
      </View>

      <Text weight="semibold" className="mt-3 text-base text-worker-primary">
        {service ? localizedName(service, language) : request.booking.serviceCategoryId}
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-3">
        <View className="min-w-[130px] flex-1 rounded-2xl bg-worker-primary-tint px-3 py-3">
          <Text className="text-sm text-worker-muted">{t('worker.dashboard.request.distance')}</Text>
          <Text weight="bold" className="text-2xl text-worker-ink">
            {formatDistance(request.distanceM, language)}
          </Text>
        </View>
        <View className="min-w-[130px] flex-1 rounded-2xl bg-worker-primary-tint px-3 py-3">
          <Text className="text-sm text-worker-muted">{t('worker.dashboard.request.fare')}</Text>
          <Text weight="bold" className="text-2xl text-worker-ink">
            {formatPaise(fare?.total ?? 0, language)}
          </Text>
          {fare ? (
            <Text weight="semibold" className="text-sm text-worker-success">
              {t('worker.dashboard.request.youGet', { amount: formatPaise(fare.workerShare, language) })}
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable
        className="mt-2 min-h-12 flex-row items-center self-start"
        onPress={() => router.push(`/job/${request.id}`)}
        accessibilityRole="link"
        accessibilityLabel={t('worker.dashboard.request.workDetails')}
      >
        <Text weight="bold" className="text-base text-worker-primary">
          {t('worker.dashboard.request.workDetails')}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
      </Pressable>

      <View className="mt-2 flex-row gap-3">
        <PrimaryButton
          className="flex-1"
          label={t('worker.dashboard.request.accept')}
          loading={accepting}
          onPress={onAccept}
        />
        <Pressable
          className="h-14 flex-1 flex-row items-center justify-center rounded-xl border-2 border-worker-danger bg-worker-surface"
          onPress={onReject}
          disabled={accepting}
          accessibilityRole="button"
          accessibilityState={{ disabled: accepting }}
          accessibilityLabel={t('worker.dashboard.request.reject')}
        >
          <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
          <Text weight="semibold" className="ml-1.5 text-base text-worker-danger">
            {t('worker.dashboard.request.reject')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
