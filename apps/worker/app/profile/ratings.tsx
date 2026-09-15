import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StarRating } from '../../src/components/StarRating';
import { formatDayMonth } from '../../src/lib/datetime';
import { useRatings, useRatingSummary, useWeekFairness } from '../../src/services';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
const STARS = [5, 4, 3, 2, 1] as const;

/**
 * My ratings — the number, and what it actually does.
 *
 * A rating shown on its own is stressful and tells a worker nothing they can
 * act on. So this screen puts it next to the rules that share out jobs —
 * distance, fair share this week, rating — with the worker's own week against
 * the member average. A lower-rated member who has had fewer jobs this week is
 * still moved up the list: the anti-exploitation rule, stated to the person it
 * protects. Then what helps, and what customers actually said.
 */
export default function RatingsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const summary = useRatingSummary();
  const ratings = useRatings();
  const week = useWeekFairness();
  const starLabel = (n: number) => t('worker.rate.starA11y', { n });

  return (
    <View className="flex-1 bg-worker-ground">
      <ScreenHeader title={t('worker.profile.ratings.title')} fallback="/profile" />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        <View className="w-full max-w-xl gap-3 self-center px-5">
          {/* The number */}
          <View className="flex-row items-center rounded-2xl border border-worker-border bg-worker-surface p-4">
            <View className="items-center pr-4">
              <Text weight="bold" className="text-4xl text-worker-ink">
                {summary.count ? summary.average.toFixed(1) : '—'}
              </Text>
              <Text className="text-xs text-worker-muted">{t('worker.profile.ratings.outOf')}</Text>
              <View className="mt-1">
                <StarRating value={Math.round(summary.average)} size={14} starLabel={starLabel} />
              </View>
            </View>
            <View className="flex-1 border-l border-worker-border pl-4">
              {STARS.map((star) => {
                const count = summary.distribution[star];
                const share = summary.count ? (count / summary.count) * 100 : 0;
                return (
                  <View key={star} className="flex-row items-center py-0.5" accessible accessibilityLabel={`${starLabel(star)}: ${count}`}>
                    <Text className="w-3 text-xs text-worker-muted">{String(star)}</Text>
                    <View className="mx-2 h-1.5 flex-1 overflow-hidden rounded-full bg-worker-border">
                      <View className="h-full rounded-full bg-worker-warning" style={{ width: `${share}%` }} />
                    </View>
                    <Text className="w-4 text-right text-xs text-worker-muted">{String(count)}</Text>
                  </View>
                );
              })}
              <Text className="mt-1 text-xs text-worker-muted">{t('worker.profile.ratings.count', { n: summary.count })}</Text>
            </View>
          </View>

          {/* How jobs are shared out */}
          <Card title={t('worker.profile.ratings.howTitle')}>
            <Text className="text-sm text-worker-muted">{t('worker.profile.ratings.howIntro')}</Text>
            <Factor icon="navigate-outline" title={t('worker.profile.ratings.factors.distance.title')} body={t('worker.profile.ratings.factors.distance.body')} />
            <Factor icon="people-outline" title={t('worker.profile.ratings.factors.fair.title')} body={t('worker.profile.ratings.factors.fair.body')} />
            <Factor icon="star-outline" title={t('worker.profile.ratings.factors.rating.title')} body={t('worker.profile.ratings.factors.rating.body')} />
          </Card>

          {/* Your week */}
          <View className="rounded-2xl border border-worker-success bg-worker-success-soft p-4">
            <Text weight="bold" className="text-base text-worker-ink" accessibilityRole="header">
              {t('worker.profile.ratings.week.title')}
            </Text>
            <View className="mt-2 flex-row gap-3">
              <View className="flex-1 rounded-xl bg-worker-surface p-3">
                <Text weight="bold" className="text-xl text-worker-ink">
                  {String(week.jobsThisWeek)}
                </Text>
                <Text className="text-xs text-worker-muted">{t('worker.profile.ratings.week.jobs')}</Text>
              </View>
              <View className="flex-1 rounded-xl bg-worker-surface p-3">
                <Text weight="bold" className="text-xl text-worker-ink">
                  {String(week.memberAverage)}
                </Text>
                <Text className="text-xs text-worker-muted">{t('worker.profile.ratings.week.average')}</Text>
              </View>
            </View>
            <Text className="mt-2 text-sm text-worker-ink">{t(`worker.profile.ratings.week.${week.standing}`)}</Text>
            <View className="mt-2 flex-row">
              <Ionicons name="shield-checkmark" size={16} color={colors.success} style={{ marginTop: 2 }} />
              <Text weight="semibold" className="ml-2 flex-1 text-sm text-worker-success">
                {t('worker.profile.ratings.reassurance')}
              </Text>
            </View>
          </View>

          {/* What helps */}
          <Card title={t('worker.profile.ratings.tipsTitle')}>
            {(['onTime', 'explain', 'clean'] as const).map((tip) => (
              <View key={tip} className="mt-1.5 flex-row">
                <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <Text className="ml-2 flex-1 text-sm text-worker-ink">{t(`worker.profile.ratings.tips.${tip}`)}</Text>
              </View>
            ))}
          </Card>

          {/* Recent feedback */}
          <Text weight="bold" className="mt-2 text-lg text-worker-ink" accessibilityRole="header">
            {t('worker.profile.ratings.recentTitle')}
          </Text>
          {ratings.length === 0 ? (
            <Text className="text-sm text-worker-muted">{t('worker.profile.ratings.empty')}</Text>
          ) : (
            ratings.map(({ rating, customer }) => (
              <View key={rating.id} className="rounded-2xl border border-worker-border bg-worker-surface p-4">
                <View className="flex-row items-center justify-between">
                  <StarRating value={rating.stars} size={14} starLabel={starLabel} />
                  <Text className="text-xs text-worker-muted">{formatDayMonth(rating.createdAt, t)}</Text>
                </View>
                <Text className="mt-2 text-sm text-worker-ink">{rating.comment}</Text>
                <Text className="mt-1 text-xs text-worker-muted">{customer?.name ?? '—'}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
      <Text weight="bold" className="mb-1 text-base text-worker-ink" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Factor({ icon, title, body }: { icon: IoniconName; title: string; body: string }) {
  const colors = useThemeColors();
  return (
    <View className="mt-3 flex-row">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-worker-primary-tint">
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View className="ml-3 flex-1">
        <Text weight="semibold" className="text-sm text-worker-ink">
          {title}
        </Text>
        <Text className="text-sm text-worker-muted">{body}</Text>
      </View>
    </View>
  );
}
