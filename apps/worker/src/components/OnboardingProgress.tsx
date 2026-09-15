import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Text } from '@sahayo/ui-native';

import { ONBOARDING_STEPS } from '../services';

/**
 * The title, the step, and the progress bar.
 *
 * Drawn by every one of the five steps through OnboardingScreen, so they carry
 * one header that cannot drift between them. Step 1 passes its own title
 * ("Create Account"); steps 2–5 use "Complete Your Profile". The step count
 * comes from ONBOARDING_STEPS, so the percentage follows if the flow ever
 * changes length.
 */
export function OnboardingProgress({ step, title }: { step: number; title?: string }) {
  const { t } = useTranslation();
  const current = Math.min(Math.max(step, 1), ONBOARDING_STEPS);
  const percent = Math.round((current / ONBOARDING_STEPS) * 100);

  return (
    <View>
      <Text weight="bold" className="text-center text-xl text-worker-ink" accessibilityRole="header">
        {title ?? t('worker.onboarding.title')}
      </Text>
      <Text className="mt-1 text-center text-sm text-worker-muted">{t('worker.onboarding.subtitle')}</Text>

      <Text weight="semibold" className="mt-4 text-sm text-worker-ink">
        {t('worker.onboarding.stepOf', { step: current, total: ONBOARDING_STEPS })}
      </Text>
      <View
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-worker-primary-soft"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
      >
        {/* A computed width is the one thing a className cannot express. */}
        <View className="h-full rounded-full bg-worker-primary" style={{ width: `${percent}%` }} />
      </View>
      <Text weight="semibold" className="mt-1 self-end text-sm text-worker-primary">
        {t('worker.onboarding.percent', { n: percent })}
      </Text>
    </View>
  );
}
