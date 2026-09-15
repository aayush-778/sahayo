import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatPaise, FormField, Text, useThemeColors } from '@sahayo/ui-native';

import { CheckRow } from '../../src/components/CheckRow';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { SelectField } from '../../src/components/SelectField';
import {
  BASE_RATE_MAX_RUPEES,
  BASE_RATE_MIN_RUPEES,
  BASE_RATE_STEP_RUPEES,
  clockParts,
  digitsOnly,
  minutesOf,
  saveAvailability,
  TIME_OPTIONS,
  useLanguage,
  useWorkerProfile,
} from '../../src/services';
import { WEEKDAYS, type Weekday } from '../../src/types';

/**
 * Step 4 of 5 — working hours, working days and the base service rate.
 *
 * The rate is typed in whole rupees, the way a worker thinks of a charge, and
 * becomes integer paise only when saved. The − and + buttons move it by ₹50 so
 * it can be set without the keyboard.
 */
export default function AvailabilityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const language = useLanguage();
  const profile = useWorkerProfile();

  const [start, setStart] = useState<string | null>(profile.workingHours?.start ?? null);
  const [end, setEnd] = useState<string | null>(profile.workingHours?.end ?? null);
  const [days, setDays] = useState<Weekday[]>(profile.workingDays);
  const [rate, setRate] = useState(profile.baseRatePaise === null ? '' : String(Math.round(profile.baseRatePaise / 100)));
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const rupees = Number(rate);
  const minRate = formatPaise(BASE_RATE_MIN_RUPEES * 100, language);
  const maxRate = formatPaise(BASE_RATE_MAX_RUPEES * 100, language);

  const errors = {
    hours:
      !start || !end
        ? t('worker.onboarding.availability.errors.hoursRequired')
        : minutesOf(end) <= minutesOf(start)
          ? t('worker.onboarding.availability.errors.endAfterStart')
          : undefined,
    days: days.length === 0 ? t('worker.onboarding.availability.errors.daysRequired') : undefined,
    rate:
      !rate || rupees < BASE_RATE_MIN_RUPEES || rupees > BASE_RATE_MAX_RUPEES
        ? t('worker.onboarding.availability.errors.rateRange', { min: minRate, max: maxRate })
        : undefined,
  };
  const valid = Object.values(errors).every((message) => !message);

  const clock = (time: string) => {
    const parts = clockParts(time);
    return t('worker.onboarding.availability.clock', {
      hour: parts.hour,
      minute: parts.minute,
      period: t(`worker.onboarding.availability.periods.${parts.period}`),
    });
  };
  const timeOptions = TIME_OPTIONS.map((time) => ({ value: time, label: clock(time) }));

  function toggleDay(day: Weekday) {
    setDays((current) =>
      current.includes(day) ? current.filter((entry) => entry !== day) : WEEKDAYS.filter((d) => d === day || current.includes(d)),
    );
  }

  function stepRate(delta: number) {
    const next = Math.min(BASE_RATE_MAX_RUPEES, Math.max(BASE_RATE_MIN_RUPEES, (Number(rate) || 0) + delta));
    setRate(String(next));
  }

  async function next() {
    setSubmitted(true);
    if (!valid || !start || !end) return;
    setBusy(true);
    const result = await saveAvailability({
      workingHours: { start, end },
      workingDays: days,
      baseRatePaise: rupees * 100,
    });
    setBusy(false);
    if (result.ok) router.replace('/review');
  }

  return (
    <OnboardingScreen
      step={4}
      heading={t('worker.onboarding.availability.heading')}
      onPrevious={() => router.replace('/documents')}
      onNext={() => void next()}
      nextLoading={busy}
    >
      <Text weight="semibold" className="mt-4 text-base text-worker-ink">
        {t('worker.onboarding.availability.hours')}
      </Text>
      <View className="mt-1 flex-row flex-wrap gap-3">
        <SelectField
          className="min-w-[140px] flex-1"
          label={t('worker.onboarding.availability.start')}
          placeholder={t('worker.onboarding.availability.selectTime')}
          sheetTitle={t('worker.onboarding.availability.start')}
          value={start}
          options={timeOptions}
          onChange={setStart}
        />
        <SelectField
          className="min-w-[140px] flex-1"
          label={t('worker.onboarding.availability.end')}
          placeholder={t('worker.onboarding.availability.selectTime')}
          sheetTitle={t('worker.onboarding.availability.end')}
          value={end}
          options={timeOptions}
          onChange={setEnd}
        />
      </View>
      {submitted && errors.hours ? <Text className="mt-2 text-sm text-worker-danger">{errors.hours}</Text> : null}

      <Text weight="bold" className="mt-7 text-lg text-worker-ink" accessibilityRole="header">
        {t('worker.onboarding.availability.days')}
      </Text>
      <View
        className={`mt-3 rounded-2xl border bg-worker-surface px-4 py-1 ${
          submitted && errors.days ? 'border-worker-danger' : 'border-worker-border'
        }`}
      >
        {WEEKDAYS.map((day) => (
          <CheckRow
            key={day}
            label={t(`worker.onboarding.weekdays.${day}`)}
            checked={days.includes(day)}
            onToggle={() => toggleDay(day)}
          />
        ))}
      </View>
      {submitted && errors.days ? <Text className="mt-2 text-sm text-worker-danger">{errors.days}</Text> : null}

      <FormField
        containerClassName="mt-7"
        label={t('worker.onboarding.availability.rate')}
        placeholder={String(BASE_RATE_MIN_RUPEES * 10)}
        prefix={
          <Text weight="semibold" className="text-base text-worker-ink">
            ₹
          </Text>
        }
        value={rate}
        onChangeText={(value) => setRate(digitsOnly(value, 5))}
        keyboardType="number-pad"
        maxLength={5}
        error={submitted ? errors.rate : undefined}
        accessory={
          <View className="flex-row items-center gap-2">
            <Pressable
              className="h-12 w-12 items-center justify-center rounded-lg bg-worker-primary-tint"
              onPress={() => stepRate(-BASE_RATE_STEP_RUPEES)}
              accessibilityRole="button"
              accessibilityLabel={t('worker.onboarding.availability.decrease')}
            >
              <Ionicons name="remove" size={20} color={colors.primary} />
            </Pressable>
            <Pressable
              className="h-12 w-12 items-center justify-center rounded-lg bg-worker-primary-tint"
              onPress={() => stepRate(BASE_RATE_STEP_RUPEES)}
              accessibilityRole="button"
              accessibilityLabel={t('worker.onboarding.availability.increase')}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </Pressable>
          </View>
        }
      />
      <Text className="mt-2 text-sm text-worker-muted">
        {t('worker.onboarding.availability.rateHint', { min: minRate, max: maxRate })}
      </Text>
    </OnboardingScreen>
  );
}
