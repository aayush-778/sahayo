import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPaise, FormField, PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { ActionBar } from '../../src/components/ActionBar';
import { AvailabilityCard } from '../../src/components/AvailabilityCard';
import { CheckRow } from '../../src/components/CheckRow';
import { RangeSlider } from '../../src/components/RangeSlider';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SelectField } from '../../src/components/SelectField';
import { formatTimeOfDay } from '../../src/lib/datetime';
import {
  BASE_RATE_MAX_RUPEES,
  BASE_RATE_MIN_RUPEES,
  BASE_RATE_STEP_RUPEES,
  digitsOnly,
  saveAvailability,
  SERVICE_RADIUS_MAX_KM,
  SERVICE_RADIUS_MIN_KM,
  setAvailability,
  setServiceRadius,
  TIME_OPTIONS,
  useLanguage,
  useWorkerProfile,
} from '../../src/services';
import { WEEKDAYS, type Weekday } from '../../src/types';

/**
 * Work area and availability — the same settings the dashboard uses.
 *
 * The online switch and the radius apply the moment they change: the switch is
 * the dashboard's own card, and moving the slider changes which jobs are
 * offered straight away. Working hours, days and rate are saved together,
 * because a half-changed schedule is not one to dispatch against.
 */
export default function WorkAreaScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const language = useLanguage();
  const profile = useWorkerProfile();

  const [toggling, setToggling] = useState(false);
  const [start, setStart] = useState<string | null>(profile.workingHours?.start ?? null);
  const [end, setEnd] = useState<string | null>(profile.workingHours?.end ?? null);
  const [days, setDays] = useState<Weekday[]>(profile.workingDays);
  const [rate, setRate] = useState(profile.baseRatePaise === null ? '' : String(Math.round(profile.baseRatePaise / 100)));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const changeRadius = useCallback((km: number) => void setServiceRadius(km), []);
  const minRate = formatPaise(BASE_RATE_MIN_RUPEES * 100, language);
  const maxRate = formatPaise(BASE_RATE_MAX_RUPEES * 100, language);
  const timeOptions = TIME_OPTIONS.map((time) => ({ value: time, label: formatTimeOfDay(time, t) }));

  async function toggle() {
    setToggling(true);
    await setAvailability(!profile.isAvailable);
    setToggling(false);
  }

  async function save() {
    setMessage(null);
    if (!start || !end) {
      setMessage({ ok: false, text: t('worker.onboarding.availability.errors.hoursRequired') });
      return;
    }
    setBusy(true);
    const result = await saveAvailability({
      workingHours: { start, end },
      workingDays: days,
      baseRatePaise: (Number(rate) || 0) * 100,
    });
    setBusy(false);
    if (result.ok) {
      setMessage({ ok: true, text: t('worker.profile.availability.saved') });
      return;
    }
    const text =
      result.reason === 'invalid_hours'
        ? t('worker.onboarding.availability.errors.endAfterStart')
        : result.reason === 'no_days'
          ? t('worker.onboarding.availability.errors.daysRequired')
          : t('worker.onboarding.availability.errors.rateRange', { min: minRate, max: maxRate });
    setMessage({ ok: false, text });
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-worker-ground" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('worker.profile.availability.title')} fallback="/profile" />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-xl gap-4 self-center px-5">
          {profile.isApproved ? (
            <AvailabilityCard
              isAvailable={profile.isAvailable}
              radiusKm={profile.serviceRadiusKm}
              busy={toggling}
              onToggle={() => void toggle()}
            />
          ) : (
            <View className="rounded-2xl bg-worker-warning-soft p-4">
              <Text className="text-sm text-worker-ink">{t('worker.profile.availability.approvalNote')}</Text>
            </View>
          )}

          <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
            <RangeSlider
              label={t('worker.onboarding.service.radius')}
              value={profile.serviceRadiusKm}
              min={SERVICE_RADIUS_MIN_KM}
              max={SERVICE_RADIUS_MAX_KM}
              onChange={changeRadius}
              formatValue={(n) => t('worker.onboarding.service.km', { n })}
            />
            <Text className="mt-2 text-xs text-worker-muted">{t('worker.profile.availability.radiusHint')}</Text>
          </View>

          <Text weight="bold" className="text-base text-worker-ink" accessibilityRole="header">
            {t('worker.profile.availability.scheduleTitle')}
          </Text>
          <View className="flex-row flex-wrap gap-3">
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

          <View className="rounded-2xl border border-worker-border bg-worker-surface px-4 py-1">
            {WEEKDAYS.map((day) => (
              <CheckRow
                key={day}
                label={t(`worker.onboarding.weekdays.${day}`)}
                checked={days.includes(day)}
                onToggle={() =>
                  setDays((current) =>
                    current.includes(day) ? current.filter((entry) => entry !== day) : WEEKDAYS.filter((d) => d === day || current.includes(d)),
                  )
                }
              />
            ))}
          </View>

          <FormField
            label={t('worker.onboarding.availability.rate')}
            prefix={
              <Text weight="semibold" className="text-base text-worker-ink">
                ₹
              </Text>
            }
            value={rate}
            onChangeText={(value) => setRate(digitsOnly(value, 5))}
            keyboardType="number-pad"
            maxLength={5}
            accessory={
              <View className="flex-row items-center gap-2">
                {[-BASE_RATE_STEP_RUPEES, BASE_RATE_STEP_RUPEES].map((delta) => (
                  <Pressable
                    key={delta}
                    className="h-12 w-12 items-center justify-center rounded-lg bg-worker-primary-tint"
                    onPress={() =>
                      setRate(String(Math.min(BASE_RATE_MAX_RUPEES, Math.max(BASE_RATE_MIN_RUPEES, (Number(rate) || 0) + delta))))
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      delta < 0 ? t('worker.onboarding.availability.decrease') : t('worker.onboarding.availability.increase')
                    }
                  >
                    <Ionicons name={delta < 0 ? 'remove' : 'add'} size={20} color={colors.primary} />
                  </Pressable>
                ))}
              </View>
            }
          />
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
        <PrimaryButton label={t('worker.profile.availability.save')} loading={busy} onPress={() => void save()} />
      </ActionBar>
    </KeyboardAvoidingView>
  );
}
