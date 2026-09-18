import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { COOP_FUND_SHARE, GST_RATE, PLATFORM_SHARE } from '@sahayo/shared';
import {
  brandColors,
  FarePanel,
  FormField,
  formatPaise,
  FundHighlight,
  Text,
  type FareRow,
} from '@sahayo/ui-native';

import { calculateFare, DEMO_SURGE_ACTIVE, fareFromItemTotal } from '../../src/lib/fare';
import {
  PAYMENT_METHODS,
  paymentProvider,
  settlesImmediately,
  type PaymentMethod,
} from '../../src/lib/payment';
import {
  DEFAULT_CARD_ID,
  isPlausibleUpiId,
  savedCards,
  UPI_SUFFIX,
  walletBalancePaise,
} from '../../src/mocks/paymentMethods';
import { periodOf, twelveHour } from '../../src/lib/schedule';
import { payLiveBooking } from '../../src/services/live';
import { createBooking, settleBooking, useBookingView } from '../../src/store/bookings';
import { useAuthStore } from '../../src/store/auth';
import { useBookingDraftStore, useDraftedServiceItem } from '../../src/store/bookingDraft';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const METHOD_ICON: Record<PaymentMethod, IoniconName> = {
  upi: 'qr-code-outline',
  card: 'card-outline',
  wallet: 'wallet-outline',
  cash: 'cash-outline',
};

/** A percentage, for a label like "Platform fee (5%)". */
function percent(share: number): string {
  return String(Math.round(share * 100));
}

