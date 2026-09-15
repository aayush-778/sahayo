import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatPaise, PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { PROPOSAL_ICON, useTimeLeftLabel } from '../../../src/components/ProposalCard';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { Sheet } from '../../../src/components/Sheet';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { TallyBar } from '../../../src/components/TallyBar';
import { formatDayMonth, formatWhen, timeLeft } from '../../../src/lib/datetime';
import { castVote, isVotingOpen, useFundOverview, useLanguage, useProposal } from '../../../src/services';

/**
 * One proposal, and this worker's vote on it.
 *
 * What it is, in the proposer's plain words; what it costs against what the
 * fund holds; how members are voting; and the vote itself — Yes or No, one
 * each, confirmed once and then fixed. After voting the worker sees their vote
 * recorded and counted in the tally above it.
 */
export default function ProposalScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const language = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const proposal = useProposal(id);
  const fund = useFundOverview();
  const timeLabel = useTimeLeftLabel();

  const [choice, setChoice] = useState<'yes' | 'no' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!proposal) {
    return (
      <View className="flex-1 bg-worker-ground">
        <ScreenHeader title={t('worker.coop.proposal.title')} fallback="/coop" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-worker-muted">{t('worker.coop.proposal.notFound')}</Text>
        </View>
      </View>
    );
  }

  const open = isVotingOpen(proposal);
  const left = timeLeft(proposal.closesAt);
  const money = (paise: number) => formatPaise(paise, language);

  async function vote() {
    if (!proposal || !choice) return;
    setBusy(true);
    const result = await castVote(proposal.id, choice);
    setBusy(false);
    setChoice(null);
    if (!result.ok) setError(t(`worker.coop.proposal.errors.${result.reason}`));
  }

  return (
    <View className="flex-1 bg-worker-ground">
      <ScreenHeader title={t('worker.coop.proposal.title')} fallback="/coop" />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        <View className="w-full max-w-xl gap-3 self-center px-5">
          <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
            <View className="flex-row items-center justify-between gap-2">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-worker-primary-tint">
                <Ionicons name={PROPOSAL_ICON[proposal.category]} size={20} color={colors.primary} />
              </View>
              {proposal.status === 'active' ? (
                <StatusBadge label={timeLabel(left)} tone={left.unit === 'days' ? 'primary' : 'warning'} />
              ) : (
                <StatusBadge
                  label={t(`worker.coop.status.${proposal.status}`)}
                  tone={proposal.status === 'passed' ? 'success' : 'danger'}
                />
              )}
            </View>
            <Text weight="bold" className="mt-3 text-xl text-worker-ink" accessibilityRole="header">
              {proposal.title[language]}
            </Text>
            <Text className="mt-1 text-xs text-worker-muted">
              {t('worker.coop.proposal.proposedBy', {
                name: proposal.proposedBy,
                when: formatDayMonth(proposal.opensAt, t),
              })}
            </Text>
            <Text className="mt-3 text-base text-worker-ink">{proposal.summary[language]}</Text>
          </View>

          {/* The money */}
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-worker-border bg-worker-surface p-4">
              <Text className="text-xs text-worker-muted">{t('worker.coop.proposal.asking')}</Text>
              <Text weight="bold" className="mt-0.5 text-xl text-worker-primary">
                {money(proposal.amount)}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl border border-worker-border bg-worker-surface p-4">
              <Text className="text-xs text-worker-muted">{t('worker.coop.proposal.fundToday')}</Text>
              <Text weight="bold" className="mt-0.5 text-xl text-worker-ink">
                {money(fund.balance)}
              </Text>
            </View>
          </View>

          <Card title={t('worker.coop.proposal.points')}>
            {proposal.points.map((point, index) => (
              <View key={index} className="mt-1.5 flex-row">
                <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <Text className="ml-2 flex-1 text-sm text-worker-ink">{point[language]}</Text>
              </View>
            ))}
          </Card>

          {proposal.outcome ? (
            <Card title={t('worker.coop.proposal.outcomeTitle')}>
              <Text className="text-sm text-worker-ink">{proposal.outcome[language]}</Text>
            </Card>
          ) : null}

          {/* The count */}
          <Card title={t('worker.coop.proposal.votesTitle')}>
            <TallyBar tally={proposal.liveTally} />
            <Text className="mt-2 text-xs text-worker-muted">
              {t('worker.coop.tally.turnout', { cast: proposal.votesCast, total: proposal.eligibleVoters })}
            </Text>
            {proposal.status === 'active' ? (
              <Text className="mt-1 text-xs text-worker-muted">
                {t('worker.coop.proposal.rule', { when: formatWhen(proposal.closesAt, t) })}
              </Text>
            ) : null}
          </Card>

          {/* Your vote */}
          <Card title={t('worker.coop.proposal.voteTitle')}>
            {proposal.myVote ? (
              <View className="flex-row items-center rounded-xl bg-worker-success-soft px-3 py-3">
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <View className="ml-2 flex-1">
                  <Text weight="bold" className="text-base text-worker-ink">
                    {t('worker.coop.proposal.recorded')}
                  </Text>
                  <Text className="text-sm text-worker-ink">
                    {t('worker.coop.proposal.recordedBody', { choice: t(`worker.coop.choice.${proposal.myVote}`) })}
                  </Text>
                </View>
              </View>
            ) : open ? (
              <>
                <Text className="text-sm text-worker-muted">{t('worker.coop.proposal.votePrompt')}</Text>
                <View className="mt-3 flex-row gap-3">
                  <Pressable
                    className="h-14 flex-1 flex-row items-center justify-center rounded-xl bg-worker-success"
                    onPress={() => {
                      setError(null);
                      setChoice('yes');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('worker.coop.choice.yes')}
                  >
                    <Ionicons name="thumbs-up" size={20} color={colors.onPrimary} />
                    <Text weight="bold" className="ml-2 text-base text-white">
                      {t('worker.coop.choice.yes')}
                    </Text>
                  </Pressable>
                  <Pressable
                    className="h-14 flex-1 flex-row items-center justify-center rounded-xl border-2 border-worker-danger bg-worker-surface"
                    onPress={() => {
                      setError(null);
                      setChoice('no');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('worker.coop.choice.no')}
                  >
                    <Ionicons name="thumbs-down" size={20} color={colors.danger} />
                    <Text weight="bold" className="ml-2 text-base text-worker-danger">
                      {t('worker.coop.choice.no')}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Text className="text-sm text-worker-muted">{t('worker.coop.proposal.closedNoVote')}</Text>
            )}
            {error ? (
              <Text className="mt-2 text-sm text-worker-danger" accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
          </Card>
        </View>
      </ScrollView>

      <Sheet
        visible={choice !== null}
        title={choice ? t('worker.coop.proposal.confirmTitle', { choice: t(`worker.coop.choice.${choice}`) }) : ''}
        onClose={() => setChoice(null)}
        footer={
          <View className="gap-2">
            <PrimaryButton label={t('worker.coop.proposal.confirm')} loading={busy} onPress={() => void vote()} />
            <Pressable
              className="h-12 items-center justify-center"
              onPress={() => setChoice(null)}
              accessibilityRole="button"
              accessibilityLabel={t('worker.coop.proposal.cancel')}
            >
              <Text weight="semibold" className="text-base text-worker-primary">
                {t('worker.coop.proposal.cancel')}
              </Text>
            </Pressable>
          </View>
        }
      >
        <Text className="px-5 pt-3 text-base text-worker-ink">
          {t('worker.coop.proposal.confirmBody', { title: proposal.title[language] })}
        </Text>
      </Sheet>
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
      <Text weight="bold" className="mb-2 text-base text-worker-ink" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}
