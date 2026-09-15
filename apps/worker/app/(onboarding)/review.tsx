import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { CheckRow } from '../../src/components/CheckRow';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import {
  submitForReview,
  useOnboardingCompletion,
  useWorkerProfile,
  type OnboardingSection,
} from '../../src/services';

const SECTIONS: { key: OnboardingSection; icon: ComponentProps<typeof Ionicons>['name']; route: Href }[] = [
  { key: 'personal', icon: 'person-outline', route: '/signup' },
  { key: 'service', icon: 'briefcase-outline', route: '/service-details' },
  { key: 'documents', icon: 'document-text-outline', route: '/documents' },
  { key: 'availability', icon: 'time-outline', route: '/availability' },
];

/**
 * Step 5 of 5 — completion status, the declaration, and submit.
 *
 * Each section row opens its step, so anything incomplete or wrong is one tap
 * away. Submitting ends onboarding, and the root layout's gate moves the
 * partner to the tabs, where the dashboard shows the pending-approval state.
 */
export default function ReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const profile = useWorkerProfile();
  const completion = useOnboardingCompletion();

  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const allComplete = completion.done === completion.total;
  // Hindi first-person verbs carry gender: करती for a woman, करता for a man.
  const context = profile.gender === 'female' || profile.gender === 'male' ? profile.gender : undefined;

  async function submit() {
    setSubmitted(true);
    if (!confirmed || !allComplete) return;
    setBusy(true);
    await submitForReview(true);
    setBusy(false);
  }

  return (
    <OnboardingScreen
      step={5}
      onPrevious={() => router.replace('/availability')}
      onNext={() => void submit()}
      nextLabel={t('worker.onboarding.submit')}
      nextLoading={busy}
    >
      <View className="mt-6 rounded-2xl border border-worker-border bg-worker-surface px-4 pb-4 pt-3">
        <Text weight="bold" className="py-2 text-lg text-worker-ink" accessibilityRole="header">
          {t('worker.onboarding.review.statusHeading')}
        </Text>

        {SECTIONS.map((section) => {
          const done = completion[section.key];
          const label = t(`worker.onboarding.review.sections.${section.key}`);
          const state = done ? t('worker.onboarding.review.complete') : t('worker.onboarding.review.incomplete');
          return (
            <Pressable
              key={section.key}
              className="min-h-14 flex-row items-center border-b border-worker-border py-3"
              onPress={() => router.replace(section.route)}
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${state}`}
              accessibilityHint={t('worker.onboarding.review.editHint')}
            >
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-worker-primary-tint">
                <Ionicons name={section.icon} size={18} color={colors.primary} />
              </View>
              <View className="ml-3 flex-1">
                <Text weight="semibold" className="text-base text-worker-ink">
                  {label}
                </Text>
                {done ? null : <Text className="text-sm text-worker-warning">{state}</Text>}
              </View>
              <Ionicons
                name={done ? 'checkmark-circle' : 'alert-circle'}
                size={22}
                color={done ? colors.success : colors.warning}
              />
              <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 4 }} />
            </Pressable>
          );
        })}

        <View className="flex-row flex-wrap items-center justify-between gap-2 pt-4">
          <Text weight="bold" className="text-base text-worker-ink">
            {t('worker.onboarding.review.overall')}
          </Text>
          <Text weight="bold" className={`text-base ${allComplete ? 'text-worker-success' : 'text-worker-warning'}`}>
            {t('worker.onboarding.review.overallValue', { done: completion.done, total: completion.total })}
          </Text>
        </View>
      </View>
      {submitted && !allComplete ? (
        <Text className="mt-2 text-sm text-worker-danger">{t('worker.onboarding.review.errors.incomplete')}</Text>
      ) : null}

      <View
        className={`mt-5 rounded-2xl border-2 bg-worker-surface px-4 py-2 ${
          submitted && !confirmed ? 'border-worker-danger' : 'border-worker-outline'
        }`}
      >
        <CheckRow
          label={t('worker.onboarding.review.confirm', { context })}
          checked={confirmed}
          onToggle={() => setConfirmed((value) => !value)}
        >
          <Text className="mt-1 text-sm text-worker-muted">{t('worker.onboarding.review.confirmNote')}</Text>
        </CheckRow>
      </View>
      {submitted && !confirmed ? (
        <Text className="mt-2 text-sm text-worker-danger">{t('worker.onboarding.review.errors.confirmRequired')}</Text>
      ) : null}
    </OnboardingScreen>
  );
}
