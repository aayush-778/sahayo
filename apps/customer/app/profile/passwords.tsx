import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, FormField, PrimaryButton, Text } from '@sahayo/ui-native';

import { ScreenHeader } from '../../src/components/ScreenHeader';

const PIN_LENGTH = 4;

/**
 * App lock.
 *
 * The sketch calls this "Manage Passwords", but Sahayo has no password: sign
 * in is a phone number and an OTP, and inventing a password field would
 * suggest a credential that does not exist and cannot be reset. What a
 * customer can actually manage is a local screen lock, so that is what this
 * screen offers — the same menu row, an honest destination.
 *
 * Nothing is stored. Phase 5 puts the PIN in the device keystore; until then
 * the form validates and reports success without persisting, and says so.
 */
export default function PasswordsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saved, setSaved] = useState(false);

  const nextValid = next.length === PIN_LENGTH;
  const confirmValid = confirm.length === PIN_LENGTH && confirm === next;
  const ready = current.length === PIN_LENGTH && nextValid && confirmValid;

  function onlyDigits(value: string): string {
    return value.replace(/\D/g, '').slice(0, PIN_LENGTH);
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
        <ScreenHeader title={t('passwords.title')} fallback="/profile" />

        <Text className="mt-4 text-sm text-brand-muted">{t('passwords.intro')}</Text>

        <View className="mt-5">
          <FormField
            label={t('passwords.current')}
            value={current}
            onChangeText={(value) => {
              setCurrent(onlyDigits(value));
              setSaved(false);
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
          />
          <FormField
            containerClassName="mt-4"
            label={t('passwords.next')}
            value={next}
            onChangeText={(value) => {
              setNext(onlyDigits(value));
              setSaved(false);
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
          />
          <FormField
            containerClassName="mt-4"
            label={t('passwords.confirm')}
            value={confirm}
            onChangeText={(value) => {
              setConfirm(onlyDigits(value));
              setSaved(false);
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
            error={
              confirm.length === PIN_LENGTH && confirm !== next
                ? t('passwords.mismatch')
                : undefined
            }
          />
        </View>

        {saved ? (
          <View className="mt-4 flex-row items-center rounded-xl border border-brand-success bg-brand-success-soft px-4 py-3">
            <Ionicons name="checkmark-circle" size={16} color={brandColors.success} />
            <Text className="ml-2 flex-1 text-sm text-brand-success">{t('passwords.saved')}</Text>
          </View>
        ) : null}

        <PrimaryButton
          className="mt-6"
          label={t('passwords.update')}
          disabled={!ready}
          onPress={() => {
            setSaved(true);
            setCurrent('');
            setNext('');
            setConfirm('');
          }}
        />

        <View className="mt-4 flex-row items-start rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
          <Ionicons name="information-circle-outline" size={16} color={brandColors.muted} />
          <Text className="ml-2 flex-1 text-xs text-brand-muted">{t('passwords.mockNote')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
