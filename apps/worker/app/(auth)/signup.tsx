import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FormField, PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { DateField } from '../../src/components/DateField';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { SelectField } from '../../src/components/SelectField';
import { Sheet } from '../../src/components/Sheet';
import {
  cityName,
  digitsOnly,
  GENDER_OPTIONS,
  getCities,
  isOldEnough,
  isValidIndianMobile,
  MAX_WORKER_AGE,
  MIN_WORKER_AGE,
  MOBILE_DIGITS,
  MOCK_OTP,
  OTP_LENGTH,
  requestOtp,
  savePersonalDetails,
  signOut,
  signUp,
  useLanguage,
  useWorkerProfile,
  verifyOtp,
  type OtpFailure,
} from '../../src/services';
import type { Gender } from '../../src/types';

const OTP_ERROR_KEY: Record<OtpFailure, string> = {
  invalid_mobile: 'worker.auth.errors.mobileInvalid',
  incomplete: 'worker.auth.errors.otpIncomplete',
  wrong_code: 'worker.auth.errors.otpInvalid',
};

const withoutCountryCode = (phone: string) => phone.replace(/^\+91/, '');

/**
 * Create Account — step 1 of 5, personal information.
 *
 * Two ways in. A new partner arrives from Login: the mobile number is verified
 * by OTP inside the form, and Next creates the account. A registered partner
 * arrives with Previous from step 2: the form is filled from their record, the
 * mobile number is locked (it is what they log in with), and Next saves edits.
 *
 * Previous leads back to Login for a new partner. For a registered one there
 * is nothing before step 1 except leaving, so it asks before logging them out.
 *
 * Next stays available and explains what is missing when pressed, rather than
 * sitting disabled with no reason.
 */
