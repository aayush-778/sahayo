import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, FormField, PrimaryButton, Text } from '@sahayo/ui-native';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useAuthStore } from '../../src/store/auth';

const PHONE_DIGITS = 10;

/**
 * Edit profile.
 *
 * Writes straight to the auth store, which is what Home greets the user with
 * and what the profile header shows — so a rename is visible everywhere the
 * moment it is saved, with nothing to refresh.
 *
 * The number is stored as `+91` plus ten digits, matching what signup and
 * login produce; the field edits the local part only so the dial code cannot
 * be deleted by accident.
 */
export default function EditProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const storedName = useAuthStore((state) => state.name);
  const storedPhone = useAuthStore((state) => state.phone);
  const login = useAuthStore((state) => state.login);

  const [name, setName] = useState(storedName);
  const [local, setLocal] = useState(storedPhone.replace(/\D/g, '').slice(-PHONE_DIGITS));
  const [saved, setSaved] = useState(false);

  const nameValid = name.trim().length >= 2;
  const phoneValid = local.length === PHONE_DIGITS;
  const dirty = name !== storedName || `+91${local}` !== storedPhone;

  function save() {
    if (!nameValid || !phoneValid) return;
    login(`+91${local}`, name.trim());
    setSaved(true);
  }

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6">
        <ScreenHeader title={t('profile.edit')} fallback="/profile" />

        <View className="mt-6">
          <FormField
            label={t('auth.nameLabel')}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setSaved(false);
            }}
            autoCapitalize="words"
            error={name.length > 0 && !nameValid ? t('profile.nameTooShort') : undefined}
          />

          <FormField
            containerClassName="mt-4"
            label={t('auth.phoneLabel')}
            value={local}
            onChangeText={(value) => {
              setLocal(value.replace(/\D/g, '').slice(0, PHONE_DIGITS));
              setSaved(false);
            }}
            keyboardType="number-pad"
            maxLength={PHONE_DIGITS}
            error={local.length > 0 && !phoneValid ? t('profile.phoneInvalid') : undefined}
            accessory={<Text className="text-sm text-brand-muted">+91</Text>}
          />
        </View>

        {saved ? (
          <View className="mt-4 flex-row items-center rounded-xl border border-brand-success bg-brand-success-soft px-4 py-3">
            <Ionicons name="checkmark-circle" size={16} color={brandColors.success} />
            <Text className="ml-2 flex-1 text-sm text-brand-success">{t('profile.saved')}</Text>
          </View>
        ) : null}

        <PrimaryButton
          className="mt-6"
          label={t('profile.saveChanges')}
          disabled={!nameValid || !phoneValid || !dirty}
          onPress={save}
        />

        {/* A plain Pressable, not a second `PrimaryButton` with overrides:
            that component sets its own background and text colour, and
            Tailwind resolves conflicting utilities by stylesheet order rather
            than by position in the class string — so "bg-brand-surface"
            appended after "bg-brand-primary" is not reliably the winner. */}
        <Pressable
          className="mt-3 h-14 items-center justify-center rounded-xl border border-brand-border bg-brand-surface"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
        >
          <Text weight="semibold" className="text-base text-brand-navy">
            {t('common.cancel')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
