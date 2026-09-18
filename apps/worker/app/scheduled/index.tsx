import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { ConflictSheet } from '../../src/components/ConflictSheet';
import { DeclineSheet } from '../../src/components/DeclineSheet';
import { ScheduledRequestCard } from '../../src/components/ScheduledRequestCard';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { acceptScheduled, declineScheduled, useScheduledDays, type ScheduledRequestView } from '../../src/services';
import type { DeclineReason } from '../../src/types';

/**
 * Scheduled requests — work customers booked for later.
 *
 * Grouped by the day it falls on, soonest first, with no countdown anywhere: a job for
 * Saturday morning should be considered, not raced for. Accepting one that runs into
 * work already taken goes through the clash sheet first.
 */

type Filter = 'all' | 'tomorrow' | 'week';

const DAY_MS = 86_400_000;
const startOfDay = (ms: number) => new Date(new Date(ms).getFullYear(), new Date(ms).getMonth(), new Date(ms).getDate()).getTime();

export default function ScheduledRequestsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const days = useScheduledDays();

  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<ScheduledRequestView | null>(null);
  const [declining, setDeclining] = useState<ScheduledRequestView | null>(null);
  const [declineBusy, setDeclineBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const shown = useMemo(() => {
    if (filter === 'all') return days;
    const today = startOfDay(Date.now());
    const limit = today + (filter === 'tomorrow' ? 2 * DAY_MS : 8 * DAY_MS);
    return days.filter((day) => day.startsAtMs < limit && (filter !== 'tomorrow' || day.startsAtMs >= today + DAY_MS));
  }, [days, filter]);

  const total = days.reduce((count, day) => count + day.items.length, 0);

  async function take(view: ScheduledRequestView, confirmOverlap: boolean) {
    setNotice(null);
    setBusyId(view.request.id);
    const result = await acceptScheduled(view.request.id, confirmOverlap ? { confirmOverlap: true } : {});
    setBusyId(null);
    if (result.ok) {
      setReviewing(null);
      router.push(`/job/${result.bookingId}`);
      return;
    }
    if (result.reason === 'conflict') {
      /* The server found a clash this phone did not know about: show what it found. */
      setReviewing({ ...view, conflicts: result.conflicts });
      return;
    }
    setReviewing(null);
    setNotice(t(`worker.scheduled.notice.${result.reason}`));
  }

  async function decline(reason: DeclineReason) {
    if (!declining) return;
    setDeclineBusy(true);
    const result = await declineScheduled(declining.request.id, reason);
    setDeclineBusy(false);
    setDeclining(null);
    setNotice(t(result.ok ? 'worker.scheduled.notice.declined' : 'worker.scheduled.notice.gone'));
  }

  return (
    <View className="flex-1 bg-worker-ground">
      <ScreenHeader
        title={t('worker.scheduled.title')}
        trailing={
          total > 0 ? (
            <Text className="mr-3 text-[11px] text-worker-muted">{t('worker.scheduled.waiting', { count: total })}</Text>
          ) : null
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="w-full max-w-xl self-center px-5 pt-3">
          <View className="flex-row gap-1.5">
            {(['all', 'tomorrow', 'week'] as const).map((key) => (
              <Pressable
                key={key}
                className={`rounded-full border px-2.5 py-1 ${
                  filter === key ? 'border-worker-primary-soft bg-worker-primary-tint' : 'border-worker-border bg-worker-surface'
                }`}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                onPress={() => setFilter(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === key }}
                accessibilityLabel={t(`worker.scheduled.filters.${key}`)}
              >
                <Text
                  weight={filter === key ? 'semibold' : 'regular'}
                  className={`text-[10.5px] ${filter === key ? 'text-worker-primary' : 'text-worker-muted'}`}
                >
                  {t(`worker.scheduled.filters.${key}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          {notice ? (
            <View className="mt-3 flex-row items-center rounded-xl bg-worker-primary-tint px-3 py-2" accessibilityLiveRegion="polite">
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <Text className="ml-2 flex-1 text-[11px] text-worker-ink">{notice}</Text>
            </View>
          ) : null}

          {shown.length === 0 ? (
            <View className="mt-10 items-center px-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-worker-primary-tint">
                <Ionicons name="calendar-outline" size={22} color={colors.primary} />
              </View>
              <Text weight="semibold" className="mt-3 text-center text-sm text-worker-ink">
                {t('worker.scheduled.empty.title')}
              </Text>
              <Text className="mt-1 text-center text-[11px] text-worker-muted">{t('worker.scheduled.empty.body')}</Text>
            </View>
          ) : (
            shown.map((day) => (
              <View key={day.key} className="mt-4 gap-2">
                <DayHeading startsAtMs={day.startsAtMs} />
                {day.items.map((view) => (
                  <ScheduledRequestCard
                    key={view.request.id}
                    view={view}
                    busy={busyId === view.request.id}
                    onAccept={() => void take(view, false)}
                    onDecline={() => setDeclining(view)}
                    onReview={() => setReviewing(view)}
                  />
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <ConflictSheet
        view={reviewing}
        busy={busyId !== null}
        onClose={() => setReviewing(null)}
        onConfirm={() => reviewing && void take(reviewing, true)}
      />
      <DeclineSheet
        visible={declining !== null}
        busy={declineBusy}
        onClose={() => setDeclining(null)}
        onConfirm={(reason) => void decline(reason)}
      />
    </View>
  );
}

/** "TOMORROW · Fri, 18 Sep" — the day first, since that is what the list is ordered by. */
function DayHeading({ startsAtMs }: { startsAtMs: number }) {
  const { t } = useTranslation();
  const at = new Date(startsAtMs);
  const days = Math.round((startOfDay(startsAtMs) - startOfDay(Date.now())) / DAY_MS);
  const name =
    days === 0
      ? t('worker.scheduled.day.today')
      : days === 1
        ? t('worker.scheduled.day.tomorrow')
        : t(`booking.schedule.weekdays.${at.getDay()}`);

  return (
    <View className="flex-row items-baseline justify-between">
      <Text weight="bold" className="text-[10.5px] uppercase tracking-wider text-worker-muted">
        {name}
      </Text>
      <Text className="text-[10.5px] text-worker-muted">
        {t('worker.common.dayMonth', { day: at.getDate(), month: t(`booking.schedule.months.${at.getMonth()}`) })}
      </Text>
    </View>
  );
}
