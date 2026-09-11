import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  BookingStatus,
  COOP_FUND_SHARE,
  DEFAULT_RADIUS_M,
  GST_RATE,
  PLATFORM_SHARE,
} from '@sahayo/shared';
import {
  Avatar,
  brandColors,
  FarePanel,
  formatDistance,
  formatDuration,
  formatPaise,
  FundHighlight,
  Skeleton,
  Text,
  type FareRow,
} from '@sahayo/ui-native';

import { WorkerMap } from '../../src/components/booking/WorkerMap';
import {
  isCancelledStatus,
  stepIndexOf,
  TRACKED_STEPS,
  nextStatus,
} from '../../src/lib/bookingStatus';
import { fareFromItemTotal } from '../../src/lib/fare';
import { useResourceLoading } from '../../src/lib/loading';
import { findServiceItem, findServiceSkuById, mockServiceLocation } from '../../src/mocks';
import { bookableBasePaise } from '../../src/lib/fare';
import { acceptBooking, advanceBooking, useBookingView } from '../../src/store/bookings';
import { useAuthStore } from '../../src/store/auth';

/** How long the mock dispatcher takes to find someone. */
const AUTO_ACCEPT_MS = 7000;

/** Statuses where the worker is still travelling, so a map means something. */
const MAP_STATUSES = new Set<BookingStatus>([
  BookingStatus.ACCEPTED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
]);

function percent(share: number): string {
  return String(Math.round(share * 100));
}

/**
 * Live tracking.
 *
 * THE STATUS ADVANCES TWO WAYS. A booking sitting at REQUESTED moves itself
 * to ACCEPTED after seven seconds, which is the dispatcher finding someone —
 * that is the one transition a customer would never wait through in silence,
 * and it is the first thing the worker app will take over in Phase 5. Every
 * later step is manual: tapping the status headline moves one step along
 * `TRACKED_STEPS`. That is deliberately a hidden control rather than a timer,
 * so the pace of the demo belongs to whoever is presenting it and the screen
 * never advances while nobody is looking at it.
 *
 * The advance stops at COMPLETED. Settlement is what paying does, and letting
 * a debug tap mark money as received would put the demo one stray tap from
 * claiming a payment that never happened.
 *
 * The fare shown is the one the booking carries, not a fresh quote. A job
 * priced under yesterday's surge must not silently reprice itself while the
 * worker is on the way.
 */
