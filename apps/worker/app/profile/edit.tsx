import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, FormField, PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { ActionBar } from '../../src/components/ActionBar';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SelectField } from '../../src/components/SelectField';
import {
  cityName,
  digitsOnly,
  formatIndianMobile,
  getCities,
  MOBILE_DIGITS,
  updateProfile,
  useLanguage,
  useWorkerProfile,
} from '../../src/services';

/**
 * Edit profile — name, second number and city.
 *
 * The login mobile number is shown but locked: it is the partner's identity
 * with the cooperative, and changing it is a conversation with the
 * coordinator, not a text field.
 */
export default function EditProfileScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const language = useLanguage();
  const profile = useWorkerProfile();

  const [name, setName] = useState(profile.name);
  const [alternate, setAlternate] = useState(profile.alternatePhone.replace(/^\+91/, ''));
  const [city, setCity] = useState<string | null>(profile.city || null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const plus91 = (
    <Text weight="semibold" className="text-base text-worker-ink">
      +91
    </Text>
  );

  async function save() {
    setMessage(null);
    setBusy(true);
    const result = await updateProfile({ name, city: city ?? undefined, alternatePhone: alternate });
    setBusy(false);
    setMessage(
      result.ok
        ? { ok: true, text: t('worker.profile.edit.saved') }
        : {
            ok: false,
            text:
              result.reason === 'invalid_name'
                ? t('worker.onboarding.errors.nameRequired')
                : t('worker.onboarding.errors.altInvalid'),
          },
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-worker-ground" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('worker.profile.edit.title')} fallback="/profile" />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-xl gap-4 self-center px-5">
          <View className="items-center">
            <Avatar name={name || profile.name || '—'} size="lg" />
            <Text className="mt-2 text-center text-xs text-worker-muted">{t('worker.profile.edit.photoNote')}</Text>
          </View>

          <FormField
            label={t('worker.onboarding.fullName')}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setMessage(null);
            }}
            autoCapitalize="words"
          />

          <View>
            <FormField
              label={t('worker.onboarding.mobile')}
              value={formatIndianMobile(profile.phone.replace(/^\+91/, '')).replace(/^\+91\s*/, '')}
              prefix={plus91}
              editable={false}
              accessory={<Ionicons name="lock-closed-outline" size={18} color={colors.muted} />}
            />
            <Text className="mt-1 text-xs text-worker-muted">{t('worker.profile.edit.mobileLocked')}</Text>
          </View>

          <FormField
            label={`${t('worker.onboarding.altPhone')} (${t('worker.onboarding.optional')})`}
            placeholder={t('worker.auth.mobilePlaceholder')}
            prefix={plus91}
            value={alternate}
            onChangeText={(value) => {
              setAlternate(digitsOnly(value, MOBILE_DIGITS));
              setMessage(null);
            }}
            keyboardType="number-pad"
            maxLength={MOBILE_DIGITS}
          />

          <SelectField
            label={t('worker.onboarding.city')}
            placeholder={t('worker.onboarding.cityPlaceholder')}
            sheetTitle={t('worker.onboarding.city')}
            value={city}
            options={getCities().map((entry) => ({ value: entry.id, label: cityName(entry.id, language) }))}
            onChange={(value) => {
              setCity(value);
              setMessage(null);
            }}
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
        <PrimaryButton label={t('worker.profile.edit.save')} loading={busy} onPress={() => void save()} />
      </ActionBar>
    </KeyboardAvoidingView>
  );
}
