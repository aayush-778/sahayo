import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { phoneSchema } from '@sahayo/shared';
import { brandColors, FormField, PrimaryButton, Text } from '@sahayo/ui-native';

import { AuthHeader } from '../../src/components/AuthHeader';
import { useAuthStore } from '../../src/store/auth';

const DIAL_CODE = '+91';
const LOCAL_LENGTH = 10;

/**
 * Login.
 *
 * Any valid 10-digit number is accepted — there is no allowlist of mock
 * phones. An allowlist would break the moment someone types their own number
 * during a demo, and with no OTP there is nothing it would actually protect.
 *
 * It carries a name field as well as a number, which is unusual for a login
 * screen and is deliberate: the app greets the user by name on Home and
 * Profile, and with no backend there is nothing to look a number up against.
 * Without this field, signing in on a fresh install would leave every
 * greeting blank.
 *
 * The store keeps an existing name when this screen submits an empty one, so
 * arriving here from signup and signing in again never wipes the name.
 *
 * Differs from signup only in its copy, its footer link, and the absence of
 * the terms checkbox — agreeing to terms is something you do once, when the
 * account is created, not on every sign-in.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((state) => state.login);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

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

  const canSubmit = nameValid && phoneValid;

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
            <AuthHeader title={t('auth.login.headerTitle')} />

            <Text weight="bold" className="mt-8 text-center text-2xl text-brand-primary">
              {t('auth.login.heading')}
            </Text>
            <Text className="mt-2 text-center text-base text-brand-navy">
              {t('auth.login.subtitle')}
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

            <PrimaryButton
              className="mt-8"
              label={t('auth.continue')}
              disabled={!canSubmit}
              onPress={() => login(e164, name)}
            />

            <View className="flex-1" />

            <View className="flex-row items-center justify-center pt-8">
              <Text className="text-sm text-brand-muted">{t('auth.login.footerPrompt')}</Text>
              <Pressable
                onPress={() => router.push('/signup')}
                accessibilityRole="link"
                accessibilityLabel={t('auth.login.footerAction')}
                hitSlop={6}
              >
                <Text weight="semibold" className="text-sm text-brand-primary underline">
                  {t('auth.login.footerAction')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