/** The selected/unselected dot. Local to this screen; nothing else uses it. */
function Radio({ selected }: { selected: boolean }) {
  return (
    <View
      className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
        selected ? 'border-brand-primary' : 'border-brand-border'
      }`}
    >
      {selected ? <View className="h-2.5 w-2.5 rounded-full bg-brand-primary" /> : null}
    </View>
  );
}

/**
 * Payment.
 *
 * The method list is inline under the order summary rather than a bottom
 * sheet, so the fare — and the fund line inside it — stays on screen while
 * the customer chooses how to pay. Four rows, one of which expands; the card
 * row is the only one that nests a second list.
 *
 * CASH DOES NOT GO THROUGH THE PROVIDER. It is a promise to pay on
 * completion, not a payment, so there is no processing delay, no transaction
 * id, and the booking is recorded as unpaid. Running it through a gateway,
 * even a fake one, would manufacture a settlement that did not happen.
 *
 * NO CARD DATA IS STORED OR TRANSMITTED. The three "add new card" fields are
 * component state and die with the screen. Nothing is passed to `pay` but an
 * amount, a method and a booking reference.
 */
export default function PaymentScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);
  const phone = useAuthStore((state) => state.phone);

  const item = useDraftedServiceItem();
  const intent = useBookingDraftStore((state) => state.intent);
  const scheduledFor = useBookingDraftStore((state) => state.scheduledFor);

  /**
   * Settling a bill that already exists, rather than checking out a new
   * booking. The tracker sends the customer here with `?bookingId=` once a
   * cash job is finished, so the same UI does both jobs and there is one
   * payment screen to maintain rather than two.
   */
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const settling = useBookingView(bookingId);

  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [upiId, setUpiId] = useState(`${phone.replace(/\D/g, '').slice(-10)}${UPI_SUFFIX}`);
  const [cardId, setCardId] = useState<string | null>(DEFAULT_CARD_ID);
  const [defaultCardId, setDefaultCardId] = useState<string>(DEFAULT_CARD_ID);
  const [newCard, setNewCard] = useState({ number: '', expiry: '', cvv: '' });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (!item && !settling) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream px-6">
        <Ionicons name="card-outline" size={32} color={brandColors.muted} />
        <Text className="mt-3 text-center text-base text-brand-muted">
          {t('booking.now.noDraft')}
        </Text>
        <Pressable
          className="mt-4 rounded-xl bg-brand-primary px-6 py-3"
          onPress={() => router.replace('/categories')}
          accessibilityRole="button"
          accessibilityLabel={t('categories.title')}
        >
          <Text weight="semibold" className="text-base text-white">
            {t('categories.title')}
          </Text>
        </Pressable>
      </View>
    );
  }

  // Surge belongs to the immediate booking only, matching the two screens
  // that lead here: `schedule.tsx` quotes the flat fare and so must this. A
  // bill being settled is not re-priced at all — it shows the split the
  // customer already agreed to.
  const fare = settling
    ? fareFromItemTotal(settling.fare?.total ?? 0)
    : calculateFare(item!, intent === 'now' && DEMO_SURGE_ACTIVE);
  const totalLabel = formatPaise(fare.total, locale);
  const subtitle = settling ? settling.serviceName : (item?.name ?? '');

  /**
   * Cash is not offered when settling. The customer is here precisely
   * because they chose to pay later; putting "pay later" back on the screen
   * would be a loop with no exit.
   */
  const methods = settling ? PAYMENT_METHODS.filter((entry) => entry !== 'cash') : PAYMENT_METHODS;

  const walletCovers = walletBalancePaise >= fare.total;
  const addingNewCard = cardId === null;
  const newCardReady =
    newCard.number.replace(/\s/g, '').length >= 12 &&
    newCard.expiry.length >= 4 &&
    newCard.cvv.length >= 3;

  function methodReady(): boolean {
    switch (method) {
      case 'upi':
        return isPlausibleUpiId(upiId);
      case 'card':
        return addingNewCard ? newCardReady : cardId !== null;
      case 'wallet':
        return walletCovers;
      case 'cash':
        return true;
    }
  }

  async function submit() {
    if (busy) return;
    setFailure(null);

    const reference = `${settling?.booking.id ?? item?.id ?? 'booking'}-${Date.now()}`;

    if (settling) {
      setBusy(true);
      const settled = await paymentProvider.pay({
        amountPaise: fare.total,
        method,
        reference,
      });
      setBusy(false);

      if (settled.status === 'FAILED') {
        setFailure(settled.reason);
        return;
      }

      // A server booking is paid through the server, which records it against the job.
      if (settling.live) {
        setBusy(true);
        const recorded = await payLiveBooking(settling.booking.id, method, settled.transactionId);
        setBusy(false);
        if (!recorded.ok) {
          setFailure(recorded.message);
          return;
        }
        router.replace(`/booking/success?bookingId=${settling.booking.id}`);
        return;
      }

      settleBooking(settling.booking.id, method, settled.transactionId);
      router.replace(`/booking/success?bookingId=${settling.booking.id}`);
      return;
    }

    if (!item) return;

    if (!settlesImmediately(method)) {
      const id = createBooking({
        serviceItemId: item.id,
        fare,
        method,
        paid: false,
        scheduledFor: scheduledFor ?? undefined,
      });
      router.replace(`/booking/success?bookingId=${id}`);
      return;
    }

    setBusy(true);
    const result = await paymentProvider.pay({
      amountPaise: fare.total,
      method,
      reference,
    });
    setBusy(false);

    if (result.status === 'FAILED') {
      setFailure(result.reason);
      return;
    }

    const id = createBooking({
      serviceItemId: item.id,
      fare,
      method,
      paid: true,
      transactionId: result.transactionId,
      scheduledFor: scheduledFor ?? undefined,
    });
    router.replace(`/booking/success?bookingId=${id}`);
  }

  const rows: FareRow[] = [
    { kind: 'amount', key: 'item', label: t('booking.now.itemPrice'), amount: fare.base },
    ...(fare.surge > 0
      ? ([
          {
            kind: 'amount',
            key: 'surge',
            label: t('booking.payment.surgeApplied'),
            amount: fare.surge,
          },
        ] as FareRow[])
      : []),
    { kind: 'divider', key: 'before-item-total' },
    { kind: 'amount', key: 'item-total', label: t('booking.now.itemTotal'), amount: fare.itemTotal },
    { kind: 'caption', key: 'included', label: t('booking.now.includedNote') },
    {
      kind: 'amount',
      key: 'worker',
      label: t('booking.now.workerEarns', {
        percent: percent(1 - PLATFORM_SHARE - COOP_FUND_SHARE),
      }),
      amount: fare.workerEarns,
      tone: 'muted',
      indented: true,
    },
    {
      kind: 'amount',
      key: 'platform',
      label: t('booking.now.platformFee', { percent: percent(PLATFORM_SHARE) }),
      amount: fare.platformFee,
      tone: 'muted',
      indented: true,
    },
    {
      kind: 'amount',
      key: 'fund',
      label: t('booking.now.coopFund', { percent: percent(COOP_FUND_SHARE) }),
      amount: fare.coopFund,
      tone: 'fund',
      indented: true,
      icon: <Ionicons name="people" size={14} color={brandColors.success} />,
    },
    { kind: 'divider', key: 'before-gst' },
    {
      kind: 'amount',
      key: 'gst',
      label: t('booking.now.gst', { percent: percent(GST_RATE) }),
      amount: fare.gst,
    },
  ];

  const scheduleLine = scheduledFor ? new Date(scheduledFor) : null;

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
        <View className="flex-row items-center">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/categories'))}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
            disabled={busy}
          >
            <Ionicons name="arrow-back" size={18} color={brandColors.navy} />
          </Pressable>

          <View className="ml-3 flex-1">
            <Text weight="bold" className="text-2xl text-brand-navy" numberOfLines={1}>
              {t('booking.payment.title')}
            </Text>
            <Text className="text-xs text-brand-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        {scheduleLine ? (
          <View className="mt-4 flex-row items-center rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
            <Ionicons name="calendar-outline" size={16} color={brandColors.primary} />
            <Text className="ml-2 flex-1 text-sm text-brand-navy">
              {t('booking.schedule.chosen', {
                day: t(`booking.schedule.weekdays.${scheduleLine.getDay()}`),
                date: scheduleLine.getDate(),
                month: t(`booking.schedule.months.${scheduleLine.getMonth()}`),
                time: t('booking.schedule.timeFormat', {
                  hour: twelveHour(scheduleLine.getHours()),
                  period: t(`booking.schedule.periods.${periodOf(scheduleLine.getHours())}`),
                }),
              })}
            </Text>
          </View>
        ) : null}

        <FarePanel
          className="mt-4"
          title={t('booking.payment.orderSummary')}
          rows={rows}
          totalLabel={t('booking.now.total')}
          totalAmount={fare.total}
          locale={locale}
        />

        <FundHighlight
          className="mt-4"
          amount={fare.coopFund}
          title={t('booking.now.fundStripTitle')}
          body={t('booking.now.fundStripBody')}
          locale={locale}
          icon={<Ionicons name="people" size={24} color={brandColors.surface} />}
        />

        {/* ----------------------------- methods ----------------------------- */}

        <Text weight="semibold" className="mt-6 text-base text-brand-navy">
          {t('booking.payment.selectMethod')}
        </Text>

        <View className="mt-3 overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
          {methods.map((entry, index) => {
            const active = entry === method;
            const disabled = entry === 'wallet' && !walletCovers;

            return (
              <View key={entry}>
                {index > 0 ? <View className="h-px bg-brand-border" /> : null}

                <Pressable
                  className="flex-row items-center px-4 py-3.5"
                  onPress={() => setMethod(entry)}
                  disabled={disabled || busy}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active, disabled }}
                  accessibilityLabel={t(`booking.payment.methods.${entry}`)}
                >
                  <Ionicons
                    name={METHOD_ICON[entry]}
                    size={20}
                    color={disabled ? brandColors.border : brandColors.navy}
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      weight="medium"
                      className={`text-sm ${disabled ? 'text-brand-muted' : 'text-brand-navy'}`}
                    >
                      {t(`booking.payment.methods.${entry}`)}
                    </Text>
                    {entry === 'wallet' ? (
                      <Text
                        className={`text-xs ${
                          walletCovers ? 'text-brand-muted' : 'text-brand-danger'
                        }`}
                      >
                        {walletCovers
                          ? t('booking.payment.walletBalance', {
                              amount: formatPaise(walletBalancePaise, locale),
                            })
                          : t('booking.payment.walletShort', {
                              amount: formatPaise(walletBalancePaise, locale),
                            })}
                      </Text>
                    ) : null}
                    {entry === 'cash' ? (
                      <Text className="text-xs text-brand-muted">
                        {t('booking.payment.cashNote')}
                      </Text>
                    ) : null}
                  </View>
                  <Radio selected={active} />
                </Pressable>

                {active && entry === 'upi' ? (
                  <View className="px-4 pb-4">
                    <FormField
                      label={t('booking.payment.upiLabel')}
                      value={upiId}
                      onChangeText={setUpiId}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!busy}
                      error={
                        upiId.length > 0 && !isPlausibleUpiId(upiId)
                          ? t('booking.payment.upiInvalid')
                          : undefined
                      }
                    />
                  </View>
                ) : null}

                {active && entry === 'card' ? (
                  <View className="px-4 pb-4">
                    {savedCards.map((card) => {
                      const chosen = cardId === card.id;
                      return (
                        <Pressable
                          key={card.id}
                          className={`mb-2 flex-row items-center rounded-xl border px-3 py-3 ${
                            chosen ? 'border-brand-primary bg-brand-primary-tint' : 'border-brand-border'
                          }`}
                          onPress={() => setCardId(card.id)}
                          disabled={busy}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: chosen }}
                          accessibilityLabel={`${card.brand} ${card.last4}`}
                        >
                          {/* Brand as text beside a neutral glyph — no
                              third-party logo ships with this app. */}
                          <Ionicons name="card" size={18} color={brandColors.navy} />
                          <View className="ml-3 flex-1">
                            <Text weight="medium" className="text-sm text-brand-navy">
                              {t('booking.payment.cardLabel', {
                                brand: card.brand,
                                last4: card.last4,
                              })}
                            </Text>
                            <Text className="text-xs text-brand-muted">
                              {t('booking.payment.cardExpires', { expires: card.expires })}
                            </Text>
                            {defaultCardId === card.id ? (
                              <Text weight="medium" className="mt-0.5 text-xs text-brand-primary">
                                {t('booking.payment.isDefault')}
                              </Text>
                            ) : (
                              <Pressable
                                onPress={() => setDefaultCardId(card.id)}
                                disabled={busy}
                                accessibilityRole="button"
                                accessibilityLabel={t('booking.payment.setDefault')}
                                hitSlop={6}
                              >
                                <Text weight="medium" className="mt-0.5 text-xs text-brand-primary">
                                  {t('booking.payment.setDefault')}
                                </Text>
                              </Pressable>
                            )}
                          </View>
                          <Radio selected={chosen} />
                        </Pressable>
                      );
                    })}

                    <Pressable
                      className={`flex-row items-center rounded-xl border px-3 py-3 ${
                        addingNewCard ? 'border-brand-primary bg-brand-primary-tint' : 'border-brand-border'
                      }`}
                      onPress={() => setCardId(null)}
                      disabled={busy}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: addingNewCard }}
                      accessibilityLabel={t('booking.payment.addCard')}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={brandColors.navy} />
                      <Text weight="medium" className="ml-3 flex-1 text-sm text-brand-navy">
                        {t('booking.payment.addCard')}
                      </Text>
                      <Radio selected={addingNewCard} />
                    </Pressable>

                    {addingNewCard ? (
                      <View className="mt-3">
                        <FormField
                          label={t('booking.payment.cardNumber')}
                          value={newCard.number}
                          onChangeText={(number) => setNewCard((c) => ({ ...c, number }))}
                          keyboardType="number-pad"
                          maxLength={19}
                          editable={!busy}
                        />
                        <View className="mt-3 flex-row">
                          <FormField
                            containerClassName="flex-1"
                            label={t('booking.payment.cardExpiry')}
                            value={newCard.expiry}
                            onChangeText={(expiry) => setNewCard((c) => ({ ...c, expiry }))}
                            keyboardType="number-pad"
                            maxLength={5}
                            editable={!busy}
                          />
                          <View className="w-3" />
                          <FormField
                            containerClassName="flex-1"
                            label={t('booking.payment.cardCvv')}
                            value={newCard.cvv}
                            onChangeText={(cvv) => setNewCard((c) => ({ ...c, cvv }))}
                            keyboardType="number-pad"
                            maxLength={4}
                            secureTextEntry
                            editable={!busy}
                          />
                        </View>
                        <Text className="mt-2 text-xs text-brand-muted">
                          {t('booking.payment.cardMockNote')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {failure ? (
          <View className="mt-4 flex-row items-center rounded-xl border border-brand-danger bg-brand-danger-soft px-4 py-3">
            <Ionicons name="alert-circle-outline" size={18} color={brandColors.danger} />
            <Text className="ml-2 flex-1 text-sm text-brand-danger">
              {/* A reason code from the payment provider, or the server's own sentence. */}
              {/\s/.test(failure)
                ? failure
                : t(`booking.payment.failure.${failure}`, {
                    defaultValue: t('booking.payment.failure.declined'),
                  })}
            </Text>
          </View>
        ) : null}

        <Pressable
          className={`mt-5 h-14 flex-row items-center justify-center rounded-xl ${
            methodReady() && !busy ? 'bg-brand-primary' : 'bg-brand-primary-soft'
          }`}
          disabled={!methodReady() || busy}
          onPress={submit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !methodReady() || busy, busy }}
          accessibilityLabel={
            method === 'cash'
              ? t('booking.payment.confirmCash')
              : t('booking.payment.pay', { amount: totalLabel })
          }
        >
          {busy ? (
            <ActivityIndicator color={brandColors.muted} />
          ) : (
            <Text
              weight="semibold"
              className={`text-base ${methodReady() ? 'text-white' : 'text-brand-muted'}`}
            >
              {method === 'cash'
                ? t('booking.payment.confirmCash')
                : t('booking.payment.pay', { amount: totalLabel })}
            </Text>
          )}
        </Pressable>

        <Text className="mt-3 text-center text-xs text-brand-muted">
          {t('booking.payment.mockNotice')}
        </Text>
      </View>
    </ScrollView>
  );
}
