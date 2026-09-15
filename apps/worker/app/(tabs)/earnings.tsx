import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COOP_FUND_SHARE, WORKER_SHARE } from '@sahayo/shared';
import { Avatar, formatPaise, Text, useThemeColors } from '@sahayo/ui-native';

import { LanguageToggle } from '../../src/components/LanguageToggle';
import { MiniBarChart } from '../../src/components/MiniBarChart';
import { SegmentedTabs } from '../../src/components/SegmentedTabs';
import { Sheet } from '../../src/components/Sheet';
import { StatusBadge } from '../../src/components/StatusBadge';
import { formatDayMonth, formatWhen } from '../../src/lib/datetime';
import { buildStatement } from '../../src/lib/statement';
import {
  EARNINGS_PERIODS,
  findSubCategory,
  localizedName,
  settleEarnings,
  useEarningsPeriod,
  useLanguage,
  useLastSevenDays,
  useMyContribution,
  usePayoutState,
  useSettlementHistory,
  useTodayOverview,
  useUnsettledRows,
  useWorkerProfile,
  type EarningRow,
} from '../../src/services';
import type { EarningsPeriod } from '../../src/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type Message = { tone: 'success' | 'info' | 'danger'; text: string };

const percent = (share: number) => Math.round(share * 100);

/**
 * Earnings — what came in, what is still waiting, and getting paid.
 *
 * The payout card leads, because "how much is waiting for me" is the question
 * a worker opens this tab to answer. Settle Now is a real transfer in this
 * prototype: after a short processing wait the waiting figure goes to zero, a
 * settlement row appears, and the jobs it covered read Paid out everywhere.
 *
 * Fund contribution is a doorway, not a number: it opens the cooperative fund,
 * where the worker can see where that money went and vote on what comes next.
 *
 * Share sends a plain-text statement to WhatsApp, SMS or anywhere else through
 * the phone's own share sheet.
 */
