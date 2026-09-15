import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Id } from '@sahayo/shared';
import { PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { BookingListCard } from '../../src/components/BookingListCard';
import { DeclineSheet } from '../../src/components/DeclineSheet';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { SegmentedTabs } from '../../src/components/SegmentedTabs';
import {
  acceptJob,
  BOOKING_TABS,
  declineJob,
  setAvailability,
  useBookingBoard,
  useWorkerProfile,
} from '../../src/services';
import type { BookingTab, DeclineReason, JobRequest } from '../../src/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const EMPTY_ICON: Record<BookingTab, IoniconName> = {
  all: 'calendar-outline',
  pending: 'notifications-outline',
  ongoing: 'bicycle-outline',
  completed: 'checkmark-done-outline',
  cancelled: 'close-circle-outline',
};

/**
 * My Bookings — every job, filtered by where it stands.
 *
 * Five tabs with live counts. Pending holds offers still waiting for an answer,
 * each with Accept and Reject; Ongoing holds accepted work; Completed and
 * Cancelled are history. Rejected offers sit under Cancelled with the reason
 * given, so the list tells the whole story of the day.
 *
 * Every tab has its own empty state, because each empty tab means something
 * different: no offers while offline is not the same as no offers near you,
 * and neither is the same as never having finished a job.
 *
 * Accepting from here opens the job straight away — someone working through a
 * list is ready to go.
 */
export default function BookingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const profile = useWorkerProfile();
  const board = useBookingBoard(profile.isApproved);

  const [tab, setTab] = useState<BookingTab>('all');
  const [acceptingId, setAcceptingId] = useState<Id | null>(null);
  const [declining, setDeclining] = useState<JobRequest | null>(null);
  const [declineBusy, setDeclineBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const items = board[tab];
  const offersHidden = profile.isApproved && !profile.isAvailable;

  async function accept(request: JobRequest) {
    setNotice(null);
    setAcceptingId(request.id);
    const result = await acceptJob(request.id);
    setAcceptingId(null);
    if (result.ok) router.push(`/job/active/${result.bookingId}`);
    else setNotice(t(`worker.job.errors.${result.reason}`));
  }

  async function decline(reason: DeclineReason) {
    if (!declining) return;
    setDeclineBusy(true);
    const result = await declineJob(declining.id, reason);
    setDeclineBusy(false);
    setDeclining(null);
    setNotice(result.ok ? t('worker.dashboard.notice.declined') : t('worker.dashboard.notice.gone'));
  }

  async function goOnline() {
    setToggling(true);
    await setAvailability(true);
    setToggling(false);
  }

  return (
    <View className="flex-1 bg-worker-ground">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: 24 }}>
        <View className="w-full max-w-xl flex-1 self-center px-5">
          <View className="flex-row items-center">
            <Text weight="bold" className="flex-1 text-2xl text-worker-ink" accessibilityRole="header">
              {t('worker.bookings.title')}
            </Text>
            <LanguageToggle />
          </View>

          <View className="mt-3">
            <SegmentedTabs
              tabs={BOOKING_TABS.map((key) => ({
                key,
                label: t(`worker.bookings.tabs.${key}`),
                count: board[key].length,
              }))}
              selected={tab}
              onSelect={setTab}
            />
          </View>

          {offersHidden && board.pending.length > 0 && (tab === 'all' || tab === 'pending') ? (
            <View className="mt-3 flex-row flex-wrap items-center gap-2 rounded-xl bg-worker-warning-soft px-3 py-2">
              <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
              <Text className="flex-1 text-sm text-worker-ink">{t('worker.bookings.offline')}</Text>
              <Pressable
                className="min-h-12 justify-center"
                onPress={() => void goOnline()}
                disabled={toggling}
                accessibilityRole="button"
                accessibilityLabel={t('worker.bookings.goOnline')}
              >
                <Text weight="bold" className="text-sm text-worker-primary">
                  {t('worker.bookings.goOnline')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {notice ? (
            <View
              className="mt-3 flex-row items-center rounded-xl bg-worker-primary-tint pl-3"
              accessibilityLiveRegion="polite"
            >
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text className="ml-2 flex-1 text-sm text-worker-ink">{notice}</Text>
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

          {items.length > 0 ? (
            <View className="mt-3 gap-3">
              {items.map((item) => (
                <BookingListCard
                  key={item.key}
                  item={item}
                  canAccept={profile.isAvailable}
                  accepting={item.kind === 'request' && acceptingId === item.request.id}
                  onAccept={(request) => void accept(request)}
                  onReject={setDeclining}
                />
              ))}
            </View>
          ) : (
            <EmptyTab
              tab={tab}
              icon={EMPTY_ICON[tab]}
              approved={profile.isApproved}
              online={profile.isAvailable}
              busy={toggling}
              onGoOnline={() => void goOnline()}
              onShowPending={() => setTab('pending')}
              onGoHome={() => router.push('/')}
            />
          )}
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

function EmptyTab({
  tab,
  icon,
  approved,
  online,
  busy,
  onGoOnline,
  onShowPending,
  onGoHome,
}: {
  tab: BookingTab;
  icon: IoniconName;
  approved: boolean;
  online: boolean;
  busy: boolean;
  onGoOnline: () => void;
  onShowPending: () => void;
  onGoHome: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  let title = t(`worker.bookings.empty.${tab}.title`);
  let body = t(`worker.bookings.empty.${tab}.body`);
  let action: { label: string; onPress: () => void } | undefined;

  if (tab === 'pending' && !approved) {
    title = t('worker.bookings.empty.pending.unapprovedTitle');
    body = t('worker.bookings.empty.pending.unapprovedBody');
  } else if (tab === 'pending' && !online) {
    title = t('worker.bookings.empty.pending.offlineTitle');
    body = t('worker.bookings.empty.pending.offlineBody');
    action = { label: t('worker.bookings.goOnline'), onPress: onGoOnline };
  } else if (tab === 'all') {
    action = { label: t('worker.bookings.empty.all.action'), onPress: onGoHome };
  } else if (tab === 'ongoing' && approved) {
    action = { label: t('worker.bookings.empty.ongoing.action'), onPress: onShowPending };
  }

  return (
    <View className="flex-1 items-center justify-center px-4 py-10">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-worker-primary-tint">
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text weight="semibold" className="mt-3 text-center text-lg text-worker-ink">
        {title}
      </Text>
      <Text className="mt-1 text-center text-sm text-worker-muted">{body}</Text>
      {action ? (
        <PrimaryButton className="mt-5 self-stretch" label={action.label} loading={busy} onPress={action.onPress} />
      ) : null}
    </View>
  );
}
