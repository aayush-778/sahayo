import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Id } from '@sahayo/shared';
import { Avatar, formatPaise, PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { AvailabilityCard } from '../../src/components/AvailabilityCard';
import { DeclineSheet } from '../../src/components/DeclineSheet';
import { JobRequestCard } from '../../src/components/JobRequestCard';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import {
  acceptJob,
  declineJob,
  findSubCategory,
  localizedName,
  setAvailability,
  simulateApproval,
  useActiveJob,
  useJobFeed,
  useLanguage,
  useRatingSummary,
  useTodayOverview,
  useWorkerProfile,
} from '../../src/services';
import type { DeclineReason, JobRequest } from '../../src/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Notice =
  | { kind: 'accepted'; bookingId: Id; name: string }
  | { kind: 'declined' }
  | { kind: 'gone' };

/**
 * Dashboard — the screen a worker lives on.
 *
 * Three states, decided in order:
 *   not approved   the application is with the cooperative; no switch, no feed
 *   offline        the switch, and an explicit offline state where the feed was
 *   online         the switch, and the newest job request up front
 *
 * Offline is never an empty list. "No requests" means there is no work near
 * you; offline means you are not looking — two different messages, and a worker
 * who reads the first when the second is true stops trusting the app.
 */
export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const language = useLanguage();
  const profile = useWorkerProfile();
  const feed = useJobFeed();
  const active = useActiveJob();
  const overview = useTodayOverview();
  const rating = useRatingSummary();

  const [toggling, setToggling] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [acceptingId, setAcceptingId] = useState<Id | null>(null);
  const [declining, setDeclining] = useState<JobRequest | null>(null);
  const [declineBusy, setDeclineBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const firstName = profile.name.trim().split(/\s+/)[0] ?? '';

  async function toggleAvailability() {
    setToggling(true);
    await setAvailability(!profile.isAvailable);
    setToggling(false);
    setNotice(null);
  }

  async function accept(request: JobRequest) {
    setAcceptingId(request.id);
    const result = await acceptJob(request.id);
    setAcceptingId(null);
    setNotice(result.ok ? { kind: 'accepted', bookingId: result.bookingId, name: request.customer.name } : { kind: 'gone' });
  }

  async function decline(reason: DeclineReason) {
    if (!declining) return;
    setDeclineBusy(true);
    const result = await declineJob(declining.id, reason);
    setDeclineBusy(false);
    setDeclining(null);
    setNotice(result.ok ? { kind: 'declined' } : { kind: 'gone' });
  }

  const shown = showAll ? feed : feed.slice(0, 1);
  const activeService = active ? findSubCategory(active.booking.serviceCategoryId) : undefined;

  return (
    <View className="flex-1 bg-worker-ground">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}>
        <View className="w-full max-w-xl self-center px-5">
          {/* Greeting */}
          <View className="flex-row items-center">
            <View className="flex-1 pr-2">
              <Text weight="bold" className="text-xl text-worker-ink">
                {firstName ? t('worker.dashboard.greeting', { name: firstName }) : t('worker.dashboard.title')}
              </Text>
              <Text className="text-sm text-worker-muted">{t('worker.dashboard.subtitle')}</Text>
            </View>
            <LanguageToggle />
            <Pressable
              className="ml-2 h-12 w-12 items-center justify-center"
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
              accessibilityLabel={t('worker.dashboard.openProfile')}
            >
              <Avatar name={profile.name || '—'} />
            </Pressable>
          </View>

          {/* Availability, or why there is none yet */}
          <View className="mt-5">
            {profile.isApproved ? (
              <AvailabilityCard
                isAvailable={profile.isAvailable}
                radiusKm={profile.serviceRadiusKm}
                busy={toggling}
                onToggle={() => void toggleAvailability()}
              />
            ) : (
              <View className="rounded-2xl border-2 border-worker-outline bg-worker-surface p-4">
                <Ionicons name="hourglass-outline" size={26} color={colors.primary} />
                <Text weight="bold" className="mt-2 text-lg text-worker-ink">
                  {t('worker.dashboard.pendingTitle')}
                </Text>
                <Text className="mt-1 text-base text-worker-muted">{t('worker.dashboard.pendingBody')}</Text>
                <PrimaryButton
                  className="mt-4"
                  label={t('worker.dashboard.approveDemo')}
                  onPress={() => void simulateApproval()}
                />
              </View>
            )}
          </View>

          {notice ? (
            <View
              className={`mt-4 flex-row items-center rounded-2xl px-4 py-3 ${
                notice.kind === 'accepted' ? 'bg-worker-success-soft' : 'bg-worker-primary-tint'
              }`}
              accessibilityLiveRegion="polite"
            >
              <Ionicons
                name={notice.kind === 'accepted' ? 'checkmark-circle' : 'information-circle'}
                size={20}
                color={notice.kind === 'accepted' ? colors.success : colors.primary}
              />
              <View className="ml-2 flex-1">
                <Text weight="semibold" className="text-base text-worker-ink">
                  {notice.kind === 'accepted'
                    ? t('worker.dashboard.notice.accepted', { name: notice.name })
                    : notice.kind === 'declined'
                      ? t('worker.dashboard.notice.declined')
                      : t('worker.dashboard.notice.gone')}
                </Text>
                {notice.kind === 'accepted' ? (
                  <Pressable
                    className="min-h-12 flex-row items-center self-start"
                    onPress={() => router.push(`/job/active/${notice.bookingId}`)}
                    accessibilityRole="link"
                    accessibilityLabel={t('worker.dashboard.notice.openJob')}
                  >
                    <Text weight="bold" className="text-base text-worker-primary">
                      {t('worker.dashboard.notice.openJob')}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                className="h-12 w-12 items-center justify-center"
                onPress={() => setNotice(null)}
                accessibilityRole="button"
                accessibilityLabel={t('worker.dashboard.notice.dismiss')}
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          ) : null}

          {profile.isApproved && active ? (
            <Pressable
              className="mt-4 flex-row items-center rounded-2xl border border-worker-outline bg-worker-surface px-4 py-3"
              onPress={() => router.push(`/job/active/${active.booking.id}`)}
              accessibilityRole="link"
              accessibilityLabel={`${t('worker.dashboard.activeJob.title')}: ${active.customer?.name ?? ''}`}
            >
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-worker-primary-tint">
                <Ionicons name="navigate" size={18} color={colors.primary} />
              </View>
              <View className="ml-3 flex-1">
                <Text weight="bold" className="text-base text-worker-ink">
                  {t('worker.dashboard.activeJob.title')}
                </Text>
                <Text className="text-sm text-worker-muted" numberOfLines={1}>
                  {[active.customer?.name, activeService ? localizedName(activeService, language) : undefined]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ) : null}

          {/* Job requests */}
          {profile.isApproved ? (
            profile.isAvailable ? (
              <View className="mt-6">
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <View className="flex-row items-center">
                    <Ionicons name="notifications" size={18} color={colors.primary} />
                    <Text weight="bold" className="ml-2 text-lg text-worker-ink" accessibilityRole="header">
                      {t('worker.dashboard.requests.title')}
                    </Text>
                  </View>
                  {feed.length > 1 ? (
                    <Pressable
                      className="min-h-12 justify-center"
                      onPress={() => setShowAll((all) => !all)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showAll }}
                    >
                      <Text weight="bold" className="text-base text-worker-primary">
                        {showAll
                          ? t('worker.dashboard.requests.showLess')
                          : t('worker.dashboard.requests.viewAll', { n: feed.length })}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {feed.length === 0 ? (
                  <View className="mt-3 items-center rounded-2xl border border-worker-border bg-worker-surface px-5 py-8">
                    <Ionicons name="radio-outline" size={30} color={colors.primary} />
                    <Text className="mt-2 text-center text-base text-worker-ink">{t('worker.dashboard.requests.empty')}</Text>
                  </View>
                ) : (
                  <View className="mt-3 gap-4">
                    {shown.map((request) => (
                      <JobRequestCard
                        key={request.id}
                        request={request}
                        accepting={acceptingId === request.id}
                        onAccept={() => void accept(request)}
                        onReject={() => setDeclining(request)}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View className="mt-6 items-center rounded-2xl border-2 border-dashed border-worker-outline bg-worker-surface px-5 py-8">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-worker-primary-tint">
                  <Ionicons name="cloud-offline-outline" size={28} color={colors.primary} />
                </View>
                <Text weight="bold" className="mt-3 text-center text-lg text-worker-ink">
                  {t('worker.dashboard.offlineState.title')}
                </Text>
                <Text className="mt-1 text-center text-base text-worker-muted">{t('worker.dashboard.offlineState.body')}</Text>
                <PrimaryButton
                  className="mt-4 self-stretch"
                  label={t('worker.dashboard.offlineState.action')}
                  loading={toggling}
                  onPress={() => void toggleAvailability()}
                />
              </View>
            )
          ) : null}

          {/* Today's Overview */}
          {profile.isApproved ? (
            <View className="mt-7">
              <Text weight="bold" className="text-lg text-worker-ink" accessibilityRole="header">
                {t('worker.dashboard.overview.title')}
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-3">
                <StatTile
                  icon="briefcase-outline"
                  value={String(overview.jobsToday)}
                  label={t('worker.dashboard.overview.jobsToday')}
                  href="/bookings"
                />
                <StatTile
                  icon="wallet-outline"
                  value={formatPaise(overview.earningsToday, language)}
                  label={t('worker.dashboard.overview.earningsToday')}
                  href="/earnings"
                />
                <StatTile
                  icon="checkmark-done-outline"
                  value={String(overview.totalCompleted)}
                  label={t('worker.dashboard.overview.totalCompleted')}
                  href="/bookings"
                />
                <StatTile
                  icon="star"
                  value={rating.count ? rating.average.toFixed(1) : '—'}
                  label={t('worker.dashboard.overview.rating')}
                  href="/profile/ratings"
                />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <DeclineSheet
        visible={declining !== null}
        busy={declineBusy}
        onClose={() => setDeclining(null)}
        onConfirm={(reason) => void decline(reason)}
      />
    </View>
  );
}

/** One Today's Overview figure. Each opens the screen its number comes from. */
function StatTile({ icon, value, label, href }: { icon: IoniconName; value: string; label: string; href: Href }) {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <Pressable
      className="min-h-32 min-w-[140px] flex-1 basis-[45%] rounded-2xl border border-worker-border bg-worker-surface p-4"
      onPress={() => router.push(href)}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-worker-primary-tint">
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text weight="bold" className="mt-2 text-2xl text-worker-ink" numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-sm text-worker-muted">{label}</Text>
    </Pressable>
  );
}
