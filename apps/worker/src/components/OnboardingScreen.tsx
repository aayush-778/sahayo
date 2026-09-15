import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { LanguageToggle } from './LanguageToggle';
import { OnboardingProgress } from './OnboardingProgress';

/**
 * The frame every registration step sits in: language toggle, progress header,
 * the step's form, and a Previous / Next bar pinned to the bottom.
 *
 * The bar is pinned rather than scrolled to because the app is used one-handed:
 * the way forward is always under the thumb, however long the form. Android's
 * back button does what Previous does, so the two can never disagree.
 *
 * Content is capped at a readable width and centred, so on a tablet or a phone
 * in landscape the form does not stretch into lines too long to scan.
 */
export function OnboardingScreen({
  step,
  title,
  heading,
  children,
  onPrevious,
  onNext,
  nextLabel,
  nextLoading = false,
}: {
  step: number;
  /** Replaces "Complete Your Profile" — step 1 is "Create Account". */
  title?: string;
  heading?: string;
  children: ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextLoading?: boolean;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        onPrevious();
        return true;
      });
      return () => subscription.remove();
    }, [onPrevious]),
  );

  return (
    <KeyboardAvoidingView className="flex-1 bg-worker-ground" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-xl self-center px-5">
          <View className="flex-row justify-end">
            <LanguageToggle />
          </View>

          <View className="mt-2">
            <OnboardingProgress step={step} title={title} />
          </View>

          {heading ? (
            <Text weight="bold" className="mt-6 text-xl text-worker-ink" accessibilityRole="header">
              {heading}
            </Text>
          ) : null}

          {children}
        </View>
      </ScrollView>

      <View className="border-t border-worker-border bg-worker-surface" style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="w-full max-w-xl flex-row gap-3 self-center px-5 pt-3">
          <Pressable
            className="h-14 flex-1 flex-row items-center justify-center rounded-xl border-2 border-worker-primary bg-worker-surface px-3"
            onPress={onPrevious}
            accessibilityRole="button"
            accessibilityLabel={t('worker.onboarding.previous')}
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text weight="semibold" className="ml-2 text-base text-worker-primary">
              {t('worker.onboarding.previous')}
            </Text>
          </Pressable>
          <PrimaryButton
            className="flex-[1.5] px-3"
            label={nextLabel ?? t('worker.onboarding.next')}
            loading={nextLoading}
            onPress={onNext}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
