import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, formatPaise, PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { LanguageToggle } from '../../src/components/LanguageToggle';
import { SettingsGroup, SettingsRow } from '../../src/components/SettingsRow';
import { DemoToolsSheet } from '../../src/components/DemoToolsSheet';
import { Sheet } from '../../src/components/Sheet';
import { StatusBadge } from '../../src/components/StatusBadge';
import {
  cityName,
  DEMO_TOOLS_ENABLED,
  findWorkerType,
  localizedName,
  signOut,
  useFundOverview,
  useLanguage,
  useRatingSummary,
  useTodayOverview,
  useWorkerProfile,
} from '../../src/services';
import { DOCUMENT_KINDS } from '../../src/types';

/**
 * Profile — who the partner is to the cooperative, and every setting.
 *
 * The header answers "how do customers and the cooperative see me": name,
 * trade, verification, rating, jobs done, city. Under it, the one live switch
 * a worker changes often — online and work area — then the menu. Every row
 * shows its current state, so most questions are answered without opening
 * anything, and a document needing attention is flagged in red before it is
 * tapped.
 */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const language = useLanguage();
  const profile = useWorkerProfile();
  const rating = useRatingSummary();
  const overview = useTodayOverview();
  const fund = useFundOverview();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  const trade = profile.primaryCategory ? findWorkerType(profile.primaryCategory) : undefined;
  const needsAttention = DOCUMENT_KINDS.filter(
    (kind) => profile.documents[kind] === 'rejected' || profile.documents[kind] === 'missing',
  ).length;
  const beingChecked = DOCUMENT_KINDS.some((kind) => profile.documents[kind] === 'uploaded');
  const documentsLine = needsAttention
    ? t('worker.profile.rows.documentsNeedAttention', { n: needsAttention })
    : beingChecked
      ? t('worker.profile.rows.documentsUnderReview')
      : t('worker.profile.rows.documentsAllVerified');
  const serviceCount = profile.subCategories.length + (profile.otherService ? 1 : 0);

  return (
    <View className="flex-1 bg-worker-ground">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}>
        <View className="w-full max-w-xl gap-3 self-center px-5">
          <View className="flex-row items-center">
            <Text weight="bold" className="flex-1 text-2xl text-worker-ink" accessibilityRole="header">
              {t('worker.profile.title')}
            </Text>
            <LanguageToggle />
          </View>

          {/* Header */}
          <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
            <View className="flex-row items-center">
              <Avatar name={profile.name || '—'} size="lg" />
              <View className="ml-3 flex-1">
                <Text weight="bold" className="text-lg text-worker-primary" numberOfLines={1}>
                  {profile.name || '—'}
                </Text>
                <Text className="text-sm text-worker-ink">{trade ? localizedName(trade, language) : '—'}</Text>
                <View className="mt-0.5 flex-row items-center">
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text weight="semibold" className="ml-1 text-xs text-worker-ink">
                    {rating.count ? rating.average.toFixed(1) : '—'}
                  </Text>
                  <Text className="ml-1 text-xs text-worker-muted">
                    {t('worker.profile.header.jobs', { n: overview.totalCompleted })}
                  </Text>
                </View>
                <View className="mt-0.5 flex-row items-center">
                  <Ionicons name="location-outline" size={14} color={colors.muted} />
                  <Text className="ml-1 text-xs text-worker-muted">
                    {profile.city ? cityName(profile.city, language) : '—'}
                  </Text>
                </View>
              </View>
              <Pressable
                className="h-12 w-12 items-center justify-center self-start"
                onPress={() => router.push('/profile/edit')}
                accessibilityRole="button"
                accessibilityLabel={t('worker.profile.header.edit')}
              >
                <Ionicons name="create-outline" size={22} color={colors.primary} />
              </Pressable>
            </View>
            <View className="mt-2 flex-row">
              <StatusBadge
                label={profile.isApproved ? t('worker.profile.header.verified') : t('worker.profile.header.pending')}
                tone={profile.isApproved ? 'success' : 'warning'}
              />
            </View>
          </View>

          {/* Availability and work area */}
          <Pressable
            className="flex-row items-center rounded-2xl border border-worker-border bg-worker-surface px-4 py-3"
            onPress={() => router.push('/profile/availability')}
            accessibilityRole="button"
            accessibilityLabel={`${profile.isAvailable ? t('worker.profile.state.online') : t('worker.profile.state.offline')}. ${t('worker.profile.state.radius', { km: profile.serviceRadiusKm })}`}
          >
            <View className={`h-3 w-3 rounded-full ${profile.isAvailable ? 'bg-worker-success' : 'bg-worker-muted'}`} />
            <Text weight="semibold" className="ml-2 text-sm text-worker-ink">
              {profile.isAvailable ? t('worker.profile.state.online') : t('worker.profile.state.offline')}
            </Text>
            <Text className="ml-2 flex-1 text-sm text-worker-muted" numberOfLines={1}>
              {`· ${t('worker.profile.state.radius', { km: profile.serviceRadiusKm })}`}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>

          <Text weight="semibold" className="mt-2 text-xs text-worker-muted">
            {t('worker.profile.sections.work')}
          </Text>
          <SettingsGroup>
            <SettingsRow
              icon="document-text-outline"
              title={t('worker.profile.rows.documents')}
              subtitle={documentsLine}
              attention={needsAttention > 0}
              onPress={() => router.push('/profile/documents')}
            />
            <SettingsRow
              icon="construct-outline"
              title={t('worker.profile.rows.services')}
              subtitle={t('worker.profile.rows.servicesSub', {
                category: trade ? localizedName(trade, language) : '—',
                n: serviceCount,
              })}
              onPress={() => router.push('/profile/services')}
            />
            <SettingsRow
              icon="navigate-circle-outline"
              title={t('worker.profile.rows.availability')}
              subtitle={t('worker.profile.state.radius', { km: profile.serviceRadiusKm })}
              onPress={() => router.push('/profile/availability')}
            />
            <SettingsRow
              icon="star-outline"
              title={t('worker.profile.rows.ratings')}
              subtitle={
                rating.count
                  ? t('worker.profile.rows.ratingsSub', { avg: rating.average.toFixed(1), n: rating.count })
                  : t('worker.profile.rows.ratingsEmpty')
              }
              onPress={() => router.push('/profile/ratings')}
            />
            <SettingsRow
              icon="wallet-outline"
              title={t('worker.profile.rows.payout')}
              subtitle={profile.upiId ? t('worker.profile.rows.payoutSub', { upi: profile.upiId }) : t('worker.profile.rows.payoutMissing')}
              attention={!profile.upiId}
              last
              onPress={() => router.push('/profile/payout')}
            />
          </SettingsGroup>

          <Text weight="semibold" className="mt-2 text-xs text-worker-muted">
            {t('worker.profile.sections.app')}
          </Text>
          <SettingsGroup>
            <SettingsRow
              icon="language-outline"
              title={t('worker.profile.rows.language')}
              subtitle={t(`common.languages.${language}`)}
              onPress={() => router.push('/profile/language')}
            />
            <SettingsRow
              icon="people-outline"
              title={t('worker.profile.rows.coop')}
              subtitle={t('worker.profile.rows.coopSub', { amount: formatPaise(fund.balance, language) })}
              onPress={() => router.push('/coop')}
            />
            <SettingsRow
              icon="help-circle-outline"
              title={t('worker.profile.rows.help')}
              subtitle={t('worker.profile.rows.helpSub')}
              last
              onPress={() => router.push('/profile/help')}
            />
          </SettingsGroup>

          {DEMO_TOOLS_ENABLED ? (
            <SettingsGroup>
              <SettingsRow
                icon="construct-outline"
                title={t('worker.demo.title')}
                subtitle={t('worker.demo.note')}
                last
                onPress={() => setDemoOpen(true)}
              />
            </SettingsGroup>
          ) : null}

          <Pressable
            className="mt-2 h-12 flex-row items-center justify-center rounded-xl border-2 border-worker-danger bg-worker-surface"
            onPress={() => setLogoutOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('worker.profile.logout.button')}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text weight="semibold" className="ml-2 text-sm text-worker-danger">
              {t('worker.profile.logout.button')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <DemoToolsSheet visible={demoOpen} onClose={() => setDemoOpen(false)} />

      <Sheet
        visible={logoutOpen}
        title={t('worker.profile.logout.title')}
        onClose={() => setLogoutOpen(false)}
        footer={
          <View className="gap-2">
            <PrimaryButton label={t('worker.profile.logout.cancel')} onPress={() => setLogoutOpen(false)} />
            <Pressable
              className="h-12 items-center justify-center rounded-xl border-2 border-worker-danger"
              onPress={() => {
                setLogoutOpen(false);
                void signOut();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('worker.profile.logout.confirm')}
            >
              <Text weight="semibold" className="text-base text-worker-danger">
                {t('worker.profile.logout.confirm')}
              </Text>
            </Pressable>
          </View>
        }
      >
        <Text className="px-5 pt-3 text-base text-worker-ink">{t('worker.profile.logout.body')}</Text>
      </Sheet>
    </View>
  );
}
