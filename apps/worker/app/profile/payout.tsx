import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormField, PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { ActionBar } from '../../src/components/ActionBar';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { isValidUpiId, updateProfile, useWorkerProfile } from '../../src/services';

/** Payout details — the UPI ID settlements are sent to. */
export default function PayoutScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const profile = useWorkerProfile();
  const [upi, setUpi] = useState(profile.upiId);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const invalid = touched && !isValidUpiId(upi);

  async function save() {
    setTouched(true);
    setSaved(false);
    if (!isValidUpiId(upi)) return;
    setBusy(true);
    const result = await updateProfile({ upiId: upi });
    setBusy(false);
    setSaved(result.ok);
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-worker-ground" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('worker.profile.payout.title')} fallback="/profile" />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-xl gap-4 self-center px-5">
          <View className="flex-row rounded-2xl bg-worker-primary-tint p-4">
            <Ionicons name="wallet-outline" size={22} color={colors.primary} />
            <Text className="ml-3 flex-1 text-sm text-worker-ink">{t('worker.profile.payout.intro')}</Text>
          </View>

          <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
            <Text className="text-xs text-worker-muted">{t('worker.profile.payout.holder')}</Text>
            <Text weight="semibold" className="text-base text-worker-ink">
              {profile.name || '—'}
            </Text>
          </View>

          <FormField
            label={t('worker.profile.payout.upi')}
            placeholder={t('worker.profile.payout.upiPlaceholder')}
            value={upi}
            onChangeText={(value) => {
              setUpi(value.replace(/\s/g, ''));
              setSaved(false);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            error={invalid ? t('worker.profile.payout.error') : undefined}
          />
        </View>
      </ScrollView>

      <ActionBar>
        {saved ? (
          <Text className="text-center text-sm text-worker-success" accessibilityLiveRegion="polite">
            {t('worker.profile.payout.saved')}
          </Text>
        ) : null}
        <PrimaryButton label={t('worker.profile.payout.save')} loading={busy} onPress={() => void save()} />
      </ActionBar>
    </KeyboardAvoidingView>
  );
}