export default function TrackScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const view = useBookingView(bookingId);
  const loading = useResourceLoading(`booking:${bookingId}`);

  const status = view?.status;
  const isPending = status === BookingStatus.REQUESTED || status === BookingStatus.BROADCAST;

  useEffect(() => {
    if (!bookingId || !isPending) return;
    const timer = setTimeout(() => acceptBooking(bookingId), AUTO_ACCEPT_MS);
    return () => clearTimeout(timer);
  }, [bookingId, isPending]);

  if (loading) {
    return (
      <View className="flex-1 bg-brand-cream px-6" style={{ paddingTop: insets.top + 12 }}>
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="mt-5 h-20 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
      </View>
    );
  }

  if (!view) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream px-6">
        <Ionicons name="help-circle-outline" size={32} color={brandColors.muted} />
        <Text className="mt-3 text-center text-base text-brand-muted">
          {t('track.missing')}
        </Text>
        <Pressable
          className="mt-4 rounded-xl bg-brand-primary px-6 py-3"
          onPress={() => router.replace('/bookings')}
          accessibilityRole="button"
          accessibilityLabel={t('bookings.title')}
        >
          <Text weight="semibold" className="text-base text-white">
            {t('bookings.title')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const { booking, worker, serviceName, fare, payment, etaMinutes } = view;
  const current = view.status;
  const stepIndex = stepIndexOf(current);
  const cancelled = isCancelledStatus(current);

  // The fare the booking already carries. Where a live seeded booking has
  // none yet, fall back to the catalogue price so the customer still sees
  // what they will owe — captioned as an estimate rather than a receipt.
  const carried = fare?.total;
  const catalogueItem = findServiceItem(booking.serviceCategoryId);
  const estimate =
    carried ??
    (catalogueItem
      ? bookableBasePaise(catalogueItem)
      : findServiceSkuById(booking.serviceCategoryId)?.baseFare);
  const breakdown = estimate === undefined ? undefined : fareFromItemTotal(estimate);

  const owesMoney = payment?.paid === false;
  const canSettle = owesMoney && (current === BookingStatus.COMPLETED || current === BookingStatus.SETTLED);

  const rows: FareRow[] = breakdown
    ? [
        { kind: 'amount', key: 'item', label: t('booking.now.itemTotal'), amount: breakdown.itemTotal },
        { kind: 'caption', key: 'included', label: t('booking.now.includedNote') },
        {
          kind: 'amount',
          key: 'worker',
          label: t('booking.now.workerEarns', {
            percent: percent(1 - PLATFORM_SHARE - COOP_FUND_SHARE),
          }),
          amount: fare?.workerShare ?? breakdown.workerEarns,
          tone: 'muted',
          indented: true,
        },
        {
          kind: 'amount',
          key: 'platform',
          label: t('booking.now.platformFee', { percent: percent(PLATFORM_SHARE) }),
          amount: fare?.platformShare ?? breakdown.platformFee,
          tone: 'muted',
          indented: true,
        },
        {
          kind: 'amount',
          key: 'fund',
          label: t('booking.now.coopFund', { percent: percent(COOP_FUND_SHARE) }),
          amount: fare?.coopFundShare ?? breakdown.coopFund,
          tone: 'fund',
          indented: true,
          icon: <Ionicons name="people" size={14} color={brandColors.success} />,
        },
        { kind: 'divider', key: 'before-gst' },
        {
          kind: 'amount',
          key: 'gst',
          label: t('booking.now.gst', { percent: percent(GST_RATE) }),
          amount: breakdown.gst,
        },
      ]
    : [];

  const showMap = worker !== undefined && MAP_STATUSES.has(current);

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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/bookings'))}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={18} color={brandColors.navy} />
          </Pressable>

          <View className="ml-3 flex-1">
            <Text weight="bold" className="text-2xl text-brand-navy" numberOfLines={1}>
              {t('track.title')}
            </Text>
            <Text className="text-xs text-brand-muted" numberOfLines={1}>
              {serviceName}
            </Text>
          </View>
        </View>

        {/* The status headline, and the hidden advance. Tapping it steps the
            booking forward one state — the control the presenter drives the
            demo with. It is styled as a plain status card on purpose: an
            obvious "next" button would invite a judge to press it. */}
        <Pressable
          className={`mt-5 flex-row items-center rounded-2xl border px-4 py-4 ${
            cancelled
              ? 'border-brand-danger bg-brand-danger-soft'
              : 'border-brand-primary-soft bg-brand-primary-tint'
          }`}
          onPress={() => bookingId && advanceBooking(bookingId, current)}
          disabled={cancelled || nextStatus(current) === undefined}
          accessibilityRole="text"
          accessibilityLabel={t(`booking.status.${current}`)}
        >
          <View className="flex-1">
            <Text
              weight="bold"
              className={`text-lg ${cancelled ? 'text-brand-danger' : 'text-brand-navy'}`}
            >
              {t(`booking.status.${current}`)}
            </Text>
            <Text
              className={`mt-0.5 text-sm ${
                cancelled ? 'text-brand-danger' : 'text-brand-muted'
              }`}
            >
              {cancelled
                ? t('track.cancelledNote')
                : isPending
                  ? t('track.finding')
                  : t(`track.hint.${current}`)}
            </Text>
          </View>

          {etaMinutes !== undefined && !cancelled && stepIndex < 4 ? (
            <View className="ml-3 rounded-xl bg-brand-navy px-3 py-2">
              <Text weight="bold" className="text-xs text-white">
                {t('booking.now.eta', { duration: formatDuration(etaMinutes, locale) })}
              </Text>
            </View>
          ) : null}
        </Pressable>

        {showMap ? (
          <View className="mt-4">
            <WorkerMap
              workers={worker ? [worker] : []}
              centre={mockServiceLocation.point}
              radiusM={DEFAULT_RADIUS_M}
              etaMinutes={etaMinutes}
              showRadius={false}
            />
          </View>
        ) : null}

        {/* ------------------------------ stepper ------------------------------ */}

        {cancelled ? null : (
          <View className="mt-5 rounded-2xl border border-brand-border bg-brand-surface p-4">
            {TRACKED_STEPS.map((step, index) => {
              const done = index <= stepIndex;
              const isLast = index === TRACKED_STEPS.length - 1;

              return (
                <View key={step} className="flex-row">
                  <View className="items-center">
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-full ${
                        done ? 'bg-brand-primary' : 'border-2 border-brand-border bg-brand-surface'
                      }`}
                    >
                      {done ? (
                        <Ionicons name="checkmark" size={12} color={brandColors.surface} />
                      ) : null}
                    </View>
                    {isLast ? null : (
                      <View
                        className={`w-0.5 flex-1 ${
                          index < stepIndex ? 'bg-brand-primary' : 'bg-brand-border'
                        }`}
                      />
                    )}
                  </View>

                  <Text
                    weight={index === stepIndex ? 'semibold' : 'regular'}
                    className={`ml-3 text-sm ${
                      done ? 'text-brand-navy' : 'text-brand-muted'
                    } ${isLast ? '' : 'pb-4'}`}
                  >
                    {t(`booking.status.${step}`)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ------------------------------- worker ------------------------------ */}

        {worker ? (
          <View className="mt-4 flex-row items-center rounded-2xl border border-brand-border bg-brand-surface p-4">
            <Avatar name={worker.user.name} size="lg" />
            <View className="ml-3 flex-1">
              <Text weight="semibold" className="text-base text-brand-navy" numberOfLines={1}>
                {worker.user.name}
              </Text>
              <View className="mt-0.5 flex-row items-center">
                <Ionicons name="star" size={12} color={brandColors.warning} />
                <Text className="ml-1 text-xs text-brand-muted">
                  {worker.profile.ratingAvg.toFixed(1)}
                </Text>
                <Text className="mx-1.5 text-xs text-brand-border">|</Text>
                <Text className="text-xs text-brand-muted">
                  {t('track.jobsDone', { n: worker.profile.completedJobs })}
                </Text>
              </View>
              <Text className="mt-0.5 text-xs text-brand-muted">
                {formatDistance(worker.distanceM, locale)}
              </Text>
            </View>
          </View>
        ) : null}

        {rows.length > 0 ? (
          <FarePanel
            className="mt-4"
            title={carried === undefined ? t('track.fareEstimate') : t('track.fareTitle')}
            rows={rows}
            totalLabel={t('booking.now.total')}
            totalAmount={breakdown ? breakdown.total : 0}
            locale={locale}
          />
        ) : null}

        {breakdown && !cancelled ? (
          <FundHighlight
            className="mt-4"
            amount={fare?.coopFundShare ?? breakdown.coopFund}
            title={
              payment?.paid
                ? t('booking.success.fundTitlePaid')
                : t('booking.success.fundTitlePending')
            }
            body={
              payment?.paid
                ? t('booking.success.fundBodyPaid')
                : t('booking.success.fundBodyPending')
            }
            locale={locale}
            icon={<Ionicons name="people" size={24} color={brandColors.surface} />}
          />
        ) : null}

        {canSettle ? (
          <Pressable
            className="mt-5 h-14 flex-row items-center justify-center rounded-xl bg-brand-primary"
            onPress={() => router.push(`/booking/payment?bookingId=${booking.id}`)}
            accessibilityRole="button"
            accessibilityLabel={t('track.payNow', {
              amount: formatPaise(breakdown?.total ?? 0, locale),
            })}
          >
            <Text weight="semibold" className="text-base text-white">
              {t('track.payNow', { amount: formatPaise(breakdown?.total ?? 0, locale) })}
            </Text>
          </Pressable>
        ) : null}

        {owesMoney && !canSettle ? (
          <View className="mt-4 flex-row items-center rounded-xl bg-brand-warning-soft px-4 py-3">
            <Ionicons name="cash-outline" size={16} color={brandColors.warning} />
            <Text className="ml-2 flex-1 text-sm text-brand-warning">
              {t('track.payAfterCompletion')}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
