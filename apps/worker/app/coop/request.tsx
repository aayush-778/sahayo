import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatPaise, FormField, PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { ActionBar } from '../../src/components/ActionBar';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SegmentedTabs } from '../../src/components/SegmentedTabs';
import { SelectField } from '../../src/components/SelectField';
import {
  CLAIM_MAX_RUPEES,
  CLAIM_MIN_RUPEES,
  digitsOnly,
  hasOpenLoan,
  LOAN_MAX_RUPEES,
  LOAN_MIN_RUPEES,
  LOAN_REPAYMENT_MONTHS,
  monthlyInstalment,
  requestLoan,
  submitClaim,
  useLanguage,
  useSupportRequests,
  type SupportFailure,
} from '../../src/services';
import { CLAIM_TYPES, LOAN_PURPOSES } from '../../src/types';

/**
 * Asking the fund for help — a tool loan or an emergency claim.
 *
 * `?kind=loan` or `?kind=claim`. Short on purpose: an amount, what it is for,
 * a line in the worker's own words, and for a loan, how many months to pay it
 * back, with the monthly amount worked out as they choose. No interest is ever
 * added, and the form says so before anything else.
 */
export default function SupportRequestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const language = useLanguage();
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const isLoan = kind !== 'claim';
  const requests = useSupportRequests();
  const loanOpen = isLoan && hasOpenLoan(requests);

  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState<string | null>(null);
  const [months, setMonths] = useState<string>('6');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<SupportFailure | null>(null);
  const [sent, setSent] = useState(false);

  const min = isLoan ? LOAN_MIN_RUPEES : CLAIM_MIN_RUPEES;
  const max = isLoan ? LOAN_MAX_RUPEES : CLAIM_MAX_RUPEES;
  const money = (rupees: number) => formatPaise(rupees * 100, language);
  const rupees = Number(amount);

  const errors = {
    amount: !amount || rupees < min || rupees > max ? t('worker.coop.form.errors.amount_out_of_range', { min: money(min), max: money(max) }) : undefined,
    purpose: purpose ? undefined : t('worker.coop.form.errors.invalid_purpose'),
    details: details.trim().length < 5 ? t('worker.coop.form.errors.details_required') : undefined,
  };
  const valid = !errors.amount && !errors.purpose && !errors.details;

  async function submit() {
    setSubmitted(true);
    setFailure(null);
    if (!valid || !purpose) return;
    setBusy(true);
    const result = isLoan
      ? await requestLoan({ amountRupees: rupees, purpose, months: Number(months), details })
      : await submitClaim({ amountRupees: rupees, type: purpose, details });
    setBusy(false);
    if (result.ok) setSent(true);
    else setFailure(result.reason);
  }

  const title = isLoan ? t('worker.coop.form.loanTitle') : t('worker.coop.form.claimTitle');

  if (sent) {
    return (
      <View className="flex-1 bg-worker-ground">
        <ScreenHeader title={title} fallback="/coop" />
        <View className="w-full max-w-xl flex-1 items-center justify-center self-center px-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-worker-success-soft">
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
          </View>
          <Text weight="bold" className="mt-3 text-center text-xl text-worker-ink">
            {t('worker.coop.form.doneTitle')}
          </Text>
          <Text className="mt-1 text-center text-base text-worker-muted">{t('worker.coop.form.doneBody')}</Text>
          <PrimaryButton className="mt-6 self-stretch" label={t('worker.coop.form.backToFund')} onPress={() => router.dismissTo('/coop')} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-worker-ground" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={title} fallback="/coop" />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-xl gap-4 self-center px-5">
          <View className="flex-row rounded-2xl bg-worker-primary-tint p-4">
            <Ionicons name={isLoan ? 'construct-outline' : 'medkit-outline'} size={22} color={colors.primary} />
            <Text className="ml-3 flex-1 text-sm text-worker-ink">
              {isLoan ? t('worker.coop.form.loanIntro') : t('worker.coop.form.claimIntro')}
            </Text>
          </View>

          {loanOpen ? (
            <View className="rounded-2xl border border-worker-warning bg-worker-warning-soft p-4">
              <Text className="text-sm text-worker-ink">{t('worker.coop.form.loanOpen')}</Text>
            </View>
          ) : (
            <>
              {isLoan ? null : (
                <SelectField
                  label={t('worker.coop.form.claimType')}
                  placeholder={t('worker.coop.form.purposePlaceholder')}
                  sheetTitle={t('worker.coop.form.claimType')}
                  value={purpose}
                  options={CLAIM_TYPES.map((type) => ({ value: type, label: t(`worker.coop.form.claimTypes.${type}`) }))}
                  onChange={setPurpose}
                  error={submitted ? errors.purpose : undefined}
                />
              )}

              <View>
                <FormField
                  label={t('worker.coop.form.amount')}
                  placeholder={String(isLoan ? 2500 : 5000)}
                  prefix={
                    <Text weight="semibold" className="text-base text-worker-ink">
                      ₹
                    </Text>
                  }
                  value={amount}
                  onChangeText={(value) => setAmount(digitsOnly(value, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  error={submitted ? errors.amount : undefined}
                />
                <Text className="mt-1 text-xs text-worker-muted">
                  {t('worker.coop.form.amountHint', { min: money(min), max: money(max) })}
                </Text>
                {isLoan ? (
                  <View className="mt-2">
                    <SegmentedTabs
                      tabs={[1000, 2500, 5000].map((value) => ({ key: String(value), label: money(value) }))}
                      selected={amount}
                      onSelect={setAmount}
                    />
                  </View>
                ) : null}
              </View>

              {isLoan ? (
                <>
                  <SelectField
                    label={t('worker.coop.form.purpose')}
                    placeholder={t('worker.coop.form.purposePlaceholder')}
                    sheetTitle={t('worker.coop.form.purpose')}
                    value={purpose}
                    options={LOAN_PURPOSES.map((entry) => ({ value: entry, label: t(`worker.coop.form.purposes.${entry}`) }))}
                    onChange={setPurpose}
                    error={submitted ? errors.purpose : undefined}
                  />
                  <View>
                    <Text weight="semibold" className="mb-1 text-sm text-worker-ink">
                      {t('worker.coop.form.months')}
                    </Text>
                    <SegmentedTabs
                      tabs={LOAN_REPAYMENT_MONTHS.map((n) => ({
                        key: String(n),
                        label: t('worker.coop.form.monthsOption', { n }),
                      }))}
                      selected={months}
                      onSelect={setMonths}
                    />
                    {rupees >= min && rupees <= max ? (
                      <Text weight="semibold" className="mt-1 text-sm text-worker-success">
                        {t('worker.coop.form.instalment', {
                          amount: formatPaise(monthlyInstalment(rupees * 100, Number(months)), language),
                        })}
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : null}

              <FormField
                label={t('worker.coop.form.details')}
                placeholder={isLoan ? t('worker.coop.form.detailsLoanPlaceholder') : t('worker.coop.form.detailsClaimPlaceholder')}
                value={details}
                onChangeText={setDetails}
                multiline
                maxLength={300}
                textAlignVertical="top"
                style={{ minHeight: 88 }}
                error={submitted ? errors.details : undefined}
              />
            </>
          )}
        </View>
      </ScrollView>

      <ActionBar>
        {failure ? (
          <Text className="text-center text-sm text-worker-danger" accessibilityLiveRegion="polite">
            {t(`worker.coop.form.errors.${failure}`, { min: money(min), max: money(max) })}
          </Text>
        ) : null}
        {loanOpen ? (
          <PrimaryButton label={t('worker.coop.form.backToFund')} onPress={() => router.dismissTo('/coop')} />
        ) : (
          <PrimaryButton label={t('worker.coop.form.submit')} loading={busy} onPress={() => void submit()} />
        )}
      </ActionBar>
    </KeyboardAvoidingView>
  );
}
