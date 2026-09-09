import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { phoneSchema } from '@sahayo/shared';
import emblem from '../assets/images/emblem.png';

const DIAL_CODE = '+91';
const LOCAL_LENGTH = 10;

/**
 * Login screen — UI only.
 *
 * There is no auth backend yet. `handleSendOtp` fakes latency and routes to
 * /home so the flow is walkable in the demo. The single marked spot below is
 * where the real call goes; nothing else on this screen needs to change when
 * it does.
 *
 * Validation is not hand-rolled: the composed E.164 number is checked against
 * `phoneSchema` from @sahayo/shared, the same schema the backend will validate
 * with, so the client cannot drift from the contract.
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [localNumber, setLocalNumber] = useState('');
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const e164 = `${DIAL_CODE}${localNumber}`;
  const isValid = useMemo(
    () => localNumber.length === LOCAL_LENGTH && phoneSchema.safeParse(e164).success,
    [localNumber, e164],
  );

  // Only nag once the field has been left, or once it is over-long.
  const showError = touched && !focused && localNumber.length > 0 && !isValid;

  function handleChange(next: string) {
    setLocalNumber(next.replace(/\D/g, '').slice(0, LOCAL_LENGTH));
  }

  async function handleSendOtp() {
    if (!isValid || submitting) return;
    setSubmitting(true);

    // ---- integration point -------------------------------------------
    // Replace with: await api.post('/auth/otp/request', { phone: e164 })
    // then route to the OTP entry screen instead of straight to /home.
    await new Promise((resolve) => setTimeout(resolve, 550));
    // ------------------------------------------------------------------

    setSubmitting(false);
    router.push('/home');
  }

  const canSubmit = isValid && !submitting;

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
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6">
            {/* brand lockup */}
            <View className="items-center pt-6 pb-10">
              <Image
                source={emblem}
                className="h-24 w-24"
                resizeMode="contain"
                accessibilityRole="image"
                accessibilityLabel="Sahayo"
              />
              <Text className="mt-3 text-2xl font-bold tracking-wide text-brand-navy">SAHAYO</Text>
              <Text className="mt-1 text-sm text-brand-muted">Cooperative services, near you</Text>
            </View>

            {/* heading */}
            <Text className="text-3xl font-bold leading-tight text-brand-navy">
              Log in to your{'\n'}Sahayo
            </Text>
            <Text className="mt-2 text-base text-brand-muted">
              We&rsquo;ll text you a one-time code. No password to remember.
            </Text>

            {/* phone field */}
            <View className="mt-8">
              <Text className="mb-2 text-sm font-semibold text-brand-navy">Phone number</Text>

              <View
                className={[
                  'flex-row items-center overflow-hidden rounded-2xl border bg-brand-surface',
                  showError
                    ? 'border-brand-danger'
                    : focused
                      ? 'border-brand-primary'
                      : 'border-brand-border',
                ].join(' ')}
              >
                <View className="border-r border-brand-border px-4 py-4">
                  <Text className="text-base font-semibold text-brand-navy">{DIAL_CODE}</Text>
                </View>
                <TextInput
                  className="flex-1 px-4 py-4 text-base text-brand-navy"
                  value={localNumber}
                  onChangeText={handleChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => {
                    setFocused(false);
                    setTouched(true);
                  }}
                  placeholder="98765 43210"
                  placeholderTextColor="#9AA5B1"
                  keyboardType="number-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  maxLength={LOCAL_LENGTH}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                  editable={!submitting}
                  accessibilityLabel="Phone number"
                />
              </View>

              {showError ? (
                <Text className="mt-2 text-sm text-brand-danger">
                  Enter a valid 10-digit mobile number.
                </Text>
              ) : (
                <Text className="mt-2 text-sm text-brand-muted">
                  {localNumber.length}/{LOCAL_LENGTH} digits
                </Text>
              )}
            </View>

            {/* primary action */}
            <TouchableOpacity
              className={[
                'mt-6 h-14 flex-row items-center justify-center rounded-2xl',
                canSubmit ? 'bg-brand-primary' : 'bg-brand-primary-soft',
              ].join(' ')}
              activeOpacity={0.85}
              onPress={handleSendOtp}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              accessibilityLabel="Send OTP"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  className={[
                    'text-base font-semibold',
                    canSubmit ? 'text-white' : 'text-brand-muted',
                  ].join(' ')}
                >
                  Send OTP
                </Text>
              )}
            </TouchableOpacity>

            {/* divider */}
            <View className="my-7 flex-row items-center">
              <View className="h-px flex-1 bg-brand-border" />
              <Text className="px-4 text-sm text-brand-muted">or</Text>
              <View className="h-px flex-1 bg-brand-border" />
            </View>

            {/* secondary action */}
            <TouchableOpacity
              className="h-14 flex-row items-center justify-center rounded-2xl border border-brand-border bg-brand-surface"
              activeOpacity={0.85}
              onPress={() => router.push('/home')}
              accessibilityRole="button"
              accessibilityLabel="Continue as guest"
            >
              <Text className="text-base font-semibold text-brand-navy">Continue as guest</Text>
            </TouchableOpacity>

            <View className="flex-1" />

            {/* footer */}
            <View className="flex-row items-center justify-center pt-8">
              <Text className="text-sm text-brand-muted">New to Sahayo? </Text>
              <Pressable
                onPress={() => router.push('/home')}
                accessibilityRole="link"
                accessibilityLabel="Create an account"
              >
                <Text className="text-sm font-semibold text-brand-primary">Create an account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
