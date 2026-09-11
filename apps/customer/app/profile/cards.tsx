import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, formatPaise, Text } from '@sahayo/ui-native';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { DEFAULT_CARD_ID, savedCards, walletBalancePaise } from '../../src/mocks/paymentMethods';
import { useAuthStore } from '../../src/store/auth';

/**
 * Saved cards, and the cooperative wallet.
 *
 * NO BRAND ARTWORK. The brand is text beside a neutral glyph — "Visa ••••
 * 8492" — for the same reason it is on the payment screen: shipping Visa or
 * Mastercard logos as app assets is distributing someone else's trademark,
 * where naming them is ordinary nominative use.
 *
 * These are not card numbers. `last4` is four digits of nothing and no full
 * number exists anywhere in the app.
 *
 * The default is session state, matching the payment screen's behaviour.
 * Phase 5 gives both screens the same server-side default; until then this
 * screen is honest about being a view over mock data rather than pretending
 * to a persistence it does not have.
 */
export default function ProfileCardsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useAuthStore((state) => state.language);

  const [defaultCardId, setDefaultCardId] = useState<string>(DEFAULT_CARD_ID);

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6">
        <ScreenHeader title={t('profile.cards')} fallback="/profile" />

        <View className="mt-5 overflow-hidden rounded-2xl bg-brand-success">
          <View className="flex-row items-center p-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <Ionicons name="wallet-outline" size={24} color={brandColors.surface} />
            </View>
            <View className="ml-3 flex-1">
              <Text weight="bold" className="text-2xl text-white">
                {formatPaise(walletBalancePaise, locale)}
              </Text>
              <Text weight="semibold" className="text-sm text-white">
                {t('booking.payment.methods.wallet')}
              </Text>
            </View>
          </View>
          <View className="bg-black/10 px-4 py-2.5">
            <Text className="text-xs text-white">{t('cards.walletNote')}</Text>
          </View>
        </View>

        <Text weight="semibold" className="mt-6 text-sm text-brand-muted">
          {t('cards.savedCards')}
        </Text>

        {savedCards.length === 0 ? (
          <View className="mt-2 items-center rounded-2xl border border-brand-border bg-brand-surface px-6 py-10">
            <Ionicons name="card-outline" size={28} color={brandColors.muted} />
            <Text weight="semibold" className="mt-3 text-center text-base text-brand-navy">
              {t('cards.emptyTitle')}
            </Text>
            <Text className="mt-1 text-center text-sm text-brand-muted">
              {t('cards.emptyBody')}
            </Text>
          </View>
        ) : null}

        <View className="mt-2">
          {savedCards.map((card) => {
            const isDefault = defaultCardId === card.id;

            return (
              <View
                key={card.id}
                className={`mb-3 flex-row items-center rounded-2xl border bg-brand-surface p-4 ${
                  isDefault ? 'border-brand-primary' : 'border-brand-border'
                }`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-primary-tint">
                  <Ionicons name="card" size={20} color={brandColors.primary} />
                </View>

                <View className="ml-3 flex-1">
                  <Text weight="semibold" className="text-sm text-brand-navy">
                    {t('booking.payment.cardLabel', { brand: card.brand, last4: card.last4 })}
                  </Text>
                  <Text className="text-xs text-brand-muted">
                    {t('booking.payment.cardExpires', { expires: card.expires })}
                  </Text>
                </View>

                {isDefault ? (
                  <View className="rounded-full bg-brand-primary-tint px-3 py-1.5">
                    <Text weight="medium" className="text-xs text-brand-primary">
                      {t('booking.payment.isDefault')}
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    className="rounded-full border border-brand-primary px-3 py-1.5"
                    onPress={() => setDefaultCardId(card.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('booking.payment.setDefault')}
                  >
                    <Text weight="medium" className="text-xs text-brand-primary">
                      {t('booking.payment.setDefault')}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        <View className="flex-row items-start rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
          <Ionicons name="information-circle-outline" size={16} color={brandColors.muted} />
          <Text className="ml-2 flex-1 text-xs text-brand-muted">{t('cards.addNote')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
