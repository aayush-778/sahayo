import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatPaise, Text, useThemeColors } from '@sahayo/ui-native';

import { formatDayMonth, timeLeft, type TimeLeft } from '../lib/datetime';
import { useLanguage, type ProposalView } from '../services';
import type { ProposalCategory } from '../types';
import { StatusBadge } from './StatusBadge';
import { TallyBar } from './TallyBar';

export const PROPOSAL_ICON: Record<ProposalCategory, ComponentProps<typeof Ionicons>['name']> = {
  health: 'medkit-outline',
  loan: 'cash-outline',
  training: 'school-outline',
  relief: 'umbrella-outline',
  equipment: 'construct-outline',
  other: 'shirt-outline',
};

/** "5 days left", "9 hours left", "Voting closed" — from the catalogue. */
export function useTimeLeftLabel(): (left: TimeLeft) => string {
  const { t } = useTranslation();
  return (left) => {
    if (left.unit === 'closed') return t('worker.coop.timeLeft.closed');
    if (left.unit === 'days') return left.n === 1 ? t('worker.coop.timeLeft.oneDay') : t('worker.coop.timeLeft.days', { n: left.n });
    if (left.unit === 'hours') return left.n === 1 ? t('worker.coop.timeLeft.oneHour') : t('worker.coop.timeLeft.hours', { n: left.n });
    return t('worker.coop.timeLeft.minutes', { n: left.n });
  };
}

/**
 * A proposal in a list.
 *
 * Open: what it is, how much, how long is left, how the vote is going, and
 * whether this worker has voted. Decided: what actually happened.
 */
export function ProposalCard({ proposal }: { proposal: ProposalView }) {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const language = useLanguage();
  const timeLabel = useTimeLeftLabel();
  const open = proposal.status === 'active';
  const left = timeLeft(proposal.closesAt);

  return (
    <Pressable
      className="rounded-2xl border border-worker-border bg-worker-surface p-4"
      onPress={() => router.push(`/coop/proposal/${proposal.id}`)}
      accessibilityRole="button"
      accessibilityLabel={proposal.title[language]}
    >
      <View className="flex-row items-start">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-worker-primary-tint">
          <Ionicons name={PROPOSAL_ICON[proposal.category]} size={20} color={colors.primary} />
        </View>
        <View className="ml-3 flex-1">
          <Text weight="semibold" className="text-base text-worker-ink" numberOfLines={2}>
            {proposal.title[language]}
          </Text>
          <Text weight="semibold" className="mt-0.5 text-sm text-worker-primary">
            {t('worker.coop.amount', { amount: formatPaise(proposal.amount, language) })}
          </Text>
        </View>
      </View>

      {open ? (
        <>
          <View className="mt-3">
            <TallyBar tally={proposal.liveTally} />
          </View>
          <View className="mt-2 flex-row flex-wrap items-center justify-between gap-2">
            <StatusBadge label={timeLabel(left)} tone={left.unit === 'days' ? 'primary' : 'warning'} />
            {proposal.myVote ? (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-done" size={16} color={colors.success} />
                <Text weight="semibold" className="ml-1 text-sm text-worker-success">
                  {t('worker.coop.votes.voted', { choice: t(`worker.coop.choice.${proposal.myVote}`) })}
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Text weight="bold" className="text-sm text-worker-primary">
                  {t('worker.coop.votes.voteNow')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          {proposal.outcome ? (
            <Text className="mt-2 text-sm text-worker-ink">{proposal.outcome[language]}</Text>
          ) : null}
          <View className="mt-2 flex-row flex-wrap items-center justify-between gap-2">
            <StatusBadge
              label={t(`worker.coop.status.${proposal.status}`)}
              tone={proposal.status === 'passed' ? 'success' : 'danger'}
            />
            <Text className="text-xs text-worker-muted">{formatDayMonth(proposal.closesAt, t)}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}
