import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COOP_FUND_SHARE } from '@sahayo/shared';
import { formatPaise, Text, useThemeColors } from '@sahayo/ui-native';

import { MiniBarChart } from '../../src/components/MiniBarChart';
import { ProposalCard } from '../../src/components/ProposalCard';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SupportRequestCard } from '../../src/components/SupportRequestCard';
import {
  useActiveProposals,
  useClosedProposals,
  useFundOverview,
  useLanguage,
  useMyContribution,
  useSupportRequests,
} from '../../src/services';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Our cooperative fund.
 *
 * This is the screen that makes the platform a cooperative rather than a gig
 * app with a fee. A worker sees the money all members built together, how much
 * of it came from them, what it has already done for members, what is being
 * decided right now — with their vote — and where to ask for help.
 *
 * The order follows the questions a member asks: how much is there, what is
 * mine in it, what is being decided, can it help me, what has it done.
 */
export default function CoopScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const language = useLanguage();
  const fund = useFundOverview();
  const mine = useMyContribution();
  const active = useActiveProposals();
  const closed = useClosedProposals();
  const requests = useSupportRequests();

  const money = (paise: number) => formatPaise(paise, language);
  const monthName = (month: number) => t(`booking.schedule.months.${month}`);
  const sharePercent = (mine.share * 100).toFixed(mine.share * 100 < 1 ? 1 : 0);

  return (
    <View className="flex-1 bg-worker-ground">
      <ScreenHeader title={t('worker.coop.title')} fallback="/earnings" />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        <View className="w-full max-w-xl gap-3 self-center px-5">
          {/* How much is in our fund */}
          <View className="rounded-2xl bg-worker-primary p-4">
            <Text className="text-xs text-white">{fund.name[language]}</Text>
            <Text className="mt-2 text-sm text-white">{t('worker.coop.hero.inFund')}</Text>
            <Text weight="bold" className="text-3xl text-white">
              {money(fund.balance)}
            </Text>
            <View className="mt-1 flex-row items-center">
              <Ionicons
                name={fund.changeThisMonth >= 0 ? 'trending-up' : 'trending-down'}
                size={16}
                color={colors.onPrimary}
              />
              <Text weight="semibold" className="ml-1 text-sm text-white">
                {fund.changeThisMonth >= 0
                  ? t('worker.coop.hero.grew', { amount: money(fund.changeThisMonth) })
                  : t('worker.coop.hero.shrank', { amount: money(-fund.changeThisMonth) })}
              </Text>
            </View>
            <View className="mt-4">
              <MiniBarChart
                onDark
                height={64}
                bars={fund.monthly.map((month, index) => ({
                  key: month.key,
                  label: monthName(month.month).slice(0, 3),
                  value: month.balance,
                  highlight: index === fund.monthly.length - 1,
                  description: t('worker.coop.hero.chartA11y', { month: monthName(month.month), amount: money(month.balance) }),
                }))}
              />
            </View>
            <Text className="mt-3 text-xs text-white">
              {t('worker.coop.hero.members', { n: fund.memberCount, amount: money(fund.spentOnMembers) })}
            </Text>
          </View>

          {/* What you have put in */}
          <View className="rounded-2xl border border-worker-success bg-worker-success-soft p-4">
            <View className="flex-row items-center">
              <Ionicons name="people" size={18} color={colors.success} />
              <Text weight="bold" className="ml-2 text-base text-worker-ink">
                {t('worker.coop.mine.title')}
              </Text>
            </View>
            <Text weight="bold" className="mt-1 text-2xl text-worker-success">
              {money(mine.lifetime)}
            </Text>
            <Text className="text-sm text-worker-ink">{t('worker.coop.mine.share', { pct: sharePercent })}</Text>
            <Text className="mt-1 text-xs text-worker-muted">
              {t('worker.coop.mine.thisMonth', { amount: money(mine.thisMonth) })}
            </Text>
            <Text className="mt-2 text-xs text-worker-ink">
              {t('worker.coop.mine.how', { pct: Math.round(COOP_FUND_SHARE * 100) })}
            </Text>
          </View>

          {/* Your vote is needed */}
          <Section title={t('worker.coop.votes.title')} subtitle={t('worker.coop.votes.subtitle')}>
            {active.length === 0 ? (
              <Empty text={t('worker.coop.votes.empty')} />
            ) : (
              active.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} />)
            )}
          </Section>

          {/* Need help? */}
          <Section title={t('worker.coop.help.title')}>
            <View className="flex-row flex-wrap gap-3">
              <HelpTile
                icon="construct-outline"
                title={t('worker.coop.help.loanTitle')}
                body={t('worker.coop.help.loanBody')}
                href="/coop/request?kind=loan"
              />
              <HelpTile
                icon="medkit-outline"
                title={t('worker.coop.help.claimTitle')}
                body={t('worker.coop.help.claimBody')}
                href="/coop/request?kind=claim"
              />
            </View>
          </Section>

          {/* Your requests */}
          <Section title={t('worker.coop.requests.title')}>
            {requests.length === 0 ? (
              <Empty text={t('worker.coop.requests.empty')} />
            ) : (
              requests.map((request) => <SupportRequestCard key={request.id} request={request} />)
            )}
          </Section>

          {/* What our fund has done */}
          <Section title={t('worker.coop.done.title')}>
            {closed.length === 0 ? (
              <Empty text={t('worker.coop.done.empty')} />
            ) : (
              closed.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} />)
            )}
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View className="mt-3 gap-3">
      <View>
        <Text weight="bold" className="text-lg text-worker-ink" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text className="text-sm text-worker-muted">{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View className="rounded-2xl border border-dashed border-worker-outline bg-worker-surface px-4 py-5">
      <Text className="text-center text-sm text-worker-muted">{text}</Text>
    </View>
  );
}

function HelpTile({ icon, title, body, href }: { icon: IoniconName; title: string; body: string; href: Href }) {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <Pressable
      className="min-w-[140px] flex-1 rounded-2xl border border-worker-border bg-worker-surface p-4"
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-worker-primary-tint">
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text weight="semibold" className="mt-2 text-sm text-worker-ink">
        {title}
      </Text>
      <Text className="mt-0.5 text-xs text-worker-muted">{body}</Text>
    </Pressable>
  );
}
