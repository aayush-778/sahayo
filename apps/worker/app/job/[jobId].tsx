import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COOP_FUND_SHARE, PLATFORM_SHARE } from '@sahayo/shared';
import {
  Avatar,
  FarePanel,
  formatDistance,
  formatDuration,
  formatPaise,
  PrimaryButton,
  Text,
  useThemeColors,
} from '@sahayo/ui-native';

import { DeclineSheet } from '../../src/components/DeclineSheet';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { OfferCountdown } from '../../src/components/OfferCountdown';
import {
  acceptJob,
  callPhone,
  clockParts,
  declineJob,
  findSubCategory,
  getOfferDeadline,
  localizedName,
  openInMaps,
  openThreadForBooking,
  setAvailability,
  useJobRequest,
  useLanguage,
  useWorkerProfile,
  workerTypeOf,
} from '../../src/services';
import type { DeclineReason } from '../../src/types';

const percent = (share: number) => Math.round(share * 100);

/**
 * A new job request, in full — the other half of the demo's key moment.
 *
 * NET PAYOUT IS THE LARGEST NUMBER ON THE SCREEN. A worker deciding whether to
 * take a job cares what lands in their pocket, so that figure leads, and the
 * full split under it — gross fare, platform fee, cooperative fund — shows how
 * it was reached. Every other gig app hides this; showing it is the claim the
 * platform is built on.
 *
 * Only the locality is shown before accepting, not the house number: a worker
 * who has not taken the job has no need for a customer's exact address.
 *
 * Call opens the phone's dialler, View on Map opens Maps, and Chat opens this
 * booking's conversation — so a worker can ask a question before deciding.
 */
