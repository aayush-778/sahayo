import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Id } from '@sahayo/shared';
import { FormField, Text } from '@sahayo/ui-native';

import { CheckRow } from '../../src/components/CheckRow';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { RangeSlider } from '../../src/components/RangeSlider';
import { SelectField } from '../../src/components/SelectField';
import {
  clampRadius,
  EXPERIENCE_OPTIONS,
  getSubCategories,
  getWorkerTypes,
  localizedName,
  MAX_EXPERIENCE_YEARS,
  saveServiceDetails,
  SERVICE_RADIUS_MAX_KM,
  SERVICE_RADIUS_MIN_KM,
  useLanguage,
  useWorkerProfile,
} from '../../src/services';

/**
 * Step 2 of 5 — service details.
 *
 * The primary category and its sub-services come from the same catalogue the
 * customer app books against, so every service a partner ticks here is one a
 * customer can actually request. The sub-service list follows the category:
 * choosing a different category clears what was ticked under the old one.
 */
export default function ServiceDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useLanguage();
  const profile = useWorkerProfile();
  const saved = profile.primaryCategory !== null;

  const [years, setYears] = useState<number | null>(saved ? profile.yearsExperience : null);
  const [category, setCategory] = useState<Id | null>(profile.primaryCategory);
  const [subs, setSubs] = useState<Id[]>(profile.subCategories);
  const [otherOn, setOtherOn] = useState(profile.otherService !== '');
  const [other, setOther] = useState(profile.otherService);
  const [radius, setRadius] = useState(clampRadius(profile.serviceRadiusKm));
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const subOptions = useMemo(() => (category ? getSubCategories(category) : []), [category]);

  const errors = {
    years: years === null ? t('worker.onboarding.service.errors.experienceRequired') : undefined,
    category: category ? undefined : t('worker.onboarding.service.errors.categoryRequired'),
    subs: category && subs.length === 0 && !otherOn ? t('worker.onboarding.service.errors.subRequired') : undefined,
    other: otherOn && other.trim().length < 3 ? t('worker.onboarding.service.errors.otherRequired') : undefined,
  };
  const valid = Object.values(errors).every((message) => !message);

  const experienceLabel = (n: number) =>
    n === 0
      ? t('worker.onboarding.service.experienceLessThanOne')
      : n === 1
        ? t('worker.onboarding.service.experienceOne')
        : n === MAX_EXPERIENCE_YEARS
          ? t('worker.onboarding.service.experienceMax', { n })
          : t('worker.onboarding.service.experienceMany', { n });

  const kilometres = (n: number) => t('worker.onboarding.service.km', { n });

  function toggle(id: Id) {
    setSubs((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  async function next() {
    setSubmitted(true);
    if (!valid || years === null || !category) return;
    setBusy(true);
    const result = await saveServiceDetails({
      yearsExperience: years,
      primaryCategory: category,
      subCategories: subs,
      otherService: otherOn ? other : '',
      serviceRadiusKm: radius,
    });
    setBusy(false);
    if (result.ok) router.replace('/documents');
  }

  return (
    <OnboardingScreen
      step={2}
      heading={t('worker.onboarding.service.heading')}
      onPrevious={() => router.replace('/signup')}
      onNext={() => void next()}
      nextLoading={busy}
    >
      <SelectField
        className="mt-4"
        label={t('worker.onboarding.service.experience')}
        placeholder={t('worker.onboarding.service.experiencePlaceholder')}
        sheetTitle={t('worker.onboarding.service.experience')}
        value={years === null ? null : String(years)}
        options={EXPERIENCE_OPTIONS.map((n) => ({ value: String(n), label: experienceLabel(n) }))}
        onChange={(value) => setYears(Number(value))}
        error={submitted ? errors.years : undefined}
      />

      <SelectField
        className="mt-5"
        label={t('worker.onboarding.service.category')}
        placeholder={t('worker.onboarding.service.categoryPlaceholder')}
        sheetTitle={t('worker.onboarding.service.category')}
        value={category}
        options={getWorkerTypes().map((entry) => ({ value: entry.id, label: localizedName(entry, language) }))}
        onChange={(value) => {
          if (value !== category) setSubs([]);
          setCategory(value);
        }}
        error={submitted ? errors.category : undefined}
      />

      <Text weight="bold" className="mt-7 text-lg text-worker-ink" accessibilityRole="header">
        {t('worker.onboarding.service.subHeading')}
      </Text>

      {category ? (
        <>
          <Text className="mt-1 text-sm text-worker-muted">{t('worker.onboarding.service.subHint')}</Text>
          <View
            className={`mt-3 rounded-2xl border bg-worker-surface px-4 py-1 ${
              submitted && errors.subs ? 'border-worker-danger' : 'border-worker-border'
            }`}
          >
            {subOptions.map((entry) => (
              <CheckRow
                key={entry.id}
                label={localizedName(entry, language)}
                checked={subs.includes(entry.id)}
                onToggle={() => toggle(entry.id)}
              />
            ))}
            <CheckRow label={t('worker.onboarding.service.other')} checked={otherOn} onToggle={() => setOtherOn((on) => !on)} />
            {otherOn ? (
              <FormField
                containerClassName="mb-3"
                label={t('worker.onboarding.service.otherLabel')}
                placeholder={t('worker.onboarding.service.otherPlaceholder')}
                value={other}
                onChangeText={setOther}
                maxLength={120}
                error={submitted ? errors.other : undefined}
              />
            ) : null}
          </View>
          {submitted && errors.subs ? <Text className="mt-2 text-sm text-worker-danger">{errors.subs}</Text> : null}
        </>
      ) : (
        <View className="mt-3 rounded-2xl bg-worker-primary-tint px-4 py-4">
          <Text className="text-base text-worker-ink">{t('worker.onboarding.service.chooseCategoryFirst')}</Text>
        </View>
      )}

      <Text weight="bold" className="mt-7 text-lg text-worker-ink" accessibilityRole="header">
        {t('worker.onboarding.service.areaHeading')}
      </Text>
      <RangeSlider
        className="mt-3"
        label={t('worker.onboarding.service.radius')}
        value={radius}
        min={SERVICE_RADIUS_MIN_KM}
        max={SERVICE_RADIUS_MAX_KM}
        onChange={setRadius}
        formatValue={kilometres}
      />
      <Text className="mt-2 text-sm text-worker-muted">{t('worker.onboarding.service.radiusHint')}</Text>
    </OnboardingScreen>
  );
}
