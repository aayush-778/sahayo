import { Stack } from 'expo-router';
import { useThemeColors } from '@sahayo/ui-native';

/**
 * The onboarding stack, steps 2–5.
 *
 * No shared header here: each step draws its own inside OnboardingScreen, so
 * the progress bar scrolls with the form instead of permanently taking a
 * quarter of a small screen. Steps replace one another in both directions, so
 * a fade — not a push that always slides the same way — is the honest motion.
 */
export default function OnboardingLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.ground } }}
    />
  );
}