export default function JobRequestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const language = useLanguage();
  const profile = useWorkerProfile();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const request = useJobRequest(jobId);

  const [declineOpen, setDeclineOpen] = useState(false);
  const [busy, setBusy] = useState<'accept' | 'decline' | 'online' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leave = () => (router.canGoBack() ? router.back() : router.dismissTo('/'));

  const header = (
    <View className="flex-row items-center border-b border-worker-border bg-worker-surface px-3 pb-2" style={{ paddingTop: insets.top + 8 }}>
      <Pressable
        className="h-12 w-12 items-center justify-center rounded-full"
        onPress={leave}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
      </Pressable>
      <Text weight="bold" className="flex-1 px-1 text-center text-lg text-worker-ink" numberOfLines={1} accessibilityRole="header">
        {t('worker.job.title')}
      </Text>
      <LanguageToggle />
    </View>
  );

  if (!request) {
    return (
      <View className="flex-1 bg-worker-ground">
        {header}
        <View className="w-full max-w-xl flex-1 items-center justify-center self-center px-6">
          <Ionicons name="file-tray-outline" size={40} color={colors.muted} />
          <Text weight="bold" className="mt-3 text-center text-lg text-worker-ink">
            {t('worker.job.notFound.title')}
          </Text>
          <Text className="mt-1 text-center text-base text-worker-muted">{t('worker.job.notFound.body')}</Text>
          <PrimaryButton className="mt-6 self-stretch" label={t('worker.common.goHome')} onPress={() => router.dismissTo('/')} />
        </View>
      </View>
    );
  }

  const { booking, customer } = request;
  const fare = booking.fare;
  const service = findSubCategory(booking.serviceCategoryId);
  const trade = workerTypeOf(booking.serviceCategoryId);
  const locality = booking.address.line2 ?? booking.address.line1;
  const point = booking.address.point;

  const clock = (iso: string) => {
    const at = new Date(iso);
    const parts = clockParts(`${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`);
    return t('worker.onboarding.availability.clock', {
      hour: parts.hour,
      minute: parts.minute,
      period: t(`worker.onboarding.availability.periods.${parts.period}`),
    });
  };

  const schedule = (() => {
    if (!booking.scheduledFor) return t('worker.job.service.asap');
    const at = new Date(booking.scheduledFor);
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const time = clock(booking.scheduledFor);
    if (sameDay(at, today)) return t('worker.job.service.scheduledToday', { time });
    if (sameDay(at, tomorrow)) return t('worker.job.service.scheduledTomorrow', { time });
    return t('worker.job.service.scheduledOn', {
      date: `${at.getDate()} ${t(`booking.schedule.months.${at.getMonth()}`)}`,
      time,
    });
  })();

  async function open(action: () => Promise<boolean>) {
    setError(null);
    if (!(await action())) setError(t('worker.job.customer.openFailed'));
  }

  async function accept() {
    if (!request) return;
    setError(null);
    setBusy('accept');
    const result = await acceptJob(request.id);
    setBusy(null);
    if (result.ok) router.replace(`/job/active/${result.bookingId}`);
    else setError(t(`worker.job.errors.${result.reason}`));
  }

  async function decline(reason: DeclineReason) {
    if (!request) return;
    setBusy('decline');
    await declineJob(request.id, reason);
    setBusy(null);
    setDeclineOpen(false);
    leave();
  }

  async function goOnline() {
    setBusy('online');
    await setAvailability(true);
    setBusy(null);
    setError(null);
  }

  return (
    <View className="flex-1 bg-worker-ground">
      {header}

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <View className="w-full max-w-xl gap-4 self-center px-5">
          <OfferCountdown deadline={getOfferDeadline(request.id)} />

          {/* Customer info */}
          <Card title={t('worker.job.customer.title')}>
            <View className="flex-row items-center">
              <Avatar name={customer.name} size="lg" />
              <View className="ml-3 flex-1">
                <Text weight="bold" className="text-lg text-worker-ink">
                  {customer.name}
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={14} color={colors.muted} />
                  <Text className="ml-1 flex-1 text-base text-worker-muted">{`${locality}, ${booking.address.city}`}</Text>
                </View>
              </View>
              <Pressable
                className="mr-2 h-12 w-12 items-center justify-center rounded-full bg-worker-primary-tint"
                onPress={() => {
                  const threadId = openThreadForBooking(booking.id);
                  if (threadId) router.push(`/chat/${threadId}`);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('worker.chat.thread.open', { name: customer.name })}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                className="h-12 w-12 items-center justify-center rounded-full bg-worker-primary-tint"
                onPress={() => void open(() => callPhone(customer.phone))}
                accessibilityRole="button"
                accessibilityLabel={t('worker.job.customer.call', { name: customer.name })}
              >
                <Ionicons name="call" size={20} color={colors.primary} />
              </Pressable>
            </View>

            <Text weight="bold" className="mt-3 text-xl text-worker-ink">
              {t('worker.job.customer.away', { distance: formatDistance(request.distanceM, language) })}
            </Text>
            {point ? (
              <Pressable
                className="min-h-12 flex-row items-center self-start"
                onPress={() => void open(() => openInMaps(point))}
                accessibilityRole="link"
                accessibilityLabel={t('worker.job.customer.viewOnMap')}
              >
                <Ionicons name="map-outline" size={18} color={colors.primary} />
                <Text weight="bold" className="ml-2 text-base text-worker-primary">
                  {t('worker.job.customer.viewOnMap')}
                </Text>
              </Pressable>
            ) : null}
            <Text className="text-sm text-worker-muted">{t('worker.job.customer.addressLater')}</Text>
          </Card>

          {/* Service details */}
          <Card title={t('worker.job.service.title')}>
            <Text weight="bold" className="text-lg text-worker-ink">
              {service ? localizedName(service, language) : booking.serviceCategoryId}
            </Text>
            {trade ? <Text className="text-base text-worker-muted">{localizedName(trade, language)}</Text> : null}

            <View className="mt-3 flex-row items-center">
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text weight="semibold" className="ml-2 flex-1 text-base text-worker-ink">
                {schedule}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center">
              <Ionicons name="hourglass-outline" size={18} color={colors.primary} />
              <Text className="ml-2 flex-1 text-base text-worker-ink">
                {t('worker.job.service.duration', { duration: formatDuration(request.estimatedMinutes, language) })}
              </Text>
            </View>

            <Text weight="semibold" className="mt-4 text-base text-worker-ink">
              {t('worker.job.service.notes')}
            </Text>
            <View className="mt-2 rounded-xl bg-worker-ground px-4 py-3">
              <Text className={`text-base ${booking.notes ? 'text-worker-ink' : 'text-worker-muted'}`}>
                {booking.notes ?? t('worker.job.service.noNotes')}
              </Text>
            </View>
          </Card>

          {/* Pricing & payment */}
          {fare ? (
            <>
              <Card title={t('worker.job.pay.title')}>
                <Text className="text-base text-worker-muted">{t('worker.job.pay.netLabel')}</Text>
                <Text weight="bold" className="text-4xl text-worker-success" accessibilityRole="summary">
                  {formatPaise(fare.workerShare, language)}
                </Text>
                <Text className="mt-1 text-sm text-worker-muted">{t('worker.job.pay.netNote')}</Text>
              </Card>

              <FarePanel
                title={t('worker.job.pay.breakdown')}
                locale={language}
                rows={[
                  { kind: 'amount', key: 'gross', label: t('worker.job.pay.gross'), amount: fare.total },
                  { kind: 'caption', key: 'deducted', label: t('worker.job.pay.deducted') },
                  {
                    kind: 'amount',
                    key: 'platform',
                    label: t('worker.job.pay.platformFee', { pct: percent(PLATFORM_SHARE) }),
                    amount: fare.platformShare,
                    tone: 'muted',
                    indented: true,
                  },
                  {
                    kind: 'amount',
                    key: 'fund',
                    label: t('worker.job.pay.coopFund', { pct: percent(COOP_FUND_SHARE) }),
                    amount: fare.coopFundShare,
                    tone: 'fund',
                    indented: true,
                    icon: <Ionicons name="people" size={14} color={colors.success} />,
                  },
                ]}
                totalLabel={t('worker.job.pay.netLabel')}
                totalAmount={fare.workerShare}
              />

              <Pressable
                className="-mt-1 min-h-12 flex-row items-center self-start"
                onPress={() => router.push('/coop')}
                accessibilityRole="link"
                accessibilityLabel={t('worker.job.pay.fundLink')}
              >
                <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                <Text weight="semibold" className="ml-2 text-base text-worker-primary">
                  {t('worker.job.pay.fundLink')}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Pinned actions */}
      <View className="border-t border-worker-border bg-worker-surface" style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="w-full max-w-xl self-center px-5 pt-3">
          {!profile.isAvailable ? (
            <View className="mb-3 flex-row flex-wrap items-center gap-2 rounded-xl bg-worker-warning-soft px-4 py-2">
              <Text className="flex-1 text-sm text-worker-ink">{t('worker.job.offline.body')}</Text>
              <Pressable
                className="min-h-12 justify-center"
                onPress={() => void goOnline()}
                disabled={busy !== null}
                accessibilityRole="button"
                accessibilityLabel={t('worker.dashboard.offlineState.action')}
              >
                <Text weight="bold" className="text-base text-worker-primary">
                  {t('worker.dashboard.offlineState.action')}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {error ? (
            <Text className="mb-2 text-sm text-worker-danger" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <View className="flex-row gap-3">
            <PrimaryButton
              className="flex-1"
              label={t('worker.dashboard.request.accept')}
              loading={busy === 'accept'}
              disabled={!profile.isAvailable || busy !== null}
              onPress={() => void accept()}
            />
            <Pressable
              className="h-14 flex-1 flex-row items-center justify-center rounded-xl border-2 border-worker-danger bg-worker-surface"
              onPress={() => setDeclineOpen(true)}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel={t('worker.dashboard.request.reject')}
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
              <Text weight="semibold" className="ml-1.5 text-base text-worker-danger">
                {t('worker.dashboard.request.reject')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <DeclineSheet
        visible={declineOpen}
        busy={busy === 'decline'}
        onClose={() => setDeclineOpen(false)}
        onConfirm={(reason) => void decline(reason)}
      />
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
      <Text weight="bold" className="mb-3 text-lg text-worker-ink" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}
