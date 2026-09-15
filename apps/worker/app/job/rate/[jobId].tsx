import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar, FormField, PrimaryButton, Text } from '@sahayo/ui-native';

import { ActionBar } from '../../../src/components/ActionBar';
import { CheckRow } from '../../../src/components/CheckRow';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { StarRating } from '../../../src/components/StarRating';
import {
  findSubCategory,
  localizedName,
  rateCustomer,
  useBooking,
  useCustomerRating,
  useLanguage,
} from '../../../src/services';
import { CUSTOMER_FLAGS, type CustomerFlag } from '../../../src/types';

/**
 * The worker rates the customer.
 *
 * Stars, and optional flags from a fixed list — rude or abusive, did not pay,
 * felt unsafe, job not as booked. On most platforms only the customer can
 * complain; here the person doing the work can too, and the flags go to the
 * cooperative that stands behind them.
 */
export default function RateCustomerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useLanguage();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const view = useBooking(jobId);
  const existing = useCustomerRating(jobId);

  const [stars, setStars] = useState(0);
  const [flags, setFlags] = useState<CustomerFlag[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/job/active/${jobId}`));

  if (!view) {
    return (
      <View className="flex-1 bg-worker-ground">
        <ScreenHeader title={t('worker.rate.title')} fallback="/bookings" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-worker-muted">{t('worker.rate.errors.not_found')}</Text>
        </View>
      </View>
    );
  }

  const { booking, customer } = view;
  const name = customer?.name ?? '—';
  const service = findSubCategory(booking.serviceCategoryId);

  function toggle(flag: CustomerFlag) {
    setFlags((current) => (current.includes(flag) ? current.filter((entry) => entry !== flag) : [...current, flag]));
  }

  async function submit() {
    setSubmitted(true);
    setError(null);
    if (stars === 0) return;
    setBusy(true);
    const result = await rateCustomer({ bookingId: booking.id, stars, flags, comment });
    setBusy(false);
    if (result.ok) leave();
    else setError(t(`worker.rate.errors.${result.reason}`));
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-worker-ground" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('worker.rate.title')} fallback={`/job/active/${booking.id}`} />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-xl gap-3 self-center px-5">
          <View className="flex-row items-center rounded-2xl border border-worker-border bg-worker-surface p-4">
            <Avatar name={name} />
            <View className="ml-3 flex-1">
              <Text weight="semibold" className="text-base text-worker-ink">
                {name}
              </Text>
              <Text className="text-sm text-worker-muted">
                {service ? localizedName(service, language) : booking.serviceCategoryId}
              </Text>
            </View>
          </View>

          {existing ? (
            <View className="items-center rounded-2xl border border-worker-border bg-worker-surface p-5">
              <StarRating value={existing.stars} size={28} starLabel={(n) => t('worker.rate.starA11y', { n })} />
              <Text weight="semibold" className="mt-2 text-base text-worker-ink">
                {t('worker.rate.done')}
              </Text>
            </View>
          ) : (
            <>
              <View className="items-center rounded-2xl border border-worker-border bg-worker-surface p-4">
                <Text weight="semibold" className="text-center text-base text-worker-ink">
                  {t('worker.rate.question', { name })}
                </Text>
                <View className="mt-2">
                  <StarRating
                    value={stars}
                    onChange={(value) => {
                      setStars(value);
                      setError(null);
                    }}
                    size={32}
                    starLabel={(n) => t('worker.rate.starA11y', { n })}
                  />
                </View>
                <Text
                  weight="semibold"
                  className={`mt-1 text-sm ${submitted && stars === 0 ? 'text-worker-danger' : 'text-worker-muted'}`}
                >
                  {stars > 0
                    ? t(`worker.rate.starLabel.${stars}`)
                    : submitted
                      ? t('worker.rate.errors.starsRequired')
                      : ' '}
                </Text>
              </View>

              <View className="rounded-2xl border border-worker-border bg-worker-surface px-4 pb-2 pt-4">
                <Text weight="bold" className="text-base text-worker-ink">
                  {t('worker.rate.flagsTitle')}
                </Text>
                {CUSTOMER_FLAGS.map((flag) => (
                  <CheckRow
                    key={flag}
                    label={t(`worker.rate.flags.${flag}`)}
                    checked={flags.includes(flag)}
                    onToggle={() => toggle(flag)}
                  />
                ))}
                <Text className="mb-2 mt-1 text-xs text-worker-muted">{t('worker.rate.flagNote')}</Text>
              </View>

              <FormField
                label={t('worker.rate.comment')}
                placeholder={t('worker.rate.commentPlaceholder')}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={300}
                textAlignVertical="top"
                style={{ minHeight: 88 }}
              />
            </>
          )}
        </View>
      </ScrollView>

      <ActionBar>
        {error ? (
          <Text className="text-center text-sm text-worker-danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        {existing ? (
          <PrimaryButton label={t('common.back')} onPress={leave} />
        ) : (
          <PrimaryButton label={t('worker.rate.submit')} loading={busy} onPress={() => void submit()} />
        )}
      </ActionBar>
    </KeyboardAvoidingView>
  );
}
