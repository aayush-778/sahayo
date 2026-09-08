import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { phoneSchema } from '@sahayo/shared';
import { brandColors, Checkbox, FormField, PrimaryButton, Text } from '@sahayo/ui-native';

import { AuthHeader } from '../../src/components/AuthHeader';
import { useAuthStore } from '../../src/store/auth';

const DIAL_CODE = '+91';
const LOCAL_LENGTH = 10;

/**
 * Signup — the entry point for a new user.
 *
 * There is no backend and no OTP in this phase. `signup` writes the name and
 * number to the auth store and the root gate does the navigating, so this
 * screen never calls `router.replace` itself and there is exactly one place
 * that decides where an authenticated user lands.
 *
 * The name typed here is what Home and Profile greet the user with. That is
 * the whole reason signup is the entry point rather than login.
 *
 * The number is validated against `phoneSchema` from @sahayo/shared — the
 * same schema the backend will use — so the client cannot drift from the
 * contract even while nothing is talking to a server.
 */
export default function SignupScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const signup = useAuthStore((state) => state.signup);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Errors appear on blur, not on every keystroke: telling someone their
  // number is invalid after they have typed two digits of it is noise.
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const nameValid = name.trim().length > 0;
  const e164 = `${DIAL_CODE}${phone}`;
  const phoneValid = useMemo(
    () => phone.length === LOCAL_LENGTH && phoneSchema.safeParse(e164).success,
    [phone, e164],
  );

  const nameError = nameTouched && !nameValid ? t('auth.nameError') : undefined;
  const phoneError =
    phoneTouched && phone.length > 0 && !phoneValid ? t('auth.phoneError') : undefined;

  const canSubmit = nameValid && phoneValid && agreed;

  return (
    <View className="flex-1 bg-brand-cream">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6">
            <AuthHeader title={t('auth.signup.headerTitle')} />

            <Text weight="bold" className="mt-8 text-center text-2xl text-brand-primary">
              {t('auth.signup.heading')}
            </Text>
            <Text className="mt-2 text-center text-base text-brand-navy">
              {t('auth.signup.subtitle')}
            </Text>

            <FormField
              containerClassName="mt-8"
              label={t('auth.nameLabel')}
              value={name}
              onChangeText={setName}
              onBlur={() => setNameTouched(true)}
              error={nameError}
              placeholder={t('auth.namePlaceholder')}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              accessibilityLabel={t('auth.nameLabel')}
              accessory={
                <Ionicons name="person-outline" size={20} color={brandColors.primary} />
              }
            />

            <FormField
              containerClassName="mt-5"
              label={t('auth.phoneLabel')}
              value={phone}
              onChangeText={(next) => setPhone(next.replace(/\D/g, '').slice(0, LOCAL_LENGTH))}
              onBlur={() => setPhoneTouched(true)}
              error={phoneError}
              placeholder={t('auth.phonePlaceholder')}
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={LOCAL_LENGTH}
              returnKeyType="done"
              accessibilityLabel={t('auth.phoneLabel')}
              accessory={<Ionicons name="call-outline" size={20} color={brandColors.primary} />}
            />

            <Checkbox
              className="mt-6"
              checked={agreed}
              onToggle={() => setAgreed((previous) => !previous)}
              accessibilityLabel={`${t('auth.termsAgree')}${t('auth.termsLink')}`}
              checkIcon={
                <Ionicons name="checkmark" size={14} color={brandColors.primary} />
              }
            >
              <Text className="text-sm text-brand-navy">{t('auth.termsAgree')}</Text>
              <Pressable
                onPress={() => router.push('/profile/terms')}
                accessibilityRole="link"
                accessibilityLabel={t('auth.termsLink')}
                hitSlop={6}
              >
                <Text weight="medium" className="text-sm text-brand-primary underline">
                  {t('auth.termsLink')}
                </Text>
              </Pressable>
            </Checkbox>

            <PrimaryButton
              className="mt-8"
              label={t('auth.continue')}
              disabled={!canSubmit}
              onPress={() => signup(name, e164)}
            />

            <View className="flex-1" />

            <View className="flex-row items-center justify-center pt-8">
              <Text className="text-sm text-brand-muted">{t('auth.signup.footerPrompt')}</Text>
              <Pressable
                onPress={() => router.push('/login')}
                accessibilityRole="link"
                accessibilityLabel={t('auth.signup.footerAction')}
                hitSlop={6}
              >
                <Text weight="semibold" className="text-sm text-brand-primary underline">
                  {t('auth.signup.footerAction')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