export default function EarningsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const language = useLanguage();
  const profile = useWorkerProfile();

  const payout = usePayoutState();
  const today = useTodayOverview();
  const contribution = useMyContribution();
  const days = useLastSevenDays();
  const settlements = useSettlementHistory();
  const unsettledRows = useUnsettledRows();

  const [period, setPeriod] = useState<EarningsPeriod>('this_month');
  const summary = useEarningsPeriod(period);
  const [list, setList] = useState<'transactions' | 'settlements'>('transactions');
  const [settling, setSettling] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [sheet, setSheet] = useState<'data' | 'menu' | 'how' | null>(null);

  const money = (paise: number) => formatPaise(paise, language);
  const openJob = (bookingId: string) => router.push(`/job/active/${bookingId}`);

  async function settle() {
    setMessage(null);
    setSettling(true);
    const result = await settleEarnings();
    setSettling(false);
    setMessage(
      result.ok
        ? {
            tone: 'success',
            text: t('worker.earnings.settled', {
              amount: money(result.settlement.amount),
              reference: result.settlement.reference,
            }),
          }
        : { tone: 'info', text: t('worker.earnings.nothingToSettle') },
    );
  }

  async function shareStatement() {
    const statement = buildStatement({
      t,
      language,
      workerName: profile.name,
      periodLabel: t(`worker.earnings.periods.${period}`),
      summary,
      unsettled: payout.unsettled,
      contribution: contribution.lifetime,
      settlements,
    });
    try {
      await Share.share({ title: t('worker.earnings.statement.title'), message: statement });
    } catch {
      setMessage({ tone: 'danger', text: t('worker.earnings.shareFailed') });
    }
  }

  const bars = days.map((day) => ({
    key: day.key,
    label: t(`booking.schedule.weekdays.${day.weekday}`),
    value: day.amount,
    highlight: day.isToday,
    description: t('worker.earnings.dailyA11y', {
      day: t(`booking.schedule.weekdays.${day.weekday}`),
      amount: money(day.amount),
    }),
  }));

  return (
    <View className="flex-1 bg-worker-ground">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}>
        <View className="w-full max-w-xl gap-3 self-center px-5">
          {/* Header */}
          <View className="flex-row items-center">
            <Text weight="bold" className="flex-1 text-2xl text-worker-ink" accessibilityRole="header">
              {t('worker.earnings.title')}
            </Text>
            <IconButton icon="share-social-outline" label={t('worker.earnings.share')} onPress={() => void shareStatement()} />
            <IconButton icon="ellipsis-vertical" label={t('worker.earnings.more')} onPress={() => setSheet('menu')} />
            <LanguageToggle />
          </View>

          {/* Received since last settlement */}
          <View className="rounded-2xl bg-worker-primary p-4">
            <Text className="text-sm text-white">{t('worker.earnings.receivedSince')}</Text>
            <Text weight="bold" className="text-3xl text-white">
              {money(payout.unsettled)}
            </Text>
            <Text className="mt-0.5 text-xs text-white">
              {payout.lastSettlement
                ? t('worker.earnings.lastSettled', {
                    when: formatWhen(payout.lastSettlement.settledAt, t),
                    reference: payout.lastSettlement.reference,
                  })
                : t('worker.earnings.neverSettled')}
            </Text>
            <View className="mt-3 flex-row gap-3">
              <Pressable
                className={`h-12 flex-1 flex-row items-center justify-center rounded-xl ${
                  payout.unsettled > 0 ? 'bg-white' : 'bg-white/60'
                }`}
                onPress={() => void settle()}
                disabled={settling || payout.unsettled === 0}
                accessibilityRole="button"
                accessibilityState={{ disabled: settling || payout.unsettled === 0, busy: settling }}
                accessibilityLabel={t('worker.earnings.settleNow')}
              >
                {settling ? (
                  <>
                    <ActivityIndicator color={colors.primary} />
                    <Text weight="semibold" className="ml-2 text-sm text-worker-primary">
                      {t('worker.earnings.settling')}
                    </Text>
                  </>
                ) : (
                  <Text weight="semibold" className="text-sm text-worker-primary">
                    {t('worker.earnings.settleNow')}
                  </Text>
                )}
              </Pressable>
              <Pressable
                className="h-12 flex-1 items-center justify-center rounded-xl border-2 border-white"
                onPress={() => setSheet('data')}
                accessibilityRole="button"
                accessibilityLabel={t('worker.earnings.showData')}
              >
                <Text weight="semibold" className="text-sm text-white">
                  {t('worker.earnings.showData')}
                </Text>
              </Pressable>
            </View>
          </View>

          {message ? (
            <View
              className={`flex-row items-center rounded-xl px-3 py-2.5 ${
                message.tone === 'success'
                  ? 'bg-worker-success-soft'
                  : message.tone === 'danger'
                    ? 'bg-worker-danger-soft'
                    : 'bg-worker-primary-tint'
              }`}
              accessibilityLiveRegion="polite"
            >
              <Ionicons
                name={message.tone === 'success' ? 'checkmark-circle' : 'information-circle'}
                size={18}
                color={message.tone === 'success' ? colors.success : message.tone === 'danger' ? colors.danger : colors.primary}
              />
              <Text className="ml-2 flex-1 text-sm text-worker-ink">{message.text}</Text>
            </View>
          ) : null}

          {/* Today's earning | Fund contribution */}
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-worker-border bg-worker-surface p-4">
              <Text className="text-xs text-worker-muted">{t('worker.earnings.today')}</Text>
              <Text weight="bold" className="mt-0.5 text-xl text-worker-ink">
                {money(today.earningsToday)}
              </Text>
            </View>
            <Pressable
              className="flex-1 rounded-2xl border border-worker-success bg-worker-success-soft p-4"
              onPress={() => router.push('/coop')}
              accessibilityRole="link"
              accessibilityLabel={`${t('worker.earnings.fund')}: ${money(contribution.thisMonth)}. ${t('worker.earnings.fundCaption')}`}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-worker-ink">{t('worker.earnings.fund')}</Text>
                <Ionicons name="people" size={16} color={colors.success} />
              </View>
              <Text weight="bold" className="mt-0.5 text-xl text-worker-success">
                {money(contribution.thisMonth)}
              </Text>
              <View className="flex-row items-center">
                <Text className="flex-1 text-xs text-worker-ink" numberOfLines={2}>
                  {t('worker.earnings.fundCaption')}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.success} />
              </View>
            </Pressable>
          </View>

          {/* Period */}
          <SegmentedTabs
            tabs={EARNINGS_PERIODS.map((key) => ({ key, label: t(`worker.earnings.periods.${key}`) }))}
            selected={period}
            onSelect={setPeriod}
          />

          {/* Summary */}
          <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
            <Text weight="bold" className="text-base text-worker-ink" accessibilityRole="header">
              {t('worker.earnings.summaryTitle')}
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-3">
              <Figure icon="cash-outline" value={money(summary.total)} label={t('worker.earnings.total')} />
              <Figure icon="checkmark-done-outline" value={String(summary.jobs)} label={t('worker.earnings.jobs')} />
              <Figure icon="analytics-outline" value={money(summary.average)} label={t('worker.earnings.average')} />
              <Figure icon="time-outline" value={money(summary.pending)} label={t('worker.earnings.pending')} />
            </View>
          </View>

          {/* Last 7 days */}
          <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
            <Text weight="bold" className="mb-3 text-base text-worker-ink" accessibilityRole="header">
              {t('worker.earnings.dailyTitle')}
            </Text>
            <MiniBarChart bars={bars} />
          </View>

          {/* Transactions / Settlements */}
          <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
            <View className="flex-row gap-2" accessibilityRole="tablist">
              {(['transactions', 'settlements'] as const).map((key) => {
                const active = list === key;
                return (
                  <Pressable
                    key={key}
                    className={`h-10 flex-1 items-center justify-center rounded-xl ${
                      active ? 'bg-worker-primary' : 'bg-worker-primary-tint'
                    }`}
                    onPress={() => setList(key)}
                    hitSlop={{ top: 4, bottom: 4 }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text weight="semibold" className={`text-sm ${active ? 'text-white' : 'text-worker-primary'}`}>
                      {t(`worker.earnings.listTabs.${key}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {list === 'transactions' ? (
              summary.months.length === 0 ? (
                <Text className="py-6 text-center text-sm text-worker-muted">
                  {t('worker.earnings.emptyTransactions')}
                </Text>
              ) : (
                summary.months.map((month) => (
                  <View key={month.key} className="mt-4">
                    <View className="flex-row items-center justify-between border-b border-worker-border pb-1.5">
                      <Text weight="bold" className="text-sm text-worker-ink">
                        {t('worker.earnings.monthHeader', {
                          month: t(`booking.schedule.months.${month.month}`),
                          year: month.year,
                        })}
                      </Text>
                      <Text weight="semibold" className="text-sm text-worker-ink">
                        {money(month.total)}
                      </Text>
                    </View>
                    {month.rows.map((row) => (
                      <EarningRowView key={row.entry.id} row={row} onOpen={openJob} />
                    ))}
                  </View>
                ))
              )
            ) : settlements.length === 0 ? (
              <Text className="py-6 text-center text-sm text-worker-muted">{t('worker.earnings.emptySettlements')}</Text>
            ) : (
              <View className="mt-2">
                {settlements.map((settlement) => (
                  <View key={settlement.id} className="min-h-14 flex-row items-center border-b border-worker-border py-2">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-worker-success-soft">
                      <Ionicons name="business-outline" size={18} color={colors.success} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text weight="semibold" className="text-sm text-worker-ink">
                        {formatDayMonth(settlement.settledAt, t)}
                      </Text>
                      <Text className="text-xs text-worker-muted" numberOfLines={1}>
                        {t('worker.earnings.settlementRow', {
                          n: settlement.entryIds.length,
                          reference: settlement.reference,
                        })}
                      </Text>
                    </View>
                    <Text weight="bold" className="text-sm text-worker-ink">
                      {money(settlement.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* What makes up the waiting amount */}
      <Sheet visible={sheet === 'data'} title={t('worker.earnings.unsettledTitle')} onClose={() => setSheet(null)}>
        <ScrollView className="px-5">
          {unsettledRows.length === 0 ? (
            <Text className="py-6 text-center text-sm text-worker-muted">{t('worker.earnings.unsettledEmpty')}</Text>
          ) : (
            <>
              {unsettledRows.map((row) => (
                <EarningRowView
                  key={row.entry.id}
                  row={row}
                  onOpen={(bookingId) => {
                    setSheet(null);
                    openJob(bookingId);
                  }}
                />
              ))}
              <View className="flex-row justify-between py-3">
                <Text weight="bold" className="text-base text-worker-ink">
                  {t('worker.earnings.unsettledTotal')}
                </Text>
                <Text weight="bold" className="text-base text-worker-ink">
                  {money(payout.unsettled)}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </Sheet>

      {/* Overflow menu */}
      <Sheet visible={sheet === 'menu'} title={t('worker.earnings.more')} onClose={() => setSheet(null)}>
        <View className="px-3 pt-2">
          <MenuRow
            icon="share-social-outline"
            label={t('worker.earnings.share')}
            onPress={() => {
              setSheet(null);
              // Let the sheet finish closing before the system share sheet opens.
              setTimeout(() => void shareStatement(), 350);
            }}
          />
          <MenuRow icon="help-circle-outline" label={t('worker.earnings.menu.howTitle')} onPress={() => setSheet('how')} />
          <MenuRow
            icon="people-outline"
            label={t('worker.earnings.menu.openFund')}
            onPress={() => {
              setSheet(null);
              router.push('/coop');
            }}
          />
        </View>
      </Sheet>

      <Sheet visible={sheet === 'how'} title={t('worker.earnings.menu.howTitle')} onClose={() => setSheet(null)}>
        <Text className="px-5 pb-2 pt-3 text-base text-worker-ink">
          {t('worker.earnings.menu.howBody', { worker: percent(WORKER_SHARE), fund: percent(COOP_FUND_SHARE) })}
        </Text>
      </Sheet>
    </View>
  );
}

function IconButton({ icon, label, onPress }: { icon: IoniconName; label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      className="h-12 w-11 items-center justify-center"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={colors.ink} />
    </Pressable>
  );
}

function Figure({ icon, value, label }: { icon: IoniconName; value: string; label: string }) {
  const colors = useThemeColors();
  return (
    <View className="min-w-[130px] flex-1 basis-[45%] rounded-xl bg-worker-ground p-3">
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text weight="bold" className="mt-1 text-lg text-worker-ink" numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-xs text-worker-muted">{label}</Text>
    </View>
  );
}

function MenuRow({ icon, label, onPress }: { icon: IoniconName; label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      className="min-h-12 flex-row items-center rounded-xl px-3"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text className="ml-3 flex-1 text-base text-worker-ink">{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

/** One earning: who it was for, what the job was, when, how much, paid or not. */
function EarningRowView({ row, onOpen }: { row: EarningRow; onOpen: (bookingId: string) => void }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const service = row.subCategoryId ? findSubCategory(row.subCategoryId) : undefined;
  const name = row.customer?.name ?? '—';
  const bookingId = row.entry.bookingId;

  const content = (
    <>
      <Avatar name={name} />
      <View className="ml-3 flex-1">
        <Text weight="semibold" className="text-sm text-worker-ink" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-xs text-worker-muted" numberOfLines={1}>
          {[service ? localizedName(service, language) : undefined, formatDayMonth(row.entry.createdAt, t)]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <View className="ml-2 items-end gap-1">
        <Text weight="bold" className="text-sm text-worker-ink">
          {formatPaise(row.entry.amount, language)}
        </Text>
        <StatusBadge
          label={row.settled ? t('worker.earnings.paid') : t('worker.earnings.pendingBadge')}
          tone={row.settled ? 'success' : 'warning'}
        />
      </View>
    </>
  );

  return bookingId ? (
    <Pressable
      className="min-h-14 flex-row items-center border-b border-worker-border py-2"
      onPress={() => onOpen(bookingId)}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${formatPaise(row.entry.amount, language)}`}
    >
      {content}
    </Pressable>
  ) : (
    <View className="min-h-14 flex-row items-center border-b border-worker-border py-2">{content}</View>
  );
}
