import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COOP_FUND_SHARE } from '@sahayo/shared';
import { Avatar, Text, useThemeColors } from '@sahayo/ui-native';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { callPhone, getCoordinator, useLanguage } from '../../src/services';

const FAQS = ['paid', 'fund', 'rating', 'language', 'safety'] as const;

/**
 * Help — a person first, then answers.
 *
 * The coordinator's name, hours and a call button come before any FAQ: someone
 * stuck on a job wants a human, not a search box. The questions below are the
 * ones workers actually ask — when they get paid, why 5% goes to the fund,
 * whether a bad rating stops work, and what to do if they feel unsafe.
 */
export default function HelpScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const language = useLanguage();
  const coordinator = getCoordinator();
  const [open, setOpen] = useState<(typeof FAQS)[number] | null>(null);
  const [callFailed, setCallFailed] = useState(false);

  async function call() {
    setCallFailed(false);
    if (!(await callPhone(coordinator.phone))) setCallFailed(true);
  }

  return (
    <View className="flex-1 bg-worker-ground">
      <ScreenHeader title={t('worker.profile.help.title')} fallback="/profile" />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        <View className="w-full max-w-xl gap-3 self-center px-5">
          <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
            <Text className="text-xs text-worker-muted">{t('worker.profile.help.coordinatorTitle')}</Text>
            <View className="mt-2 flex-row items-center">
              <Avatar name={coordinator.name} />
              <View className="ml-3 flex-1">
                <Text weight="semibold" className="text-base text-worker-ink">
                  {coordinator.name}
                </Text>
                <Text className="text-xs text-worker-muted">{coordinator.hours[language]}</Text>
              </View>
            </View>
            <Pressable
              className="mt-3 h-12 flex-row items-center justify-center rounded-xl bg-worker-primary"
              onPress={() => void call()}
              accessibilityRole="button"
              accessibilityLabel={t('worker.profile.help.call', { name: coordinator.name })}
            >
              <Ionicons name="call" size={18} color={colors.onPrimary} />
              <Text weight="semibold" className="ml-2 text-sm text-white">
                {t('worker.profile.help.call', { name: coordinator.name })}
              </Text>
            </Pressable>
            {callFailed ? (
              <Text className="mt-2 text-sm text-worker-danger">{t('worker.job.customer.openFailed')}</Text>
            ) : null}
            <View className="mt-3 flex-row">
              <Ionicons name="business-outline" size={16} color={colors.muted} style={{ marginTop: 2 }} />
              <View className="ml-2 flex-1">
                <Text weight="semibold" className="text-xs text-worker-muted">
                  {t('worker.profile.help.office')}
                </Text>
                <Text className="text-sm text-worker-ink">{coordinator.office[language]}</Text>
              </View>
            </View>
          </View>

          <Text weight="bold" className="mt-2 text-lg text-worker-ink" accessibilityRole="header">
            {t('worker.profile.help.faqTitle')}
          </Text>
          <View className="overflow-hidden rounded-2xl border border-worker-border bg-worker-surface">
            {FAQS.map((key, index) => {
              const expanded = open === key;
              return (
                <View key={key} className={index < FAQS.length - 1 ? 'border-b border-worker-border' : ''}>
                  <Pressable
                    className="min-h-14 flex-row items-center px-4 py-3"
                    onPress={() => setOpen(expanded ? null : key)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityLabel={t(`worker.profile.help.faqs.${key}.q`, { pct: Math.round(COOP_FUND_SHARE * 100) })}
                  >
                    <Text weight="semibold" className="flex-1 text-sm text-worker-ink">
                      {t(`worker.profile.help.faqs.${key}.q`, { pct: Math.round(COOP_FUND_SHARE * 100) })}
                    </Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
                  </Pressable>
                  {expanded ? (
                    <Text className="px-4 pb-4 text-sm text-worker-muted">{t(`worker.profile.help.faqs.${key}.a`)}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
