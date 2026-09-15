import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FormField, PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { AuthHero } from '../../src/components/AuthHero';
import { DemoToolsSheet } from '../../src/components/DemoToolsSheet';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import {
  DEMO_TOOLS_ENABLED,
  digitsOnly,
  formatIndianMobile,
  isValidIndianMobile,
  MOBILE_DIGITS,
  MOCK_OTP,
  OTP_LENGTH,
  requestOtp,
  signIn,
  type OtpFailure,
} from '../../src/services';

const OTP_ERROR_KEY: Record<OtpFailure, string> = {
  invalid_mobile: 'worker.auth.errors.mobileInvalid',
  incomplete: 'worker.auth.errors.otpIncomplete',
  wrong_code: 'worker.auth.errors.otpInvalid',
};

/**
 * Login — mobile number, then a one-time code.
 *
 * Two stages on one screen rather than two screens: the number stays visible
 * above the code, so a worker can see which phone the code went to and change
 * it in one tap. A correct code signs the partner in, and the root layout's
 * gate moves them on; this screen never navigates on success itself.
 *
 * The language toggle sits top-right, above the greeting, so a Hindi-first
 * worker switches before reading a word of English.
 *
 * Laid out after the supplied reference: blue artwork band, a white card with
 * a rounded top overlapping it, a centred primary-blue greeting. The
 * reference's "Remember me", "Forgot password" and social sign-in are left
 * out — with a one-time code there is no password to forget, the session
 * already persists, and there is no social login to offer (no dead ends).
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeColors();

  const [mobile, setMobile] = useState('');
  const [stage, setStage] = useState<'mobile' | 'code'>('mobile');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  const mobileValid = isValidIndianMobile(mobile);
  const mobileError =
    mobile.length === MOBILE_DIGITS && !mobileValid ? t('worker.auth.errors.mobileInvalid') : undefined;

  async function sendCode() {
    setError(null);
    setBusy(true);
    const result = await requestOtp(mobile);
    setBusy(false);
    if (result.ok) {
      setOtp('');
      setStage('code');
    } else {
      setError(t('worker.auth.errors.mobileInvalid'));
    }
  }

  async function login() {
    setError(null);
    setBusy(true);
    const result = await signIn(mobile, otp);
    setBusy(false);
    if (!result.ok) setError(t(OTP_ERROR_KEY[result.reason]));
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-worker-ground" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="bg-worker-sky"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHero>
          <LanguageToggle />
        </AuthHero>

        <View
          className="-mt-10 flex-1 rounded-t-[32px] bg-worker-surface px-6 pt-8"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <Text weight="bold" className="text-center text-3xl text-worker-primary">
            {t('worker.auth.welcomeTitle')}
          </Text>
          <Text className="mt-2 text-center text-base text-worker-muted">{t('worker.auth.welcomeSubtitle')}</Text>

          <FormField
            containerClassName="mt-8"
            label={t('worker.auth.mobileLabel')}
            placeholder={t('worker.auth.mobilePlaceholder')}
            prefix={
              <Text weight="semibold" className="text-base text-worker-ink">
                +91
              </Text>
            }
            value={mobile}
            onChangeText={(value) => {
              setMobile(digitsOnly(value, MOBILE_DIGITS));
              setError(null);
            }}
            keyboardType="number-pad"
            maxLength={MOBILE_DIGITS}
            editable={stage === 'mobile' && !busy}
            textContentType="telephoneNumber"
            autoComplete="tel"
            error={stage === 'mobile' ? (mobileError ?? error ?? undefined) : undefined}
            accessory={
              stage === 'code' ? (
                <Pressable
                  className="h-12 justify-center"
                  onPress={() => {
                    setStage('mobile');
                    setOtp('');
                    setError(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('worker.auth.changeNumber')}
                >
                  <Text weight="semibold" className="text-sm text-worker-primary">
                    {t('worker.auth.changeNumber')}
                  </Text>
                </Pressable>
              ) : undefined
            }
          />

          {stage === 'mobile' ? (
            <PrimaryButton
              className="mt-6"
              label={t('worker.auth.sendOtp')}
              disabled={!mobileValid}
              loading={busy}
              onPress={() => void sendCode()}
            />
          ) : (
            <>
              <Text className="mt-6 text-base text-worker-ink">
                {t('worker.auth.otpSentTo', { phone: formatIndianMobile(mobile) })}
              </Text>

              <FormField
                containerClassName="mt-4"
                label={t('worker.auth.otpLabel')}
                value={otp}
                onChangeText={(value) => {
                  setOtp(digitsOnly(value, OTP_LENGTH));
                  setError(null);
                }}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                autoFocus
                error={error ?? undefined}
              />

              <View className="mt-3 flex-row items-center rounded-xl bg-worker-primary-tint px-4 py-3">
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text className="ml-2 flex-1 text-sm text-worker-ink">
                  {t('worker.auth.demoOtp', { code: MOCK_OTP })}
                </Text>
              </View>

              <PrimaryButton
                className="mt-6"
                label={t('worker.auth.login')}
                disabled={otp.length !== OTP_LENGTH}
                loading={busy}
                onPress={() => void login()}
              />

              <Pressable
                className="mt-2 h-12 items-center justify-center"
                onPress={() => void sendCode()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('worker.auth.resendOtp')}
              >
                <Text weight="semibold" className="text-sm text-worker-primary">
                  {t('worker.auth.resendOtp')}
                </Text>
              </Pressable>
            </>
          )}

          <View className="flex-1" />

          <View className="mt-8 flex-row items-center">
            <View className="h-px flex-1 bg-worker-border" />
          </View>
          <View className="mt-4 flex-row flex-wrap items-center justify-center">
            <Text className="text-base text-worker-muted">{t('worker.auth.noAccount')} </Text>
            <Pressable
              className="h-12 justify-center"
              onPress={() => router.push('/signup')}
              accessibilityRole="link"
              accessibilityLabel={t('worker.auth.signUp')}
            >
              <Text weight="bold" className="text-base text-worker-primary">
                {t('worker.auth.signUp')}
              </Text>
            </Pressable>
          </View>

          {DEMO_TOOLS_ENABLED ? (
            <Pressable
              className="mt-1 h-12 flex-row items-center justify-center self-center px-3"
              onPress={() => setDemoOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('worker.demo.open')}
            >
              <Ionicons name="construct-outline" size={16} color={colors.muted} />
              <Text weight="semibold" className="ml-1.5 text-sm text-worker-muted">
                {t('worker.demo.open')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <DemoToolsSheet visible={demoOpen} onClose={() => setDemoOpen(false)} />
    </KeyboardAvoidingView>
  );
}
