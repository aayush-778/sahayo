import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Id } from '@sahayo/shared';
import { FormField, PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { ActionBar } from '../../src/components/ActionBar';
import { CheckRow } from '../../src/components/CheckRow';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SelectField } from '../../src/components/SelectField';
import {
  EXPERIENCE_OPTIONS,
  findWorkerType,
  getSubCategories,
  localizedName,
  MAX_EXPERIENCE_YEARS,
  saveServiceDetails,
  useLanguage,
  useWorkerProfile,
} from '../../src/services';

/**
 * Services offered — which jobs within the partner's trade they take.
 *
 * The trade itself is shown, not edited: the cooperative verified this partner
 * as, say, an electrician, and becoming a plumber means being verified again.
 * Within the trade, ticking and unticking services is the partner's call, and
 * new offers follow it at once.
 */
export default function ServicesScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const language = useLanguage();
  const profile = useWorkerProfile();
  const trade = profile.primaryCategory ? findWorkerType(profile.primaryCategory) : undefined;

  const [years, setYears] = useState(profile.yearsExperience);
  const [subs, setSubs] = useState<Id[]>(profile.subCategories);
  const [otherOn, setOtherOn] = useState(profile.otherService !== '');
  const [other, setOther] = useState(profile.otherService);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const options = useMemo(() => (profile.primaryCategory ? getSubCategories(profile.primaryCategory) : []), [profile.primaryCategory]);

  const experienceLabel = (n: number) =>
    n === 0
      ? t('worker.onboarding.service.experienceLessThanOne')
      : n === 1
        ? t('worker.onboarding.service.experienceOne')
        : n === MAX_EXPERIENCE_YEARS
          ? t('worker.onboarding.service.experienceMax', { n })
          : t('worker.onboarding.service.experienceMany', { n });

  async function save() {
    if (!profile.primaryCategory) return;
    setMessage(null);
    if (otherOn && other.trim().length < 3) {
      setMessage({ ok: false, text: t('worker.onboarding.service.errors.otherRequired') });
      return;
    }
    setBusy(true);
    const result = await saveServiceDetails({
      yearsExperience: years,
      primaryCategory: profile.primaryCategory,
      subCategories: subs,
      otherService: otherOn ? other : '',
      serviceRadiusKm: profile.serviceRadiusKm,
    });
    setBusy(false);
    setMessage(
      result.ok
        ? { ok: true, text: t('worker.profile.services.saved') }
        : { ok: false, text: t('worker.onboarding.service.errors.subRequired') },
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-worker-ground" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('worker.profile.services.title')} fallback="/profile" />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-xl gap-4 self-center px-5">
          <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
            <Text className="text-xs text-worker-muted">{t('worker.profile.services.trade')}</Text>
            <View className="mt-0.5 flex-row items-center">
              <Text weight="bold" className="flex-1 text-lg text-worker-ink">
                {trade ? localizedName(trade, language) : '—'}
              </Text>
              <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
            </View>
            <Text className="mt-1 text-xs text-worker-muted">{t('worker.profile.services.tradeNote')}</Text>
          </View>

          <SelectField
            label={t('worker.onboarding.service.experience')}
            placeholder={t('worker.onboarding.service.experiencePlaceholder')}
            sheetTitle={t('worker.onboarding.service.experience')}
            value={String(years)}
            options={EXPERIENCE_OPTIONS.map((n) => ({ value: String(n), label: experienceLabel(n) }))}
            onChange={(value) => {
              setYears(Number(value));
              setMessage(null);
            }}
          />

          <View>
            <Text weight="bold" className="text-base text-worker-ink" accessibilityRole="header">
              {t('worker.onboarding.service.subHeading')}
            </Text>
            <View className="mt-2 rounded-2xl border border-worker-border bg-worker-surface px-4 py-1">
              {options.map((entry) => (
                <CheckRow
                  key={entry.id}
                  label={localizedName(entry, language)}
                  checked={subs.includes(entry.id)}
                  onToggle={() => {
                    setMessage(null);
                    setSubs((current) =>
                      current.includes(entry.id) ? current.filter((id) => id !== entry.id) : [...current, entry.id],
                    );
                  }}
                />
              ))}
              <CheckRow
                label={t('worker.onboarding.service.other')}
                checked={otherOn}
                onToggle={() => setOtherOn((on) => !on)}
              />
              {otherOn ? (
                <FormField
                  containerClassName="mb-3"
                  label={t('worker.onboarding.service.otherLabel')}
                  placeholder={t('worker.onboarding.service.otherPlaceholder')}
                  value={other}
                  onChangeText={setOther}
                  maxLength={120}
                />
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>

      <ActionBar>
        {message ? (
          <Text
            className={`text-center text-sm ${message.ok ? 'text-worker-success' : 'text-worker-danger'}`}
            accessibilityLiveRegion="polite"
          >
            {message.text}
          </Text>
        ) : null}
        <PrimaryButton label={t('worker.profile.services.save')} loading={busy} onPress={() => void save()} />
      </ActionBar>
    </KeyboardAvoidingView>
  );
}