export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const language = useLanguage();
  const profile = useWorkerProfile();
  const registered = profile.isAuthenticated;

  const [name, setName] = useState(profile.name);
  const [gender, setGender] = useState<Gender | null>(profile.gender);
  const [dob, setDob] = useState<string | null>(profile.dob);
  const [mobile, setMobile] = useState(withoutCountryCode(profile.phone));
  const [otpStage, setOtpStage] = useState<'idle' | 'sent' | 'verified'>(registered ? 'verified' : 'idle');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [alternate, setAlternate] = useState(withoutCountryCode(profile.alternatePhone));
  const [city, setCity] = useState<string | null>(profile.city || null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const thisYear = new Date().getFullYear();

  const errors = {
    name: name.trim().length < 2 ? t('worker.onboarding.errors.nameRequired') : undefined,
    gender: gender ? undefined : t('worker.onboarding.errors.genderRequired'),
    dob: !dob
      ? t('worker.onboarding.errors.dobRequired')
      : !isOldEnough(dob)
        ? t('worker.onboarding.errors.underage', { age: MIN_WORKER_AGE })
        : undefined,
    mobile: otpStage === 'verified' ? undefined : t('worker.onboarding.errors.verifyMobile'),
    alternate:
      alternate === ''
        ? undefined
        : !isValidIndianMobile(alternate)
          ? t('worker.onboarding.errors.altInvalid')
          : alternate === mobile
            ? t('worker.onboarding.errors.altSameAsMobile')
            : undefined,
    city: city ? undefined : t('worker.onboarding.errors.cityRequired'),
  };
  const valid = Object.values(errors).every((message) => !message);
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const mobileTypedInvalid =
    mobile.length === MOBILE_DIGITS && !isValidIndianMobile(mobile) ? t('worker.auth.errors.mobileInvalid') : undefined;

  async function sendCode() {
    setOtpError(null);
    const result = await requestOtp(mobile);
    if (result.ok) {
      setOtp('');
      setOtpStage('sent');
    } else {
      setOtpError(t('worker.auth.errors.mobileInvalid'));
    }
  }

  async function confirmCode() {
    const result = await verifyOtp(mobile, otp);
    if (result.ok) {
      setOtpStage('verified');
      setOtpError(null);
    } else {
      setOtpError(t(OTP_ERROR_KEY[result.reason]));
    }
  }

  async function next() {
    setSubmitted(true);
    if (!valid || !gender || !dob || !city) return;
    setBusy(true);

    if (registered) {
      const result = await savePersonalDetails({ name, gender, dob, alternatePhone: alternate, city });
      setBusy(false);
      if (result.ok) router.replace('/service-details');
      return;
    }

    const result = await signUp({ name, gender, dob, mobile, alternatePhone: alternate, city }, otp);
    setBusy(false);
    if (result.ok) {
      router.replace('/service-details');
    } else {
      // The code was verified moments ago; if it no longer passes, make them
      // verify again rather than failing silently.
      setOtpStage('sent');
      setOtpError(t(OTP_ERROR_KEY[result.reason]));
    }
  }

  function previous() {
    if (registered) setLeaving(true);
    else if (router.canGoBack()) router.back();
    else router.replace('/login');
  }

  const plus91 = (
    <Text weight="semibold" className="text-base text-worker-ink">
      +91
    </Text>
  );

  return (
    <OnboardingScreen
      step={1}
      title={t('worker.onboarding.createAccount')}
      heading={t('worker.onboarding.personalHeading')}
      onPrevious={previous}
      onNext={() => void next()}
      nextLoading={busy}
    >
      <FormField
        containerClassName="mt-4"
        label={t('worker.onboarding.fullName')}
        placeholder={t('worker.onboarding.fullNamePlaceholder')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
        error={shown('name')}
      />

      <SelectField
        className="mt-5"
        label={t('worker.onboarding.gender')}
        placeholder={t('worker.onboarding.genderPlaceholder')}
        sheetTitle={t('worker.onboarding.gender')}
        value={gender}
        options={GENDER_OPTIONS.map((option) => ({
          value: option,
          label: t(`worker.onboarding.genderOptions.${option}`),
        }))}
        onChange={(value) => setGender(value as Gender)}
        error={shown('gender')}
      />

      <DateField
        className="mt-5"
        label={t('worker.onboarding.dob')}
        placeholder={t('worker.onboarding.dobPlaceholder')}
        sheetTitle={t('worker.onboarding.dob')}
        value={dob}
        minYear={thisYear - MAX_WORKER_AGE}
        maxYear={thisYear - MIN_WORKER_AGE}
        onChange={setDob}
        error={shown('dob')}
      />

      <FormField
        containerClassName="mt-5"
        label={t('worker.onboarding.mobile')}
        placeholder={t('worker.auth.mobilePlaceholder')}
        prefix={plus91}
        value={mobile}
        onChangeText={(value) => {
          setMobile(digitsOnly(value, MOBILE_DIGITS));
          setOtpError(null);
        }}
        keyboardType="number-pad"
        maxLength={MOBILE_DIGITS}
        editable={otpStage === 'idle'}
        textContentType="telephoneNumber"
        autoComplete="tel"
        error={mobileTypedInvalid ?? (otpStage === 'idle' ? (otpError ?? shown('mobile')) : undefined)}
        accessory={
          otpStage === 'verified' ? (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text weight="semibold" className="ml-1 text-sm text-worker-success">
                {t('worker.auth.verified')}
              </Text>
            </View>
          ) : otpStage === 'idle' ? (
            <Pressable
              className={`h-12 justify-center rounded-lg px-3 ${
                isValidIndianMobile(mobile) ? 'bg-worker-primary' : 'bg-worker-primary-soft'
              }`}
              onPress={() => void sendCode()}
              disabled={!isValidIndianMobile(mobile)}
              accessibilityRole="button"
              accessibilityLabel={t('worker.auth.sendOtp')}
            >
              <Text
                weight="semibold"
                className={`text-sm ${isValidIndianMobile(mobile) ? 'text-white' : 'text-worker-muted'}`}
              >
                {t('worker.auth.sendOtp')}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              className="h-12 justify-center"
              onPress={() => {
                setOtpStage('idle');
                setOtp('');
                setOtpError(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('worker.auth.changeNumber')}
            >
              <Text weight="semibold" className="text-sm text-worker-primary">
                {t('worker.auth.changeNumber')}
              </Text>
            </Pressable>
          )
        }
      />

      {otpStage === 'sent' ? (
        <View className="mt-3 rounded-2xl border border-worker-border bg-worker-surface p-4">
          <FormField
            label={t('worker.auth.otpLabel')}
            value={otp}
            onChangeText={(value) => {
              setOtp(digitsOnly(value, OTP_LENGTH));
              setOtpError(null);
            }}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus
            error={otpError ?? undefined}
          />
          <View className="mt-3 flex-row items-center rounded-xl bg-worker-primary-tint px-4 py-3">
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text className="ml-2 flex-1 text-sm text-worker-ink">{t('worker.auth.demoOtp', { code: MOCK_OTP })}</Text>
          </View>
          <PrimaryButton
            className="mt-3"
            label={t('worker.auth.verify')}
            disabled={otp.length !== OTP_LENGTH}
            onPress={() => void confirmCode()}
          />
        </View>
      ) : null}

      <FormField
        containerClassName="mt-5"
        label={`${t('worker.onboarding.altPhone')} (${t('worker.onboarding.optional')})`}
        placeholder={t('worker.auth.mobilePlaceholder')}
        prefix={plus91}
        value={alternate}
        onChangeText={(value) => setAlternate(digitsOnly(value, MOBILE_DIGITS))}
        keyboardType="number-pad"
        maxLength={MOBILE_DIGITS}
        error={alternate.length === MOBILE_DIGITS || submitted ? errors.alternate : undefined}
      />

      <SelectField
        className="mt-5"
        label={t('worker.onboarding.city')}
        placeholder={t('worker.onboarding.cityPlaceholder')}
        sheetTitle={t('worker.onboarding.city')}
        value={city}
        options={getCities().map((entry) => ({ value: entry.id, label: cityName(entry.id, language) }))}
        onChange={setCity}
        error={shown('city')}
      />

      <Sheet
        visible={leaving}
        title={t('worker.onboarding.leave.title')}
        onClose={() => setLeaving(false)}
        footer={
          <View className="gap-3">
            <PrimaryButton label={t('worker.onboarding.leave.stay')} onPress={() => setLeaving(false)} />
            <Pressable
              className="h-12 items-center justify-center rounded-xl border-2 border-worker-danger"
              onPress={() => {
                setLeaving(false);
                void signOut();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('worker.onboarding.leave.logOut')}
            >
              <Text weight="semibold" className="text-base text-worker-danger">
                {t('worker.onboarding.leave.logOut')}
              </Text>
            </Pressable>
          </View>
        }
      >
        <Text className="px-5 pt-4 text-base text-worker-ink">{t('worker.onboarding.leave.body')}</Text>
      </Sheet>
    </OnboardingScreen>
  );
}
